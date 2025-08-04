import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Map, NavigationControl, ScaleControl, FullscreenControl } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Tooltip,
  ActionIcon,
  Switch,
  Select,
  Slider
} from '@mantine/core';
import {
  IconMapPins,
  IconMap2,
  IconRefresh,
  IconSettings,
  IconZoomIn,
  IconZoomOut
} from '@tabler/icons-react';
import type { Project } from '../../types/project';
import { 
  transformToLatLng, 
  transformFromLatLng,
  calculateMapBounds, 
  type CoordinatePoint as TransformCoordinatePoint,
  type LatLng 
} from '../../utils/coordinateTransform';

// MapLibre GL CSS
import 'maplibre-gl/dist/maplibre-gl.css';

// Global CSS for range slider
const sliderStyles = `
  .zoom-range-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4c6ef5;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: pointer;
    transform: rotate(90deg);
  }
  
  .zoom-range-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #4c6ef5;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    cursor: pointer;
    border: none;
  }
  
  .zoom-range-slider::-webkit-slider-track {
    background: #e9ecef;
    height: 4px;
    border-radius: 2px;
  }
  
  .zoom-range-slider::-moz-range-track {
    background: #e9ecef;
    height: 4px;
    border-radius: 2px;
    border: none;
  }
`;

interface CoordinatePoint {
  id: string;
  pointName: string;
  x: number;
  y: number;
  z: number;
  type: 'benchmark' | 'control_point' | 'boundary_point';
  visible: boolean;
}

interface LotData {
  id: string;
  lotNumber: string;
  landCategory: string;
  area: number;
  coordinates: string[];
  visible: boolean;
}

interface MapLibreViewerProps {
  project?: Project;
  coordinates?: CoordinatePoint[];
  lots?: LotData[];
  hoveredCoordinate?: string | null;
  hoveredLot?: string | null;
  onCoordinateClick?: (coordinate: CoordinatePoint) => void;
  onLotClick?: (lot: LotData) => void;
  onAddCoordinate?: (coordinate: { x: number; y: number; lat: number; lng: number }) => void;
}

