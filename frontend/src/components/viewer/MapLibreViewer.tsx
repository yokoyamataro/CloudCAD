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
  Select
} from '@mantine/core';
import {
  IconMapPins,
  IconMap2,
  IconRefresh,
  IconSettings
} from '@tabler/icons-react';
import type { Project } from '../../types/project';
import { 
  transformToLatLng, 
  calculateMapBounds, 
  type CoordinatePoint as TransformCoordinatePoint,
  type LatLng 
} from '../../utils/coordinateTransform';

// MapLibre GL CSS
import 'maplibre-gl/dist/maplibre-gl.css';

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
}

export const MapLibreViewer: React.FC<MapLibreViewerProps> = ({
  project,
  coordinates = [],
  lots = [],
  hoveredCoordinate,
  hoveredLot,
  onCoordinateClick,
  onLotClick
}) => {
  const mapRef = useRef<maplibregl.Map>();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [showLots, setShowLots] = useState(true);
  const [zoneNumber, setZoneNumber] = useState(13); // デフォルト: 北海道東部
  const [baseMapType, setBaseMapType] = useState('std'); // 地理院地図標準
  
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
    const validCoords = coordinates.filter(c => c.visible && 
      typeof c.x === 'number' && typeof c.y === 'number' && 
      !isNaN(c.x) && !isNaN(c.y) &&
      c.x !== 1000 && c.y !== 1000
    );

    if (validCoords.length === 0) {
      return {
        mapCenter: { lat: 35.6812, lng: 139.7671 } as LatLng,
        mapZoom: 15,
        transformedCoordinates: []
      };
    }

    // 測量座標を緯度経度に変換
    const transformed = validCoords.map(coord => {
      const latLng = transformToLatLng({ x: coord.x, y: coord.y }, zoneNumber);
      return {
        ...coord,
        lat: latLng.lat,
        lng: latLng.lng
      };
    });

    // 地番データの座標変換
    const transformedLotData = lots.filter(l => l.visible).map(lot => {
      const lotCoords = lot.coordinates
        .map(coordId => validCoords.find(c => c.id === coordId))
        .filter(c => c !== undefined);
      
      if (lotCoords.length < 3) return null;
      
      const lotLatLngs = lotCoords.map(coord => 
        transformToLatLng({ x: coord.x, y: coord.y }, zoneNumber)
      );
      
      return {
        ...lot,
        coordinates: lotLatLngs
      };
    }).filter(lot => lot !== null);

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
  }, [coordinates, zoneNumber]);

  // マップロード時の処理
  const handleMapLoad = (map: maplibregl.Map) => {
    mapRef.current = map;
    setMapLoaded(true);
    
    // 座標点と地番のデータソースを追加
    addCoordinateDataSources(map);
    addLotDataSources(map);
  };

  // 座標点データソースの追加
  const addCoordinateDataSources = (map: maplibregl.Map) => {
    // 座標点のGeoJSONを生成
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

      // 座標点ラベルのレイヤーを追加
      map.addLayer({
        id: 'coordinate-labels',
        type: 'symbol',
        source: 'coordinates',
        layout: {
          'text-field': ['get', 'pointName'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-offset': [0, -2],
          'text-anchor': 'bottom',
          'text-size': 12
        },
        paint: {
          'text-color': '#2c3e50',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });

      // クリックイベントを追加
      map.on('click', 'coordinate-points', (e) => {
        if (e.features && e.features[0]) {
          const feature = e.features[0];
          const coord = coordinates.find(c => c.id === feature.properties?.id);
          if (coord && onCoordinateClick) {
            onCoordinateClick(coord);
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
          'text-field': ['get', 'lotNumber'],
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': 14,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#2c3e50',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
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

  // レイヤー表示切り替え
  useEffect(() => {
    if (mapLoaded && mapRef.current) {
      const map = mapRef.current;
      const visibility = showCoordinates ? 'visible' : 'none';
      
      if (map.getLayer('coordinate-points')) {
        map.setLayoutProperty('coordinate-points', 'visibility', visibility);
      }
      if (map.getLayer('coordinate-labels')) {
        map.setLayoutProperty('coordinate-labels', 'visibility', visibility);
      }
    }
  }, [showCoordinates, mapLoaded]);

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
      if (map.getLayer('lot-labels')) {
        map.setLayoutProperty('lot-labels', 'visibility', visibility);
      }
    }
  }, [showLots, mapLoaded]);

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

  return (
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
            📍 座標点: {coordinates.filter(c => c.visible).length}点 | 
            🗺️ 地番: {lots.filter(l => l.visible).length}件 | 
            📐 13系（北海道東部）
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
              label="地番"
              checked={showLots}
              onChange={(event) => setShowLots(event.currentTarget.checked)}
              size="sm"
              color="orange"
              styles={{
                label: { color: '#495057', fontSize: '12px' }
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
      </div>

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
  );
};