export const MapLibreViewer: React.FC<MapLibreViewerProps> = ({
  project,
  coordinates = [],
  lots = [],
  hoveredCoordinate,
  hoveredLot,
  onCoordinateClick,
  onLotClick,
  onAddCoordinate
}) => {
  console.log('MapLibreViewer props:', { 
    project: project?.name, 
    coordinatesCount: coordinates.length, 
    lotsCount: lots.length,
    coordinates: coordinates.slice(0, 3) // 最初の3件のみ表示
  });
  const mapRef = useRef<maplibregl.Map>();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showCoordinateLabels, setShowCoordinateLabels] = useState(true);
  const [showLots, setShowLots] = useState(true);
  const [showLotLabels, setShowLotLabels] = useState(true);
  const [selectedCoordinate, setSelectedCoordinate] = useState<CoordinatePoint | null>(null);
  const [zoneNumber, setZoneNumber] = useState(13); // デフォルト: 北海道東部
  const [baseMapType, setBaseMapType] = useState('std'); // 地理院地図標準
  const [currentZoom, setCurrentZoom] = useState(15);
  const [sliderZoom, setSliderZoom] = useState(15);
  
  // 地理院地図のスタイル定義
  const GSI_TILE_SOURCES = {
    std: {
      name: '標準地図',
      url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    },
    pale: {
      name: '淡色地図',
      url: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    },
    blank: {
      name: '白地図',
      url: 'https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png',
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    },
    photo: {
      name: '航空写真',
      url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
    }
  };

  // 地図スタイルの生成
  const mapStyle = useMemo(() => {
    const source = GSI_TILE_SOURCES[baseMapType as keyof typeof GSI_TILE_SOURCES];
    return {
      version: 8,
      // ラベル表示のためのフォント設定を追加
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        'gsi-tiles': {
          type: 'raster' as const,
          tiles: [source.url],
          tileSize: 256,
          attribution: source.attribution
        }
      },
      layers: [
        {
          id: 'gsi-layer',
          type: 'raster' as const,
          source: 'gsi-tiles'
        }
      ]
    };
  }, [baseMapType]);

  // 座標変換とマップ中心の計算
  const { mapCenter, mapZoom, transformedCoordinates, transformedLots } = useMemo(() => {
    console.log('Processing coordinates:', coordinates);
    const validCoords = coordinates.filter(c => {
      const isValid = c.visible && 
        typeof c.x === 'number' && typeof c.y === 'number' && 
        !isNaN(c.x) && !isNaN(c.y) &&
        Math.abs(c.x) < 100000 && Math.abs(c.y) < 100000; // より適切な範囲チェック
      
      console.log(`Coordinate ${c.id} (${c.pointName}): x=${c.x}, y=${c.y}, valid=${isValid}`);
      return isValid;
    });

    if (validCoords.length === 0) {
      console.log('No valid coordinates found, using default center');
      return {
        mapCenter: { lat: 43.0642, lng: 144.2737 } as LatLng, // 釧路市周辺
        mapZoom: 15,
        transformedCoordinates: [],
        transformedLots: []
      };
    }

    // 測量座標を緯度経度に変換
    const transformed = validCoords.map(coord => {
      const latLng = transformToLatLng({ x: coord.x, y: coord.y }, zoneNumber);
      console.log(`Transformed coordinate ${coord.id}: x=${coord.x}, y=${coord.y} -> lat=${latLng.lat}, lng=${latLng.lng}`);
      return {
        ...coord,
        lat: latLng.lat,
        lng: latLng.lng
      };
    });

    // 地番データの座標変換
    console.log('Starting lot transformation. Lots:', lots);
    console.log('Valid coordinates:', validCoords);
    
    const transformedLotData = (lots || []).filter(l => l.visible).map(lot => {
      console.log('Processing lot:', lot);
      console.log('Available coordinate IDs:', validCoords.map(c => c.id));
      
      const lotCoords = lot.coordinates
        .map(coordId => {
          const found = validCoords.find(c => c.id === coordId);
          console.log(`Looking for coord ID ${coordId}, found:`, found ? `${found.pointName} (x=${found.x}, y=${found.y})` : 'NOT FOUND');
          return found;
        })
        .filter(c => c !== undefined);
      
      console.log(`Lot ${lot.lotNumber} coordinates found (${lotCoords.length}/${lot.coordinates.length}):`, lotCoords.map(c => c?.pointName));
      
      if (lotCoords.length < 3) {
        console.log(`Lot ${lot.id} skipped - insufficient coordinates (${lotCoords.length})`);
        return null;
      }
      
      const lotLatLngs = lotCoords.map(coord => 
        transformToLatLng({ x: coord.x, y: coord.y }, zoneNumber)
      );
      
      console.log('Transformed coordinates:', lotLatLngs);
      
      return {
        ...lot,
        coordinates: lotLatLngs
      };
    }).filter(lot => lot !== null);
    
    console.log('Final transformed lots:', transformedLotData);

    // マップの中心とズームを計算
    const bounds = calculateMapBounds(
      validCoords.map(c => ({ x: c.x, y: c.y })), 
      zoneNumber
    );

    return {
      mapCenter: bounds.center,
      mapZoom: bounds.zoom,
      transformedCoordinates: transformed,
      transformedLots: transformedLotData
    };
  }, [coordinates, lots, zoneNumber]);


  // マップロード時の処理
  const handleMapLoad = (map: maplibregl.Map) => {
    console.log('Map loaded, adding data sources');
    mapRef.current = map;
    setMapLoaded(true);
    
    // エラーハンドリング
    map.on('error', (e) => {
      console.error('MapLibre error:', e);
    });
    
    // 座標点と地番のデータソースを追加
    try {
      addCoordinateDataSources(map);
      addLotDataSources(map);
    } catch (error) {
      console.error('Error adding data sources:', error);
    }
    
    // ズーム変更を監視
    map.on('zoom', () => {
      setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
    });
    
    // 地図の空白部分をクリックで選択解除
    map.on('click', (e) => {
      // 座標点やその他の要素がクリックされていない場合のみ選択を解除
      const features = map.queryRenderedFeatures(e.point);
      const hasCoordinateFeature = features.some(f => f.layer.id === 'coordinate-points');
      
      if (!hasCoordinateFeature) {
        setSelectedCoordinate(null);
      }
    });

    // ダブルクリックで新点追加
    map.on('dblclick', (e) => {
      if (onAddCoordinate) {
        const { lng, lat } = e.lngLat;
        console.log(`Double-clicked at lat: ${lat}, lng: ${lng}`);
        
        // 緯度経度を測量座標に変換
        const surveyCoord = transformFromLatLng({ lat, lng }, zoneNumber);
        console.log(`Converted to survey coordinates: x=${surveyCoord.x}, y=${surveyCoord.y}`);
        
        // コールバック関数を呼び出し
        onAddCoordinate({
          x: Math.round(surveyCoord.x * 1000) / 1000, // mm精度に丸める
          y: Math.round(surveyCoord.y * 1000) / 1000,
          lat,
          lng
        });
      }
    });
    
    // 初期ズームレベルを設定
    setCurrentZoom(Math.round(map.getZoom() * 10) / 10);
  };

  // 座標点データソースの追加
  const addCoordinateDataSources = (map: maplibregl.Map) => {
    console.log('addCoordinateDataSources called with transformedCoordinates:', transformedCoordinates);
    
    // 座標点のGeoJSONを生成
    const coordinateFeatures = transformedCoordinates.map(coord => {
      const feature = {
        type: 'Feature' as const,
        properties: {
          id: coord.id,
          pointName: coord.pointName,
          type: coord.type,
          x: coord.x,
          y: coord.y,
          z: coord.z
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [coord.lng, coord.lat]
        }
      };
      console.log(`Creating feature for ${coord.pointName}:`, feature);
      return feature;
    });
    
    console.log('Generated coordinateFeatures:', coordinateFeatures);

    // 座標点データソースを追加
    if (!map.getSource('coordinates')) {
      map.addSource('coordinates', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: coordinateFeatures
        }
      });

      // 座標点のレイヤーを追加
      map.addLayer({
        id: 'coordinate-points',
        type: 'circle',
        source: 'coordinates',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'type'], 'benchmark'], 8,
            ['==', ['get', 'type'], 'control_point'], 7,
            6
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'type'], 'benchmark'], '#228be6',
            ['==', ['get', 'type'], 'control_point'], '#40c057',
            '#fd7e14'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 選択された座標点のハイライトレイヤーを追加
      map.addLayer({
        id: 'selected-coordinate',
        type: 'circle',
        source: 'coordinates',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'type'], 'benchmark'], 12,
            ['==', ['get', 'type'], 'control_point'], 11,
            10
          ],
          'circle-color': 'transparent',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ff6b6b',
          'circle-opacity': 0
        },
        filter: ['==', ['get', 'id'], ''] // 初期状態では何も表示しない
      });

      // 座標点ラベルのレイヤーを追加
      map.addLayer({
        id: 'coordinate-labels',
        type: 'symbol',
        source: 'coordinates',
        layout: {
          'text-field': ['get', 'pointName'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-offset': [0, -2.5],
          'text-anchor': 'bottom',
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 10,
            15, 12,
            20, 16
          ],
          'text-allow-overlap': true,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#2c3e50',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-opacity': 1
        }
      });

      // クリックイベントを追加
      map.on('click', 'coordinate-points', (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const coord = coordinates.find(c => c.id === feature.properties?.id);
          if (coord) {
            setSelectedCoordinate(coord);
            if (onCoordinateClick) {
              onCoordinateClick(coord);
            }
          }
        }
      });

      // ホバーカーソルを設定
      map.on('mouseenter', 'coordinate-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'coordinate-points', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  };

  // 地番データソースの追加
  const addLotDataSources = (map: maplibregl.Map) => {
    console.log('addLotDataSources called with transformedLots:', transformedLots);
    
    // 地番のGeoJSONを生成
    const lotFeatures = transformedLots.map(lot => ({
      type: 'Feature' as const,
      properties: {
        id: lot.id,
        lotNumber: lot.lotNumber,
        landCategory: lot.landCategory,
        area: lot.area
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [lot.coordinates.map(coord => [coord.lng, coord.lat])]
      }
    }));

    console.log('Generated lotFeatures:', lotFeatures);

    // 地番データソースを追加
    if (!map.getSource('lots')) {
      map.addSource('lots', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lotFeatures
        }
      });

      // 地番ポリゴンのレイヤーを追加（塗りつぶし）
      map.addLayer({
        id: 'lot-fills',
        type: 'fill',
        source: 'lots',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'landCategory'], '宅地'], '#2196f3',
            ['==', ['get', 'landCategory'], '田'], '#4caf50',
            ['==', ['get', 'landCategory'], '畑'], '#ff9800',
            ['==', ['get', 'landCategory'], '山林'], '#00796b',
            ['==', ['get', 'landCategory'], '雑種地'], '#9e9e9e',
            '#607d8b'
          ],
          'fill-opacity': 0.6
        }
      });

      // 地番ポリゴンの境界線レイヤーを追加
      map.addLayer({
        id: 'lot-outlines',
        type: 'line',
        source: 'lots',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'landCategory'], '宅地'], '#1976d2',
            ['==', ['get', 'landCategory'], '田'], '#388e3c',
            ['==', ['get', 'landCategory'], '畑'], '#f57c00',
            ['==', ['get', 'landCategory'], '山林'], '#00695c',
            ['==', ['get', 'landCategory'], '雑種地'], '#757575',
            '#455a64'
          ],
          'line-width': 2
        }
      });

      // 地番ラベルのレイヤーを追加
      map.addLayer({
        id: 'lot-labels',
        type: 'symbol',
        source: 'lots',
        layout: {
          'text-field': [
            'format',
            ['get', 'lotNumber'], { 'font-scale': 1.2 },
            '\n',
            ['get', 'landCategory'], { 'font-scale': 0.8 }
          ],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 10,
            15, 14,
            20, 18
          ],
          'text-anchor': 'center',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'symbol-placement': 'point'
        },
        paint: {
          'text-color': '#1a365d',
          'text-halo-color': '#ffffff',
          'text-halo-width': 3,
          'text-opacity': 1
        }
      });

      // 地番クリックイベントを追加
      map.on('click', 'lot-fills', (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const lot = lots.find(l => l.id === feature.properties?.id);
          if (lot && onLotClick) {
            onLotClick(lot);
          }
        }
      });

      // ホバーカーソルを設定
      map.on('mouseenter', 'lot-fills', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'lot-fills', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  };

  // 座標点データの更新
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const source = map.getSource('coordinates') as maplibregl.GeoJSONSource;
      
      if (source) {
        const coordinateFeatures = transformedCoordinates.map(coord => ({
          type: 'Feature' as const,
          properties: {
            id: coord.id,
            pointName: coord.pointName,
            type: coord.type,
            x: coord.x,
            y: coord.y,
            z: coord.z
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [coord.lng, coord.lat]
          }
        }));

        source.setData({
          type: 'FeatureCollection',
          features: coordinateFeatures
        });
      }

      // 地番データの更新
      const lotSource = map.getSource('lots') as maplibregl.GeoJSONSource;
      if (lotSource) {
        const lotFeatures = transformedLots.map(lot => ({
          type: 'Feature' as const,
          properties: {
            id: lot.id,
            lotNumber: lot.lotNumber,
            landCategory: lot.landCategory,
            area: lot.area
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [lot.coordinates.map(coord => [coord.lng, coord.lat])]
          }
        }));

        lotSource.setData({
          type: 'FeatureCollection',
          features: lotFeatures
        });
      }
    }
  }, [transformedCoordinates, transformedLots, mapLoaded]);

  // 座標点表示切り替え
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const visibility = showCoordinates ? 'visible' : 'none';
      
      console.log(`Setting coordinate-points visibility to: ${visibility}`);
      
      if (map.getLayer('coordinate-points')) {
        map.setLayoutProperty('coordinate-points', 'visibility', visibility);
      }
    }
  }, [showCoordinates, mapLoaded]);

  // 座標点名ラベル表示切り替え
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const visibility = (showCoordinates && showCoordinateLabels) ? 'visible' : 'none';
      
      console.log(`Setting coordinate-labels visibility to: ${visibility}`);
      
      if (map.getLayer('coordinate-labels')) {
        map.setLayoutProperty('coordinate-labels', 'visibility', visibility);
      }
    }
  }, [showCoordinates, showCoordinateLabels, mapLoaded]);

  // 地番レイヤー表示切り替え
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const visibility = showLots ? 'visible' : 'none';
      
      if (map.getLayer('lot-fills')) {
        map.setLayoutProperty('lot-fills', 'visibility', visibility);
      }
      if (map.getLayer('lot-outlines')) {
        map.setLayoutProperty('lot-outlines', 'visibility', visibility);
      }
    }
  }, [showLots, mapLoaded]);

  // 地番ラベル表示切り替え
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const visibility = (showLots && showLotLabels) ? 'visible' : 'none';
      
      console.log(`Setting lot-labels visibility to: ${visibility}`);
      
      if (map.getLayer('lot-labels')) {
        map.setLayoutProperty('lot-labels', 'visibility', visibility);
      }
    }
  }, [showLots, showLotLabels, mapLoaded]);

  // 選択された座標点のハイライト更新
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      
      if (map.getLayer('selected-coordinate')) {
        if (selectedCoordinate) {
          console.log(`Highlighting coordinate: ${selectedCoordinate.pointName} (ID: ${selectedCoordinate.id})`);
          map.setFilter('selected-coordinate', ['==', ['get', 'id'], selectedCoordinate.id]);
          // ハイライトを表示
          map.setPaintProperty('selected-coordinate', 'circle-opacity', 1);
        } else {
          // ハイライトを非表示
          map.setFilter('selected-coordinate', ['==', ['get', 'id'], '']);
          map.setPaintProperty('selected-coordinate', 'circle-opacity', 0);
        }
      }
    }
  }, [selectedCoordinate, mapLoaded]);

  // 地図をリセット
  const handleResetView = () => {
    if (mapRef.current && transformedCoordinates.length > 0) {
      mapRef.current.easeTo({
        center: [mapCenter.lng, mapCenter.lat],
        zoom: mapZoom,
        duration: 1000
      });
    }
  };

  // ズームイン
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn({ duration: 300 });
    }
  };

  // ズームアウト
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut({ duration: 300 });
    }
  };

  // スライドバーでのズーム変更
  const handleZoomChange = (value: number) => {
    if (mapRef.current) {
      mapRef.current.zoomTo(value, { duration: 200 });
      setCurrentZoom(value);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <Paper 
        shadow="lg" 
        withBorder 
        style={{ 
          width: '33.333vw',
          height: '100vh',
          position: 'fixed',
          right: 0,
          top: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderLeft: '3px solid #4c6ef5',
          overflow: 'hidden'
        }}
      >
      {/* ヘッダー */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #dee2e6',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(10px)'
      }}>
        <Group justify="space-between" mb="sm">
          <Title order={3} style={{ color: '#2c3e50', fontWeight: 600 }}>
            地理院地図ビューワー
          </Title>
          <Group>
            <Group gap="xs">
              <Text size="xs" style={{ color: '#6c757d', minWidth: '50px' }}>
                Z: {currentZoom}
              </Text>
              <Tooltip label="ズームアウト">
                <ActionIcon 
                  variant="light" 
                  color="gray"
                  size="sm"
                  onClick={handleZoomOut}
                >
                  <IconZoomOut size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="ズームイン">
                <ActionIcon 
                  variant="light" 
                  color="gray"
                  size="sm"
                  onClick={handleZoomIn}
                >
                  <IconZoomIn size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Tooltip label="表示設定">
              <ActionIcon 
                variant="light" 
                color="blue"
                size="sm"
              >
                <IconSettings size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="リセット">
              <ActionIcon 
                variant="light" 
                color="blue"
                size="sm"
                onClick={handleResetView}
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        {project && (
          <Text size="sm" style={{ color: '#6c757d' }}>
            {project.name}
          </Text>
        )}
        
        {/* データ統計情報 */}
        <Paper
          p="sm"
          mt="sm"
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px'
          }}
        >
          <Text size="sm" fw={500} style={{ color: '#495057' }}>
            📍 座標点: {transformedCoordinates.length}/{coordinates.filter(c => c.visible).length}点 | 
            🗺️ 地番: {transformedLots.length}/{lots.filter(l => l.visible).length}件 | 
            📐 {zoneNumber}系（{zoneNumber === 13 ? '北海道東部' : `系番号${zoneNumber}`}）
          </Text>
        </Paper>
      </div>

      {/* 地図コントロール */}
      <div style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.8)', borderBottom: '1px solid #dee2e6' }}>
        <Stack gap="xs">
          <Group justify="space-between">
            <Switch
              label="座標点"
              checked={showCoordinates}
              onChange={(event) => setShowCoordinates(event.currentTarget.checked)}
              size="sm"
              color="blue"
              styles={{
                label: { color: '#495057', fontSize: '12px' }
              }}
            />
            <Switch
              label="点名"
              checked={showCoordinateLabels}
              onChange={(event) => setShowCoordinateLabels(event.currentTarget.checked)}
              size="sm"
              color="cyan"
              disabled={!showCoordinates}
              styles={{
                label: { color: showCoordinates ? '#495057' : '#adb5bd', fontSize: '12px' }
              }}
            />
            <Switch
              label="地番"
              checked={showLots}
              onChange={(event) => setShowLots(event.currentTarget.checked)}
              size="sm"
              color="orange"
              styles={{
                label: { color: '#495057', fontSize: '12px' }
              }}
            />
            <Switch
              label="地番名"
              checked={showLotLabels}
              onChange={(event) => setShowLotLabels(event.currentTarget.checked)}
              size="sm"
              color="teal"
              disabled={!showLots}
              styles={{
                label: { color: showLots ? '#495057' : '#adb5bd', fontSize: '12px' }
              }}
            />
          </Group>
          <Group>
            <Select
              value={baseMapType}
              onChange={(value) => setBaseMapType(value || 'std')}
              data={[
                { value: 'std', label: '標準地図' },
                { value: 'pale', label: '淡色地図' },
                { value: 'blank', label: '白地図' },
                { value: 'photo', label: '航空写真' }
              ]}
              size="xs"
              style={{ flex: 1 }}
              styles={{
                input: { 
                  backgroundColor: '#ffffff',
                  fontSize: '11px',
                  border: '1px solid #ced4da'
                }
              }}
            />
            <Select
              value={zoneNumber.toString()}
              onChange={(value) => setZoneNumber(parseInt(value || '13'))}
              data={Array.from({length: 19}, (_, i) => ({
                value: (i + 1).toString(),
                label: `系番号${i + 1}`
              }))}
              size="xs"
              style={{ width: '90px' }}
              styles={{
                input: { 
                  backgroundColor: '#ffffff',
                  fontSize: '11px',
                  border: '1px solid #ced4da'
                }
              }}
            />
          </Group>
        </Stack>
      </div>

      {/* 地図表示エリア */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          initialViewState={{
            longitude: mapCenter.lng,
            latitude: mapCenter.lat,
            zoom: mapZoom
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          onLoad={({ target }) => handleMapLoad(target)}
          attributionControl={true}
        >
          <NavigationControl position="top-left" />
          <ScaleControl position="bottom-left" />
          <FullscreenControl position="top-right" />
        </Map>

        {/* ズームスライドバー（方位マークの下） */}
        <div
          style={{
            position: 'absolute',
            top: '120px',
            left: '12px',
            zIndex: 1001,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '6px',
            padding: '12px 3px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.1)',
            width: '28px',
            pointerEvents: 'all'
          }}
        >
          <Stack gap="sm" align="center">
            <Text size="xs" fw={600} style={{ color: '#495057', writingMode: 'vertical-rl' }}>
              ズーム
            </Text>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center' }}>
              <input
                type="range"
                min={5}
                max={20}
                step={0.5}
                value={currentZoom}
                onChange={(e) => {
                  e.stopPropagation();
                  handleZoomChange(parseFloat(e.target.value));
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                style={{
                  width: '100px',
                  height: '4px',
                  background: '#e9ecef',
                  outline: 'none',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  borderRadius: '2px'
                }}
                className="zoom-range-slider"
              />
            </div>
            <Text size="xs" fw={500} style={{ color: '#6c757d' }}>
              {currentZoom.toFixed(1)}
            </Text>
          </Stack>
        </div>
      </div>

      {/* 選択された座標点の詳細情報 */}
      {selectedCoordinate && (
        <Paper 
          withBorder 
          p="md" 
          style={{ 
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            margin: '10px',
            marginBottom: '10px',
            flexShrink: 0,
            border: '2px solid #4c6ef5'
          }}
        >
          <Group justify="space-between" align="flex-start" mb="sm">
            <Text fw={700} size="sm" style={{ color: '#2c3e50' }}>
              📍 選択された座標点
            </Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setSelectedCoordinate(null)}
              style={{ padding: '2px 6px' }}
            >
              ×
            </Button>
          </Group>
          
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={500} style={{ color: '#495057' }}>点名:</Text>
              <Text size="xs" fw={600} style={{ color: '#2c3e50' }}>{selectedCoordinate.pointName}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" fw={500} style={{ color: '#495057' }}>種別:</Text>
              <Text size="xs" style={{ 
                color: selectedCoordinate.type === 'benchmark' ? '#228be6' : 
                       selectedCoordinate.type === 'control_point' ? '#40c057' : '#fd7e14'
              }}>
                {selectedCoordinate.type === 'benchmark' ? '基準点' : 
                 selectedCoordinate.type === 'control_point' ? '制御点' : '境界点'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" fw={500} style={{ color: '#495057' }}>X座標:</Text>
              <Text size="xs" style={{ fontFamily: 'monospace', color: '#2c3e50' }}>
                {selectedCoordinate.x.toFixed(3)} m
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" fw={500} style={{ color: '#495057' }}>Y座標:</Text>
              <Text size="xs" style={{ fontFamily: 'monospace', color: '#2c3e50' }}>
                {selectedCoordinate.y.toFixed(3)} m
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="xs" fw={500} style={{ color: '#495057' }}>標高:</Text>
              <Text size="xs" style={{ fontFamily: 'monospace', color: '#2c3e50' }}>
                {selectedCoordinate.z.toFixed(3)} m
              </Text>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* 凡例 */}
      <Paper 
        withBorder 
        p="sm" 
        style={{ 
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px 12px 0 0',
          margin: '10px',
          marginBottom: 0,
          flexShrink: 0
        }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" fw={700} mb="xs" style={{ color: '#2c3e50' }}>座標点</Text>
            <Stack gap={4}>
              <Group gap="sm" align="center">
                <div style={{ 
                  width: 12, height: 12, borderRadius: '50%', 
                  backgroundColor: '#228be6', border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
                <Text size="xs" fw={500}>基準点</Text>
              </Group>
              <Group gap="sm" align="center">
                <div style={{ 
                  width: 12, height: 12, borderRadius: '50%', 
                  backgroundColor: '#40c057', border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
                <Text size="xs" fw={500}>制御点</Text>
              </Group>
              <Group gap="sm" align="center">
                <div style={{ 
                  width: 12, height: 12, borderRadius: '50%', 
                  backgroundColor: '#fd7e14', border: '2px solid white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
                <Text size="xs" fw={500}>境界点</Text>
              </Group>
            </Stack>
          </div>
          <div>
            <Text size="xs" fw={700} mb="xs" style={{ color: '#2c3e50' }}>地図種別</Text>
            <Text size="xs" style={{ color: '#6c757d' }}>
              {GSI_TILE_SOURCES[baseMapType as keyof typeof GSI_TILE_SOURCES].name}
            </Text>
          </div>
        </Group>
      </Paper>
    </Paper>
    </>
  );
};