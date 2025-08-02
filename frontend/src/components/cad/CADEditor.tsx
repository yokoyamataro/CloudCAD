import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Group,
  ActionIcon,
  Tooltip,
  Select,
  Text,
  Badge,
  Stack,
  NumberInput,
  Button,
  ColorInput,
  Divider,
  Menu,
  Checkbox,
  Modal,
  Textarea,
  Tabs,
  Table,
  TextInput
} from '@mantine/core';
import {
  IconPointer,
  IconLine,
  IconCircle,
  IconSquare,
  IconTypography,
  IconRuler2,
  IconGrid3x3,
  IconTarget,
  IconZoomIn,
  IconZoomOut,
  IconHome,
  IconLayersOff,
  IconEye,
  IconEyeOff,
  IconDeviceFloppy,
  IconFileText,
  IconRotate,
  IconMountain,
  IconMapPin,
  IconBuildingBridge,
  IconCompass,
  IconLocation,
  IconMessage,
  IconPlus,
  IconMinus,
  IconSettings,
  IconNumbers,
  IconMapPins,
  IconEdit,
  IconTrash
} from '@tabler/icons-react';
import { P21Parser } from '../../modules/sxf/P21Parser';
import { P21Exporter } from '../../modules/sxf/P21Exporter';
import { SXFParser } from '../../modules/sxf/SXFParser';
import { SXFExporter } from '../../modules/sxf/SXFExporter';
// import { SXFConverter } from '../../modules/sxf/SXFConverter'; // 一時的に無効化
import type { CADElement, CADPage, MultiPageLayout, PaperSize, PaperSettings, CADLayer } from '../../types/cad';

interface CADPoint {
  x: number;
  y: number;
}



interface CADEditorProps {
  projectId: string;
  onClose: () => void;
  initialData?: CADElement[];
  onSave?: (data: CADData) => void;
  initialTab?: 'cad' | 'coordinate' | 'lot';
}

interface CADData {
  id: string;
  projectId: string;
  name: string;
  elements: CADElement[];
  layers: CADLayer[];
  paperSettings: PaperSettings;
  createdAt: string;
  updatedAt: string;
  version: string;
  metadata: {
    coordinateSystem: number;
    scale: string;
    units: string;
    totalElements: number;
    fileFormat: 'cloudcad' | 'sxf' | 'dxf';
  };
}

export const CADEditor: React.FC<CADEditorProps> = ({
  projectId,
  onClose,
  initialData = [],
  onSave,
  initialTab = 'cad'
}) => {
  console.log('CADEditor コンポーネントが読み込まれました:', { projectId });
  // 用紙サイズ定義
  const paperSizes: PaperSize[] = [
    { id: 'A1', name: 'A1', width: 841, height: 594 },
    { id: 'A2', name: 'A2', width: 594, height: 420 },
    { id: 'A3', name: 'A3', width: 420, height: 297 },
    { id: 'A4', name: 'A4', width: 297, height: 210 },
    { id: 'A5', name: 'A5', width: 210, height: 148 },
    { id: 'B4', name: 'B4', width: 364, height: 257 },
    { id: 'B5', name: 'B5', width: 257, height: 182 },
    { id: 'free', name: 'フリーサイズ', width: 400, height: 300 }
  ];

  // CAD状態管理
  const [tool, setTool] = useState<string>('pointer');
  const [zoom, setZoom] = useState(0.5); // マルチページ表示のため初期ズームを小さく
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState<CADElement[]>(initialData);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // マルチページ管理
  const [pages, setPages] = useState<CADPage[]>([
    {
      id: 'page-1',
      name: 'ページ 1',
      elements: initialData,
      paperSettings: {
        size: paperSizes.find(p => p.id === 'A3')!,
        orientation: 'landscape',
        margin: 10,
        scale: '1:500',
        showBorder: true,
        coordinateSystem: 9
      },
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]);
  const [currentPageId, setCurrentPageId] = useState<string>('page-1');
  
  // タブ管理
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  
  // 座標データ管理
  const [coordinateData, setCoordinateData] = useState([
    {
      id: '1',
      pointName: 'BP-1',
      type: 'benchmark',
      x: 45000.123,
      y: -12000.456,
      z: 12.345,
      accuracy: '±2mm',
      description: '基準点1号',
      surveyor: '田中測量士',
      surveyDate: '2024-01-15',
      coordinateSystem: 'JGD2011'
    },
    {
      id: '2', 
      pointName: 'CP-1',
      type: 'control_point',
      x: 45100.789,
      y: -12050.234,
      z: 11.987,
      accuracy: '±5mm',
      description: '制御点1号',
      surveyor: '佐藤測量士',
      surveyDate: '2024-01-16',
      coordinateSystem: 'JGD2011'
    },
    {
      id: '3',
      pointName: 'BP-2', 
      type: 'boundary_point',
      x: 45200.345,
      y: -12100.678,
      z: 13.123,
      accuracy: '±3mm',
      description: '境界点2号',
      surveyor: '鈴木測量士',
      surveyDate: '2024-01-17',
      coordinateSystem: 'JGD2011'
    }
  ]);
  
  const [showCoordinateModal, setShowCoordinateModal] = useState(false);
  const [editingCoordinate, setEditingCoordinate] = useState<any>(null);
  
  // 座標管理関数
  const handleAddCoordinate = () => {
    setEditingCoordinate(null);
    setShowCoordinateModal(true);
  };
  
  const handleEditCoordinate = (coordinate: any) => {
    setEditingCoordinate(coordinate);
    setShowCoordinateModal(true);
  };
  
  const handleDeleteCoordinate = (id: string) => {
    setCoordinateData(prev => prev.filter(coord => coord.id !== id));
  };
  
  const handleSaveCoordinate = (data: any) => {
    if (editingCoordinate) {
      setCoordinateData(prev => prev.map(coord => 
        coord.id === editingCoordinate.id ? { ...coord, ...data } : coord
      ));
    } else {
      const newCoordinate = {
        id: Date.now().toString(),
        ...data,
        surveyDate: new Date().toISOString().split('T')[0]
      };
      setCoordinateData(prev => [...prev, newCoordinate]);
    }
    setShowCoordinateModal(false);
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'benchmark': return '基準点';
      case 'control_point': return '制御点';
      case 'boundary_point': return '境界点';
      default: return type;
    }
  };
  
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'benchmark': return 'blue';
      case 'control_point': return 'green';
      case 'boundary_point': return 'orange';
      default: return 'gray';
    }
  };
  const [multiPageLayout] = useState<MultiPageLayout>({
    columns: 2,
    rows: 2,
    pageSpacing: 50,
    padding: 20
  });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(10);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [snapTolerance] = useState(8); // ピクセル単位での吸着範囲
  const [mousePos, setMousePos] = useState<{x: number, y: number} | null>(null);
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const [snapTypes, setSnapTypes] = useState({
    endpoint: true,
    intersection: true,
    perpendicular: true,
    online: true,
    center: true
  });
  const [currentSnapPoint, setCurrentSnapPoint] = useState<{x: number, y: number, type: string} | null>(null);
  // const [isAddingComment, setIsAddingComment] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPosition, setCommentPosition] = useState<{x: number, y: number} | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  
  // 用紙設定
  const [paperSettings, setPaperSettings] = useState<PaperSettings>({
    size: paperSizes.find(p => p.id === 'A3')!,
    orientation: 'landscape',
    margin: 10,
    scale: '1:500',
    showBorder: true,
    coordinateSystem: 9 // 東京都
  });
  const [showPaperModal, setShowPaperModal] = useState(false);
  // const [customPaperSize, setCustomPaperSize] = useState({ width: 400, height: 300 });
  
  // レイヤー管理（OCF/SXF準拠）
  const [layers, setLayers] = useState<CADLayer[]>([
    { id: 'S-TOPO', name: '地形', visible: true, locked: false, color: '#808080', description: '地形・地物' },
    { id: 'S-STR', name: '構造物', visible: true, locked: false, color: '#0000FF', description: '建物・構造物' },
    { id: 'S-ROAD', name: '道路', visible: true, locked: false, color: '#FF8000', description: '道路・交通施設' },
    { id: 'S-RAIL', name: '鉄道', visible: true, locked: false, color: '#800080', description: '鉄道施設' },
    { id: 'S-RIVER', name: '河川', visible: true, locked: false, color: '#0080FF', description: '河川・水系' },
    { id: 'S-BOUND', name: '境界', visible: true, locked: false, color: '#FF0000', description: '境界線' },
    { id: 'S-POINT', name: '基準点', visible: true, locked: false, color: '#FF0000', description: '基準点・測量点' },
    { id: 'S-TEXT', name: '文字', visible: true, locked: false, color: '#000000', description: '文字・注記' },
    { id: 'S-CONT', name: '等高線', visible: true, locked: false, color: '#804000', description: '等高線' },
    { id: 'S-GRID', name: 'グリッド', visible: true, locked: false, color: '#C0C0C0', description: '座標グリッド' }
  ]);
  const [activeLayer, setActiveLayer] = useState('S-BOUND');
  const [showLayerModal, setShowLayerModal] = useState(false);
  
  // 座標入力
  const [showCoordinateInput, setShowCoordinateInput] = useState(false);
  const [coordinateInput, setCoordinateInput] = useState({ x: 0, y: 0 });
  const [coordinateDisplayMode, setCoordinateDisplayMode] = useState<'plane' | 'geographic'>('plane');
  
  // 精度管理
  const [precisionSettings] = useState({
    coordinatePrecision: 0.001, // メートル単位での精度 (1mm)
    anglePrecision: 0.1,        // 度単位での角度精度
    distancePrecision: 0.001,   // 距離測定精度
    elevationPrecision: 0.01,   // 標高精度
    qualityGrade: 'A' as 'A' | 'B' | 'C' // 精度等級
  });
  // const [showPrecisionModal, setShowPrecisionModal] = useState(false);
  
  // Canvas参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ページ管理関数

  const addNewPage = useCallback(() => {
    const newPageId = `page-${Date.now()}`;
    
    setPages(prev => {
      const pageCount = prev.length;
      const col = pageCount % multiPageLayout.columns;
      const row = Math.floor(pageCount / multiPageLayout.columns);
      
      const newPage: CADPage = {
        id: newPageId,
        name: `ページ ${prev.length + 1}`,
        elements: [],
        paperSettings: {
          size: paperSizes.find(p => p.id === 'A3')!,
          orientation: 'landscape',
          margin: 10,
          scale: '1:500',
          showBorder: true,
          coordinateSystem: 9
        },
        position: {
          x: col * (420 + multiPageLayout.pageSpacing), // A3横幅 + 間隔
          y: row * (297 + multiPageLayout.pageSpacing)  // A3縦幅 + 間隔
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return [...prev, newPage];
    });
    
    setCurrentPageId(newPageId);
  }, [paperSizes, multiPageLayout]);

  const deletePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return;
    
    setPages(prev => prev.filter(page => page.id !== pageId));
    
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(page => page.id !== pageId);
      setCurrentPageId(remainingPages[0]?.id || pages[0]?.id);
    }
  }, [pages, currentPageId]);

  const getCurrentPage = useCallback(() => {
    return pages.find(page => page.id === currentPageId);
  }, [pages, currentPageId]);

  const updateCurrentPage = useCallback((updates: Partial<CADPage>) => {
    setPages(prev => prev.map(page => 
      page.id === currentPageId 
        ? { ...page, ...updates, updatedAt: new Date().toISOString() }
        : page
    ));
  }, [currentPageId]);

  // ページの境界を計算する関数（他の関数より前に定義）
  const getPageBounds = useCallback((page: CADPage) => {
    const { width, height } = page.paperSettings.size;
    const actualWidth = page.paperSettings.orientation === 'landscape' 
      ? Math.max(width, height) : Math.min(width, height);
    const actualHeight = page.paperSettings.orientation === 'landscape' 
      ? Math.min(width, height) : Math.max(width, height);
    
    return {
      left: page.position.x,
      top: page.position.y,
      right: page.position.x + actualWidth,
      bottom: page.position.y + actualHeight,
      width: actualWidth,
      height: actualHeight
    };
  }, []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<CADPoint[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
  
  // クリック方式の線描画用
  const [isLineDrawing, setIsLineDrawing] = useState(false);
  const [linePoints, setLinePoints] = useState<CADPoint[]>([]);
  const [previewPoint, setPreviewPoint] = useState<CADPoint | null>(null);
  
  // 座標変換関数：ワールド座標からスクリーン座標へ
  // ワールド座標は用紙上の絶対座標（ピクセル単位）
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX * zoom + pan.x,
      y: worldY * zoom + pan.y
    };
  }, [zoom, pan]);

  // スナップポイントを検出する関数
  const findSnapPoint = useCallback((screenX: number, screenY: number) => {
    if (!snapToObjects) {
      return null;
    }

    const worldPos = {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    };

    let closestSnapPoint = null;
    let minDistance = snapTolerance / zoom; // ワールド座標での許容距離

    for (const element of elements) {
      // 線分の端点スナップ
      if (element.type === 'line' && snapTypes.endpoint) {
        const startDist = Math.sqrt(
          Math.pow(worldPos.x - element.startX, 2) + 
          Math.pow(worldPos.y - element.startY, 2)
        );
        const endDist = Math.sqrt(
          Math.pow(worldPos.x - element.endX!, 2) + 
          Math.pow(worldPos.y - element.endY!, 2)
        );

        if (startDist < minDistance) {
          minDistance = startDist;
          closestSnapPoint = { 
            x: element.startX, 
            y: element.startY, 
            type: 'endpoint' as const 
          };
        }
        if (endDist < minDistance) {
          minDistance = endDist;
          closestSnapPoint = { 
            x: element.endX!, 
            y: element.endY!, 
            type: 'endpoint' as const 
          };
        }
      }

      // 線上の点スナップ
      if (element.type === 'line' && snapTypes.online) {
        const lineLength = Math.sqrt(
          Math.pow(element.endX! - element.startX, 2) + 
          Math.pow(element.endY! - element.startY, 2)
        );
        if (lineLength > 0) {
          const t = Math.max(0, Math.min(1, 
            ((worldPos.x - element.startX) * (element.endX! - element.startX) + 
             (worldPos.y - element.startY) * (element.endY! - element.startY)) / 
            (lineLength * lineLength)
          ));
          const projX = element.startX + t * (element.endX! - element.startX);
          const projY = element.startY + t * (element.endY! - element.startY);
          const projDist = Math.sqrt(
            Math.pow(worldPos.x - projX, 2) + 
            Math.pow(worldPos.y - projY, 2)
          );

          if (projDist < minDistance) {
            minDistance = projDist;
            closestSnapPoint = { 
              x: projX, 
              y: projY, 
              type: 'online' as const 
            };
          }
        }
      }

      // 垂線スナップ
      if (element.type === 'line' && snapTypes.perpendicular) {
        const lineLength = Math.sqrt(
          Math.pow(element.endX! - element.startX, 2) + 
          Math.pow(element.endY! - element.startY, 2)
        );
        if (lineLength > 0) {
          // 線分に対する垂線の足を求める
          const t = ((worldPos.x - element.startX) * (element.endX! - element.startX) + 
                     (worldPos.y - element.startY) * (element.endY! - element.startY)) / 
                    (lineLength * lineLength);
          
          // 垂線の足が線分の延長線上にある場合も許可
          const perpX = element.startX + t * (element.endX! - element.startX);
          const perpY = element.startY + t * (element.endY! - element.startY);
          const perpDist = Math.sqrt(
            Math.pow(worldPos.x - perpX, 2) + 
            Math.pow(worldPos.y - perpY, 2)
          );

          if (perpDist < minDistance) {
            minDistance = perpDist;
            closestSnapPoint = { 
              x: perpX, 
              y: perpY, 
              type: 'perpendicular' as const 
            };
          }
        }
      }

      // 円の中心スナップ
      if (element.type === 'circle' && snapTypes.center) {
        const centerDist = Math.sqrt(
          Math.pow(worldPos.x - element.centerX!, 2) + 
          Math.pow(worldPos.y - element.centerY!, 2)
        );
        if (centerDist < minDistance) {
          minDistance = centerDist;
          closestSnapPoint = { 
            x: element.centerX!, 
            y: element.centerY!, 
            type: 'center' as const 
          };
        }
      }
    }

    // 線分の交点スナップ
    if (snapTypes.intersection) {
      for (let i = 0; i < elements.length; i++) {
        for (let j = i + 1; j < elements.length; j++) {
          const elem1 = elements[i];
          const elem2 = elements[j];
          
          if (elem1.type === 'line' && elem2.type === 'line') {
            const intersection = getLineIntersection(
              elem1.startX, elem1.startY, elem1.endX!, elem1.endY!,
              elem2.startX, elem2.startY, elem2.endX!, elem2.endY!
            );
            
            if (intersection) {
              const intDist = Math.sqrt(
                Math.pow(worldPos.x - intersection.x, 2) + 
                Math.pow(worldPos.y - intersection.y, 2)
              );
              if (intDist < minDistance) {
                minDistance = intDist;
                closestSnapPoint = { 
                  x: intersection.x, 
                  y: intersection.y, 
                  type: 'intersection' as const 
                };
              }
            }
          }
        }
      }
    }

    return closestSnapPoint;
  }, [elements, snapToObjects, pan, zoom, snapTolerance, snapTypes]);

  // 線分の交点を求める関数
  const getLineIntersection = useCallback((
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // 平行線

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }
    return null;
  }, []);

  // スクリーン座標からワールド座標への変換
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const worldX = (screenX - pan.x) / zoom;
    const worldY = (screenY - pan.y) / zoom;

    // オブジェクトスナップが有効な場合
    if (snapToObjects) {
      const snapPoint = findSnapPoint(screenX, screenY);
      if (snapPoint) {
        // スナップポイントが見つかった場合はそこにスナップ
        return { x: snapPoint.x, y: snapPoint.y };
      }
      // オブジェクトスナップが有効だがスナップポイントが見つからない場合は
      // グリッドスナップやフリー配置も試す
    }
    
    // グリッドスナップ（グリッド表示時のみ）
    if (snapToGrid && showGrid) {
      const snappedX = Math.round(worldX / gridSize) * gridSize;
      const snappedY = Math.round(worldY / gridSize) * gridSize;
      return {
        x: snappedX,
        y: snappedY
      };
    }
    
    // 完全にフリーな配置
    return { x: worldX, y: worldY };
  }, [zoom, pan, snapToGrid, gridSize, showGrid, snapToObjects, findSnapPoint]);
  
  // マルチページ描画関数
  const drawMultiplePages = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    pages.forEach(page => {
      const bounds = getPageBounds(page);
      const screenBounds = {
        left: bounds.left * zoom + pan.x,
        top: bounds.top * zoom + pan.y,
        right: bounds.right * zoom + pan.x,
        bottom: bounds.bottom * zoom + pan.y
      };
      
      // ページの境界をチェック（表示領域内にあるかどうか）
      if (screenBounds.right < 0 || screenBounds.left > canvas.width ||
          screenBounds.bottom < 0 || screenBounds.top > canvas.height) {
        return; // 表示領域外なのでスキップ
      }
      
      // 用紙の背景を描画
      ctx.fillStyle = page.id === currentPageId ? '#ffffff' : '#f8f9fa';
      ctx.fillRect(screenBounds.left, screenBounds.top, 
                   (bounds.width * zoom), (bounds.height * zoom));
      
      // 用紙の枠線を描画
      ctx.strokeStyle = page.id === currentPageId ? '#0066cc' : '#dee2e6';
      ctx.lineWidth = page.id === currentPageId ? 2 : 1;
      ctx.strokeRect(screenBounds.left, screenBounds.top, 
                     (bounds.width * zoom), (bounds.height * zoom));
      
      // ページ名を描画
      ctx.fillStyle = '#6c757d';
      ctx.font = '12px Arial';
      ctx.fillText(page.name, screenBounds.left + 10, screenBounds.top - 5);
      
      // ページの要素を描画
      drawPageElements(ctx, page);
    });
  }, [pages, getPageBounds, zoom, pan, currentPageId]);

  const drawPageElements = useCallback((ctx: CanvasRenderingContext2D, page: CADPage | null) => {
    if (!page) return;
    
    const bounds = getPageBounds(page);
    
    // ページの座標系にクリッピング
    ctx.save();
    const screenBounds = {
      left: bounds.left * zoom + pan.x,
      top: bounds.top * zoom + pan.y,
      width: bounds.width * zoom,
      height: bounds.height * zoom
    };
    ctx.beginPath();
    ctx.rect(screenBounds.left, screenBounds.top, screenBounds.width, screenBounds.height);
    ctx.clip();
    
    // 要素を描画（ページローカル座標系）
    const elementsToRender = page.id === currentPageId ? elements : page.elements;
    
    // デバッグ：要素数をコンソールに出力
    if (elementsToRender.length > 0) {
      console.log(`ページ ${page.name}(${page.id}): ${elementsToRender.length}個の要素を描画中`, elementsToRender);
    }
    
    elementsToRender.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      // 要素をページ座標系に変換して描画
      drawElementInPage(ctx, element, page, layer);
    });
    
    ctx.restore();
  }, [getPageBounds, zoom, pan, layers, currentPageId, elements]);

  const drawElementInPage = useCallback((ctx: CanvasRenderingContext2D, element: CADElement, page: CADPage, layer: CADLayer) => {
    const pageBounds = getPageBounds(page);
    
    // ページローカル座標をスクリーン座標に変換
    const pageToScreen = (x: number, y: number) => {
      return {
        x: (pageBounds.left + x) * zoom + pan.x,
        y: (pageBounds.top + y) * zoom + pan.y
      };
    };
    
    // 描画スタイル設定
    ctx.strokeStyle = element.properties.stroke;
    ctx.lineWidth = Math.max(1, Math.min(4, (element.properties.strokeWidth || 1) / Math.max(1, zoom / 2)));
    ctx.fillStyle = element.properties.fill || 'transparent';
    
    // 要素タイプ別の描画
    switch (element.type) {
      case 'line':
        if (element.points.length >= 2) {
          ctx.beginPath();
          const startScreen = pageToScreen(element.points[0].x, element.points[0].y);
          ctx.moveTo(startScreen.x, startScreen.y);
          
          for (let i = 1; i < element.points.length; i++) {
            const pointScreen = pageToScreen(element.points[i].x, element.points[i].y);
            ctx.lineTo(pointScreen.x, pointScreen.y);
          }
          ctx.stroke();
        }
        break;
        
      case 'circle':
        if (element.points.length >= 2) {
          const centerScreen = pageToScreen(element.points[0].x, element.points[0].y);
          const radiusScreen = pageToScreen(element.points[1].x, element.points[1].y);
          const radius = Math.sqrt(
            Math.pow(radiusScreen.x - centerScreen.x, 2) + 
            Math.pow(radiusScreen.y - centerScreen.y, 2)
          );
          
          ctx.beginPath();
          ctx.arc(centerScreen.x, centerScreen.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
        
      case 'text':
        if (element.points.length >= 1) {
          const textScreen = pageToScreen(element.points[0].x, element.points[0].y);
          ctx.fillStyle = element.properties.stroke;
          ctx.font = `${(element.properties.fontSize || 12) * zoom}px Arial`;
          ctx.fillText(element.properties.text || '', textScreen.x, textScreen.y);
        }
        break;
        
      // 他の要素タイプも同様に実装...
    }
  }, [getPageBounds, zoom, pan]);

  const drawPageGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, page: CADPage) => {
    if (!showGrid) return;
    
    const bounds = getPageBounds(page);
    const screenBounds = {
      left: bounds.left * zoom + pan.x,
      top: bounds.top * zoom + pan.y,
      right: bounds.right * zoom + pan.x,
      bottom: bounds.bottom * zoom + pan.y
    };
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    
    // ページ内でのグリッド描画
    const gridSpacing = gridSize * zoom;
    
    if (gridSpacing > 5) { // 最小グリッド間隔
      // 垂直線
      for (let x = screenBounds.left; x <= screenBounds.right; x += gridSpacing) {
        if (x >= screenBounds.left && x <= screenBounds.right) {
          ctx.beginPath();
          ctx.moveTo(x, screenBounds.top);
          ctx.lineTo(x, screenBounds.bottom);
          ctx.stroke();
        }
      }
      
      // 水平線
      for (let y = screenBounds.top; y <= screenBounds.bottom; y += gridSpacing) {
        if (y >= screenBounds.top && y <= screenBounds.bottom) {
          ctx.beginPath();
          ctx.moveTo(screenBounds.left, y);
          ctx.lineTo(screenBounds.right, y);
          ctx.stroke();
        }
      }
    }
  }, [showGrid, getPageBounds, zoom, pan, gridSize]);

  // 描画関数
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!showGrid) return;
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    
    // 用紙サイズを取得
    const currentSize = paperSettings.size;
    const paperWidth = paperSettings.orientation === 'landscape' 
      ? Math.max(currentSize.width, currentSize.height)
      : Math.min(currentSize.width, currentSize.height);
    const paperHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(currentSize.width, currentSize.height)
      : Math.max(currentSize.width, currentSize.height);
    
    // 用紙内でのグリッド描画
    const paperOrigin = worldToScreen(0, 0);
    const paperEnd = worldToScreen(paperWidth, paperHeight);
    
    // グリッド間隔（ワールド座標）- ズーム倍率に応じて調整
    let worldGridSize = gridSize;
    
    // 高倍率時はグリッド間隔を拡大してパフォーマンスを向上
    if (zoom > 10) {
      worldGridSize = gridSize * 4;
    } else if (zoom > 5) {
      worldGridSize = gridSize * 2;
    }
    
    // 縦線
    for (let x = 0; x <= paperWidth; x += worldGridSize) {
      const screenX = worldToScreen(x, 0).x;
      if (screenX >= paperOrigin.x && screenX <= paperEnd.x) {
        ctx.beginPath();
        ctx.moveTo(screenX, paperOrigin.y);
        ctx.lineTo(screenX, paperEnd.y);
        ctx.stroke();
      }
    }
    
    // 横線
    for (let y = 0; y <= paperHeight; y += worldGridSize) {
      const screenY = worldToScreen(0, y).y;
      if (screenY >= paperOrigin.y && screenY <= paperEnd.y) {
        ctx.beginPath();
        ctx.moveTo(paperOrigin.x, screenY);
        ctx.lineTo(paperEnd.x, screenY);
        ctx.stroke();
      }
    }
  }, [showGrid, gridSize, worldToScreen, paperSettings, zoom]);
  
  // 用紙描画
  const drawPaper = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!paperSettings.showBorder) return;
    
    // 用紙サイズを取得（縦横考慮）
    const currentSize = paperSettings.size;
    const paperWidth = paperSettings.orientation === 'landscape' 
      ? Math.max(currentSize.width, currentSize.height)
      : Math.min(currentSize.width, currentSize.height);
    const paperHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(currentSize.width, currentSize.height)
      : Math.max(currentSize.width, currentSize.height);
    
    // 用紙の原点(0,0)からの座標で描画
    const paperOrigin = worldToScreen(0, 0);
    const paperBottomRight = worldToScreen(paperWidth, paperHeight);
    
    const paperX = paperOrigin.x;
    const paperY = paperOrigin.y;
    const paperW = paperBottomRight.x - paperOrigin.x;
    const paperH = paperBottomRight.y - paperOrigin.y;
    
    // 用紙背景（白）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paperX, paperY, paperW, paperH);
    
    // 用紙境界線
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(paperX, paperY, paperW, paperH);
    
    // マージン線
    if (paperSettings.margin > 0) {
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      const marginStart = worldToScreen(paperSettings.margin, paperSettings.margin);
      const marginEnd = worldToScreen(paperWidth - paperSettings.margin, paperHeight - paperSettings.margin);
      
      ctx.strokeRect(
        marginStart.x,
        marginStart.y,
        marginEnd.x - marginStart.x,
        marginEnd.y - marginStart.y
      );
      ctx.setLineDash([]);
    }
    
    // 用紙情報テキスト
    ctx.fillStyle = '#666666';
    ctx.font = `${12 * Math.min(zoom, 1)}px Arial`;
    ctx.fillText(
      `${paperSettings.size.name} (${paperSettings.orientation === 'landscape' ? '横' : '縦'}) - ${paperSettings.scale}`,
      paperX + 10,
      paperY - 10
    );
  }, [paperSettings, worldToScreen, zoom]);
  const drawElements = useCallback((ctx: CanvasRenderingContext2D) => {
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      ctx.strokeStyle = element.properties.stroke;
      // 高倍率時も線の太さを適切に保持（最小1ピクセル、最大4ピクセル）
      const baseLineWidth = element.properties.strokeWidth || 1;
      ctx.lineWidth = Math.max(1, Math.min(4, baseLineWidth / Math.max(1, zoom / 2)));
      ctx.fillStyle = element.properties.fill || 'transparent';
      
      switch (element.type) {
        case 'line':
          if (element.points.length >= 2) {
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
          }
          break;
          
        case 'circle':
          if (element.points.length >= 2) {
            const center = element.points[0];
            const edge = element.points[1];
            const centerScreen = worldToScreen(center.x, center.y);
            
            // 半径はワールド座標での距離をズーム倍
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            ) * zoom;
            
            ctx.beginPath();
            ctx.arc(centerScreen.x, centerScreen.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            if (element.properties.fill) ctx.fill();
          }
          break;
          
        case 'point':
          if (element.points.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            ctx.fillStyle = element.properties.stroke;
            ctx.beginPath();
            ctx.arc(pointScreen.x, pointScreen.y, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // 十字マーク（固定サイズ）
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pointScreen.x - 8, pointScreen.y);
            ctx.lineTo(pointScreen.x + 8, pointScreen.y);
            ctx.moveTo(pointScreen.x, pointScreen.y - 8);
            ctx.lineTo(pointScreen.x, pointScreen.y + 8);
            ctx.stroke();
          }
          break;

        case 'survey_point':
          if (element.points.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            // 測量点シンボル（三角形）
            ctx.fillStyle = element.properties.stroke;
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pointScreen.x, pointScreen.y - 8);
            ctx.lineTo(pointScreen.x - 7, pointScreen.y + 6);
            ctx.lineTo(pointScreen.x + 7, pointScreen.y + 6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // 点番号表示
            if (element.properties.pointNumber) {
              ctx.fillStyle = '#000000';
              ctx.font = '10px Arial';
              ctx.fillText(element.properties.pointNumber, pointScreen.x + 10, pointScreen.y - 5);
            }
          }
          break;

        case 'boundary_line':
          if (element.points.length >= 2) {
            // 境界線（特殊な線種）
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5, 2, 5]); // 境界線パターン
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          break;

        case 'contour_line':
          if (element.points.length >= 2) {
            // 等高線
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
            
            // 標高値表示
            if (element.properties.elevation) {
              const midPoint = Math.floor(element.points.length / 2);
              const midScreen = worldToScreen(element.points[midPoint].x, element.points[midPoint].y);
              ctx.fillStyle = '#804000';
              ctx.font = '9px Arial';
              ctx.fillText(`EL=${element.properties.elevation.toFixed(2)}`, midScreen.x + 5, midScreen.y - 5);
            }
          }
          break;

        case 'traverse_line':
          if (element.points.length >= 2) {
            // トラバース線（測量線）
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]); // 点線パターン
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 距離と方位角表示
            if (element.properties.distance && element.properties.azimuth) {
              const midPoint = Math.floor(element.points.length / 2);
              const midScreen = worldToScreen(element.points[midPoint].x, element.points[midPoint].y);
              ctx.fillStyle = '#006600';
              ctx.font = '8px Arial';
              ctx.fillText(`${element.properties.distance.toFixed(2)}m`, midScreen.x + 5, midScreen.y - 10);
              ctx.fillText(`${element.properties.azimuth.toFixed(1)}°`, midScreen.x + 5, midScreen.y + 5);
            }
          }
          break;

        case 'control_point':
          if (element.points.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            // 制御点シンボル（四角形）
            ctx.fillStyle = element.properties.stroke;
            ctx.strokeStyle = element.properties.stroke;
            ctx.lineWidth = 2;
            
            ctx.fillRect(pointScreen.x - 6, pointScreen.y - 6, 12, 12);
            ctx.strokeRect(pointScreen.x - 6, pointScreen.y - 6, 12, 12);
            
            // 十字マーク
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pointScreen.x - 4, pointScreen.y);
            ctx.lineTo(pointScreen.x + 4, pointScreen.y);
            ctx.moveTo(pointScreen.x, pointScreen.y - 4);
            ctx.lineTo(pointScreen.x, pointScreen.y + 4);
            ctx.stroke();
            
            // 点番号表示
            if (element.properties.pointNumber) {
              ctx.fillStyle = '#000000';
              ctx.font = '10px Arial';
              ctx.fillText(element.properties.pointNumber, pointScreen.x + 10, pointScreen.y - 5);
            }
          }
          break;

        case 'building_outline':
          if (element.points.length >= 3) {
            // 建物輪郭線
            ctx.strokeStyle = element.properties.stroke;
            ctx.fillStyle = element.properties.fill || 'rgba(128, 128, 128, 0.3)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.closePath();
            
            if (element.properties.fill) {
              ctx.fill();
            }
            ctx.stroke();
            
            // 建物種別表示
            if (element.properties.buildingType) {
              const centerX = element.points.reduce((sum, p) => sum + p.x, 0) / element.points.length;
              const centerY = element.points.reduce((sum, p) => sum + p.y, 0) / element.points.length;
              const centerScreen = worldToScreen(centerX, centerY);
              
              ctx.fillStyle = '#000000';
              ctx.font = '10px Arial';
              ctx.textAlign = 'center';
              ctx.fillText(element.properties.buildingType, centerScreen.x, centerScreen.y);
              ctx.textAlign = 'left';
            }
          }
          break;
          
        case 'text':
          if (element.points.length >= 1 && element.properties.text) {
            const pointScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.fillStyle = element.properties.stroke;
            ctx.font = `${(element.properties.fontSize || 12) * zoom}px Arial`;
            ctx.fillText(element.properties.text, pointScreen.x, pointScreen.y);
          }
          break;
          
        case 'comment':
          if (element.points.length >= 1 && element.properties.text) {
            const pointScreen = worldToScreen(element.points[0].x, element.points[0].y);
            
            // コメント背景の描画
            ctx.fillStyle = '#fffbcc'; // 薄い黄色の背景
            ctx.strokeStyle = '#e6cc00'; // 濃い黄色の枠線
            ctx.lineWidth = 1;
            
            const text = element.properties.text;
            const fontSize = (element.properties.fontSize || 12) * zoom;
            ctx.font = `${fontSize}px Arial`;
            
            const textWidth = ctx.measureText(text).width;
            const padding = 8;
            const boxWidth = textWidth + padding * 2;
            const boxHeight = fontSize + padding * 2;
            
            // 背景の四角形
            ctx.fillRect(pointScreen.x - padding, pointScreen.y - fontSize - padding, boxWidth, boxHeight);
            ctx.strokeRect(pointScreen.x - padding, pointScreen.y - fontSize - padding, boxWidth, boxHeight);
            
            // コメントアイコン（小さな吹き出し）
            ctx.fillStyle = '#e6cc00';
            ctx.beginPath();
            ctx.moveTo(pointScreen.x - padding - 8, pointScreen.y - fontSize/2);
            ctx.lineTo(pointScreen.x - padding, pointScreen.y - fontSize/2 - 4);
            ctx.lineTo(pointScreen.x - padding, pointScreen.y - fontSize/2 + 4);
            ctx.closePath();
            ctx.fill();
            
            // テキスト描画
            ctx.fillStyle = '#333333'; // 濃いグレーのテキスト
            ctx.fillText(text, pointScreen.x, pointScreen.y);
          }
          break;
      }
      
      // 選択されている要素をハイライト
      if (selectedElement === element.id) {
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        // 選択枠を描画（ワールド座標系で計算）
        const bounds = getElementBounds(element);
        if (bounds) {
          const topLeft = worldToScreen(bounds.x - 5, bounds.y - 5);
          const bottomRight = worldToScreen(bounds.x + bounds.width + 5, bounds.y + bounds.height + 5);
          
          ctx.strokeRect(
            topLeft.x,
            topLeft.y,
            bottomRight.x - topLeft.x,
            bottomRight.y - topLeft.y
          );
        }
        ctx.setLineDash([]);
      }
    });
  }, [elements, layers, selectedElement, worldToScreen, zoom]);
  
  const getElementBounds = (element: CADElement) => {
    if (element.points.length === 0) return null;
    
    let minX = element.points[0].x;
    let maxX = element.points[0].x;
    let minY = element.points[0].y;
    let maxY = element.points[0].y;
    
    element.points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };
  
  // キャンバス描画（マルチページ対応）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 高DPI対応の初期化
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // キャンバスの実際のサイズを設定
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // CSS表示サイズを設定
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // コンテキストをスケール
    ctx.scale(dpr, dpr);
    
    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景（全体）
    ctx.fillStyle = '#e9ecef';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // すべてのページを描画
    drawMultiplePages(ctx, canvas);
    
    // 現在のページのグリッドを描画
    const currentPage = getCurrentPage();
    if (currentPage) {
      drawPageGrid(ctx, canvas, currentPage);
    }
    
    // 要素は各ページ内で描画済み
    
    // クリック方式の線描画プレビュー
    if (isLineDrawing && linePoints.length > 0) {
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // 確定済みの線分
      if (linePoints.length >= 2) {
        ctx.beginPath();
        const startScreen = worldToScreen(linePoints[0].x, linePoints[0].y);
        ctx.moveTo(startScreen.x, startScreen.y);
        
        for (let i = 1; i < linePoints.length; i++) {
          const pointScreen = worldToScreen(linePoints[i].x, linePoints[i].y);
          ctx.lineTo(pointScreen.x, pointScreen.y);
        }
        ctx.stroke();
      }
      
      // プレビュー線分（最後の点からマウス位置まで）
      if (previewPoint && linePoints.length > 0) {
        ctx.beginPath();
        const lastPointScreen = worldToScreen(linePoints[linePoints.length - 1].x, linePoints[linePoints.length - 1].y);
        const previewScreen = worldToScreen(previewPoint.x, previewPoint.y);
        ctx.moveTo(lastPointScreen.x, lastPointScreen.y);
        ctx.lineTo(previewScreen.x, previewScreen.y);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }
    
    // ドラッグ方式の描画プレビュー（円と点用）
    if (isDrawing && currentPath.length > 0) {
      ctx.strokeStyle = '#00aaff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (tool === 'circle' && currentPath.length >= 2) {
        const center = currentPath[0];
        const edge = currentPath[currentPath.length - 1];
        const centerScreen = worldToScreen(center.x, center.y);
        const radius = Math.sqrt(
          Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
        ) * zoom;
        
        ctx.beginPath();
        ctx.arc(centerScreen.x, centerScreen.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }

    // スナップポイントの描画
    if (mousePos) {
      const snapPoint = findSnapPoint(mousePos.x, mousePos.y);
      if (snapPoint) {
        const screenPos = worldToScreen(snapPoint.x, snapPoint.y);
        
        ctx.strokeStyle = '#ff6600';
        ctx.fillStyle = '#ff6600';
        ctx.lineWidth = 2;
        
        // スナップタイプに応じたマーカー描画
        ctx.beginPath();
        switch (snapPoint.type) {
          case 'endpoint':
            // 端点: 四角形
            ctx.strokeRect(screenPos.x - 6, screenPos.y - 6, 12, 12);
            // 四角形の中に小さな十字を追加
            ctx.moveTo(screenPos.x - 3, screenPos.y);
            ctx.lineTo(screenPos.x + 3, screenPos.y);
            ctx.moveTo(screenPos.x, screenPos.y - 3);
            ctx.lineTo(screenPos.x, screenPos.y + 3);
            ctx.stroke();
            break;
          case 'intersection':
            // 交点: X印
            ctx.moveTo(screenPos.x - 6, screenPos.y - 6);
            ctx.lineTo(screenPos.x + 6, screenPos.y + 6);
            ctx.moveTo(screenPos.x + 6, screenPos.y - 6);
            ctx.lineTo(screenPos.x - 6, screenPos.y + 6);
            ctx.stroke();
            break;
          case 'online':
            // 線上: 三角形
            ctx.moveTo(screenPos.x, screenPos.y - 6);
            ctx.lineTo(screenPos.x - 6, screenPos.y + 6);
            ctx.lineTo(screenPos.x + 6, screenPos.y + 6);
            ctx.closePath();
            ctx.stroke();
            break;
          case 'perpendicular':
            // 垂線: T字形
            ctx.moveTo(screenPos.x - 6, screenPos.y);
            ctx.lineTo(screenPos.x + 6, screenPos.y);
            ctx.moveTo(screenPos.x, screenPos.y - 6);
            ctx.lineTo(screenPos.x, screenPos.y + 6);
            ctx.stroke();
            break;
          case 'center':
            // 中心: 円
            ctx.arc(screenPos.x, screenPos.y, 6, 0, 2 * Math.PI);
            ctx.stroke();
            // 中心に小さな十字を追加
            ctx.moveTo(screenPos.x - 3, screenPos.y);
            ctx.lineTo(screenPos.x + 3, screenPos.y);
            ctx.moveTo(screenPos.x, screenPos.y - 3);
            ctx.lineTo(screenPos.x, screenPos.y + 3);
            ctx.stroke();
            break;
        }
        
        // スナップ時のカーソル周りに小さなリングを描画
        ctx.beginPath();
        ctx.strokeStyle = '#ff6600';
        ctx.lineWidth = 1;
        ctx.arc(mousePos.x, mousePos.y, 12, 0, 2 * Math.PI);
        ctx.stroke();
        
        // スナップタイプのラベルを表示
        ctx.fillStyle = '#ff6600';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        const labels = {
          endpoint: '端点',
          intersection: '交点',
          perpendicular: '垂線',
          online: '線上',
          center: '中心'
        };
        const label = labels[snapPoint.type as keyof typeof labels] || '';
        ctx.fillText(label, mousePos.x + 15, mousePos.y - 10);
      }
    }
  }, [drawGrid, drawElements, drawPaper, isDrawing, currentPath, isLineDrawing, linePoints, previewPoint, tool, worldToScreen, zoom, mousePos, findSnapPoint]);

  // キャンバスリサイズ処理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // キャンバスの実際のサイズを設定
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // CSS表示サイズを設定
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // コンテキストをスケール
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    });

    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // コメント追加機能
  const handleAddComment = () => {
    if (commentText.trim() && commentPosition) {
      const newComment: CADElement = {
        id: Date.now().toString(),
        type: 'comment',
        layerId: activeLayer,
        points: [commentPosition],
        properties: {
          stroke: '#e6cc00',
          strokeWidth: 1,
          text: commentText.trim(),
          fontSize: 12
        }
      };
      
      setElements(prev => [...prev, newComment]);
      setCommentText('');
      setCommentPosition(null);
      setShowCommentInput(false);
      setTool('pointer'); // コメント追加後はポインターツールに戻す
    }
  };

  const handleCancelComment = () => {
    setCommentText('');
    setCommentPosition(null);
    setShowCommentInput(false);
  };

  // マルチページ管理機能

  const getPageAtPosition = useCallback((x: number, y: number) => {
    for (const page of pages) {
      const bounds = getPageBounds(page);
      if (x >= bounds.left && x <= bounds.right && 
          y >= bounds.top && y <= bounds.bottom) {
        return page;
      }
    }
    return null;
  }, [pages, getPageBounds]);

  // 現在のページの要素を更新（ページ切り替え時のみ）
  useEffect(() => {
    const currentPage = pages.find(page => page.id === currentPageId);
    if (currentPage) {
      // ページ切り替え時は即座に状態を更新
      console.log(`ページ ${currentPageId} に切り替え: ${currentPage.elements.length}個の要素を読み込み`);
      setElements(currentPage.elements);
      setPaperSettings(currentPage.paperSettings);
    }
  }, [currentPageId, pages]);

  // 要素が変更されたときに現在のページを更新（useRefで前回値と比較）
  const prevElementsRef = useRef<CADElement[]>([]);
  useEffect(() => {
    // 要素が実際に変更された場合のみ更新
    if (JSON.stringify(elements) !== JSON.stringify(prevElementsRef.current)) {
      console.log(`ページ ${currentPageId} に ${elements.length}個の要素を保存`, elements);
      prevElementsRef.current = elements;
      setPages(prev => prev.map(page => 
        page.id === currentPageId 
          ? { ...page, elements, updatedAt: new Date().toISOString() }
          : page
      ));
    }
  }, [elements, currentPageId]);

  // SXF/P21インポート・エクスポート機能
  const handleImportSXF = useCallback(async (file: File) => {
    try {
      const fileContent = file.name.toLowerCase().endsWith('.p21') 
        ? await file.text()
        : await file.arrayBuffer();

      // let convertedElements: any[] = []; // 一時的に無効化

      if (file.name.toLowerCase().endsWith('.p21')) {
        // P21ファイルの処理
        const parser = new P21Parser({
          encoding: 'utf-8',
          coordinateSystem: paperSettings.coordinateSystem?.toString() || 'JGD2000'
        });
        
        const parseResult = await parser.parseFile(fileContent as string);
        
        if (parseResult.success && parseResult.data) {
          // const converter = new SXFConverter(); // 一時的に無効化
          // const conversionResult = converter.convertToDrawingElements(parseResult.data);
          // convertedElements = conversionResult.elements;
          console.log('P21インポート機能は一時的に無効化されています');
          alert('P21インポート機能は一時的に無効化されています');
          return;
        } else {
          console.error('P21解析エラー:', parseResult.errors);
          return;
        }
      } else {
        // SXFファイルの処理
        const parser = new SXFParser({
          encoding: 'shift_jis',
          coordinateSystem: paperSettings.coordinateSystem?.toString() || 'JGD2000'
        });
        
        const parseResult = await parser.parseFile(fileContent as ArrayBuffer);
        
        if (parseResult.success && parseResult.data) {
          // const converter = new SXFConverter(); // 一時的に無効化
          // const conversionResult = converter.convertToDrawingElements(parseResult.data);
          // convertedElements = conversionResult.elements;
          console.log('SXFインポート機能は一時的に無効化されています');
          alert('SXFインポート機能は一時的に無効化されています');
          return;
        } else {
          console.error('SXF解析エラー:', parseResult.errors);
          return;
        }
      }

      // 変換された要素をCADエディタに追加
      // setElements(prev => [...prev, ...convertedElements]); // 一時的に無効化
      // console.log(`${convertedElements.length}個の要素をインポートしました`); // 一時的に無効化
      
    } catch (error) {
      console.error('ファイルインポートエラー:', error);
    }
  }, [paperSettings.coordinateSystem]);

  const handleExportP21 = useCallback(async () => {
    try {
      const exporter = new P21Exporter({
        version: 'SXF 3.1',
        author: 'CloudCAD User',
        coordinateSystem: paperSettings.coordinateSystem?.toString() || 'JGD2000',
        units: 'mm'
      });

      const result = await exporter.exportElements(elements);
      
      if (result.success && result.content) {
        // P21ファイルとしてダウンロード
        const blob = new Blob([result.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_${Date.now()}.p21`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('P21ファイルをエクスポートしました');
      } else {
        console.error('P21エクスポートエラー:', result.errors);
      }
    } catch (error) {
      console.error('P21エクスポートエラー:', error);
    }
  }, [elements, paperSettings.coordinateSystem]);

  const handleExportSXF = useCallback(async () => {
    try {
      const exporter = new SXFExporter({
        version: 'SXF 3.1',
        author: 'CloudCAD User',
        coordinateSystem: paperSettings.coordinateSystem?.toString() || 'JGD2000',
        units: 'mm'
      });

      // レイヤー情報を抽出
      const sxfLayers = layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        color: layer.color,
        lineType: layer.lineType || 'CONTINUOUS',
        lineWidth: layer.lineWidth || 1.0,
        visible: layer.visible,
        locked: layer.locked
      }));

      const result = await exporter.exportElements(elements, sxfLayers);
      
      if (result.success && result.buffer) {
        // SXFファイルとしてダウンロード
        const blob = new Blob([result.buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawing_${Date.now()}.sxf`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('SXFファイルをエクスポートしました');
      } else {
        console.error('SXFエクスポートエラー:', result.errors);
      }
    } catch (error) {
      console.error('SXFエクスポートエラー:', error);
    }
  }, [elements, layers, paperSettings.coordinateSystem]);

  // マウスイベント（マルチページ対応）
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // スクリーン座標からワールド座標に変換
    const worldX = (screenX - pan.x) / zoom;
    const worldY = (screenY - pan.y) / zoom;
    
    // クリックされたページを確認
    const clickedPage = getPageAtPosition(worldX, worldY);
    if (clickedPage && clickedPage.id !== currentPageId) {
      setCurrentPageId(clickedPage.id);
    }
    
    // ページローカル座標に変換
    if (clickedPage) {
      const pageBounds = getPageBounds(clickedPage);
      const pageLocalX = worldX - pageBounds.left;
      const pageLocalY = worldY - pageBounds.top;
      
      // ページ境界内でのスナップ処理
      return screenToWorld(screenX, screenY);
    }
    
    return { x: worldX, y: worldY };
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const screenPos = {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr
    };
    
    // 中ボタンまたは選択ツール+ドラッグでパン開始
    if (e.button === 1 || (tool === 'pointer' && e.button === 0)) {
      setIsPanning(true);
      setLastPanPos(screenPos);
      return;
    }
    
    const pos = getMousePos(e);
    
    if (tool === 'pointer') {
      // 要素選択
      // TODO: 要素のヒット判定実装
      setSelectedElement(null);
      return;
    }
    
    // コメント追加
    if (tool === 'comment') {
      setCommentPosition(pos);
      setShowCommentInput(true);
      return;
    }
    
    // 線分系ツールはクリック方式
    if (tool === 'line' || tool === 'boundary_line' || tool === 'contour_line' || tool === 'traverse_line' || tool === 'building_outline') {
      if (!isLineDrawing) {
        // 線描画開始
        setIsLineDrawing(true);
        setLinePoints([pos]);
      } else {
        // 点を追加
        setLinePoints(prev => [...prev, pos]);
      }
      return;
    }
    
    // その他のツールはドラッグ方式
    setIsDrawing(true);
    setCurrentPath([pos]);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const screenPos = {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr
    };
    
    // パン処理
    if (isPanning) {
      const deltaX = screenPos.x - lastPanPos.x;
      const deltaY = screenPos.y - lastPanPos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPos(screenPos);
      return;
    }
    
    const pos = getMousePos(e);
    
    // マウス位置を更新（スナップポイント表示用）- CSSピクセル単位
    const mouseScreenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setMousePos(mouseScreenPos);
    
    // 現在のスナップポイントを更新（カーソル制御用）
    if (snapToObjects) {
      const snapPoint = findSnapPoint(mouseScreenPos.x, mouseScreenPos.y);
      setCurrentSnapPoint(snapPoint);
    } else {
      setCurrentSnapPoint(null);
    }
    
    // 線描画中のプレビュー更新
    if (isLineDrawing) {
      setPreviewPoint(pos);
      return;
    }
    
    if (!isDrawing) return;
    
    // 円ツールは2点のみで描画
    if (tool === 'circle') {
      setCurrentPath(prev => prev.length > 0 ? [prev[0], pos] : [pos]);
    } else {
      // その他のツールは連続描画
      setCurrentPath(prev => [...prev, pos]);
    }
  };
  
  // 線描画完了（ダブルクリック、Enterキー、Escキー）
  const finishLineDrawing = useCallback(() => {
    if (linePoints.length >= 2) {
      const newElement: CADElement = {
        id: Date.now().toString(),
        type: tool as any,
        layerId: activeLayer,
        points: linePoints,
        properties: {
          stroke: layers.find(l => l.id === activeLayer)?.color || '#000000',
          strokeWidth: 1
        }
      };
      
      setElements(prev => [...prev, newElement]);
    }
    
    // 線描画状態をリセット
    setIsLineDrawing(false);
    setLinePoints([]);
    setPreviewPoint(null);
  }, [linePoints, tool, activeLayer, layers]);

  // キーボードイベント
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isLineDrawing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishLineDrawing();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // 線描画をキャンセル
        setIsLineDrawing(false);
        setLinePoints([]);
        setPreviewPoint(null);
      }
    }
  }, [isLineDrawing, finishLineDrawing]);

  // キーボードイベントリスナー
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // パン終了
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // ダブルクリック検出（線描画終了）
    if (isLineDrawing && e.detail === 2) {
      finishLineDrawing();
      return;
    }
    
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    let finalPath: CADPoint[];
    
    // ツールごとに適切なポイント数に調整
    if (tool === 'line') {
      // 線分は開始点と終了点のみ
      finalPath = currentPath.length > 0 ? [currentPath[0], pos] : [pos];
    } else if (tool === 'circle') {
      // 円は中心点と外周点のみ
      finalPath = currentPath.length > 0 ? [currentPath[0], pos] : [pos];
    } else if (tool === 'point' || tool === 'survey_point' || tool === 'control_point') {
      // 点系は1点のみ
      finalPath = [pos];
    } else {
      // その他は全ポイント
      finalPath = [...currentPath, pos];
    }
    
    // 最低限のポイント数チェック
    const minPoints = (tool === 'point' || tool === 'survey_point' || tool === 'control_point') ? 1 : 
                     (tool === 'building_outline') ? 3 : 2;
    if (finalPath.length < minPoints) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    
    // 要素作成
    const baseProperties = {
      stroke: layers.find(l => l.id === activeLayer)?.color || '#000000',
      strokeWidth: tool === 'boundary_line' ? 2 : tool === 'traverse_line' ? 2 : 1
    };
    
    // ツール固有のプロパティを追加
    let additionalProperties = {};
    if (tool === 'survey_point' || tool === 'control_point') {
      additionalProperties = {
        pointNumber: `${tool === 'control_point' ? 'CP' : 'SP'}${elements.filter(e => e.type === tool).length + 1}`,
        accuracy: '±2mm'
      };
    } else if (tool === 'building_outline') {
      additionalProperties = {
        fill: 'rgba(128, 128, 128, 0.3)',
        buildingType: '建物'
      };
    } else if (tool === 'traverse_line') {
      // 簡易的な距離と方位角の計算
      if (finalPath.length >= 2) {
        const dx = finalPath[1].x - finalPath[0].x;
        const dy = finalPath[1].y - finalPath[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const azimuth = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
        
        additionalProperties = {
          distance,
          azimuth
        };
      }
    }
    
    const newElement: CADElement = {
      id: Date.now().toString(),
      type: tool as any,
      layerId: activeLayer,
      points: finalPath,
      properties: {
        ...baseProperties,
        ...additionalProperties
      }
    };
    
    setElements(prev => [...prev, newElement]);
    setIsDrawing(false);
    setCurrentPath([]);
  };
  
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.05));
  const handleZoomFit = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 用紙サイズを取得
    const currentSize = paperSettings.size;
    const paperWidth = paperSettings.orientation === 'landscape' 
      ? Math.max(currentSize.width, currentSize.height)
      : Math.min(currentSize.width, currentSize.height);
    const paperHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(currentSize.width, currentSize.height)
      : Math.max(currentSize.width, currentSize.height);
    
    // キャンバスサイズに用紙が収まるズーム倍率を計算
    const rect = canvas.getBoundingClientRect();
    const zoomX = (rect.width * 0.9) / paperWidth;
    const zoomY = (rect.height * 0.9) / paperHeight;
    const fitZoom = Math.min(zoomX, zoomY);
    
    // 用紙を画面中央に配置するパン値を計算
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const paperCenterX = (paperWidth * fitZoom) / 2;
    const paperCenterY = (paperHeight * fitZoom) / 2;
    
    setZoom(fitZoom);
    setPan({ 
      x: centerX - paperCenterX, 
      y: centerY - paperCenterY 
    });
  };

  // ツール変更時のリセット処理
  const handleToolChange = (newTool: string) => {
    // 線描画中の場合はリセット
    if (isLineDrawing) {
      setIsLineDrawing(false);
      setLinePoints([]);
      setPreviewPoint(null);
    }
    
    // ドラッグ描画中の場合もリセット
    if (isDrawing) {
      setIsDrawing(false);
      setCurrentPath([]);
    }
    
    setTool(newTool);
  };

  // マウスホイールズーム
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const mouseX = (e.clientX - rect.left) * dpr;
    const mouseY = (e.clientY - rect.top) * dpr;
    
    // ズーム倍率
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.05), 20);
    
    // マウス位置を中心にズーム（DPI調整済み座標を使用）
    const zoomRatio = newZoom / zoom;
    const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
    const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // CADデータ保存機能
  const saveCADData = useCallback(async () => {
    const cadData: CADData = {
      id: `cad_${Date.now()}`,
      projectId,
      name: `図面_${new Date().toLocaleDateString('ja-JP')}`,
      elements,
      layers,
      paperSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      metadata: {
        coordinateSystem: paperSettings.coordinateSystem || 9,
        scale: paperSettings.scale,
        units: 'meter',
        totalElements: elements.length,
        fileFormat: 'cloudcad'
      }
    };

    try {
      // ローカルストレージに保存
      const savedCADs = JSON.parse(localStorage.getItem('cloudcad_data') || '[]');
      const existingIndex = savedCADs.findIndex((cad: CADData) => cad.id === cadData.id);
      
      if (existingIndex >= 0) {
        savedCADs[existingIndex] = cadData;
      } else {
        savedCADs.push(cadData);
      }
      
      localStorage.setItem('cloudcad_data', JSON.stringify(savedCADs));
      
      // 親コンポーネントに通知
      if (onSave) {
        onSave(cadData);
      }
      
      console.log('CADデータが保存されました:', cadData.name);
    } catch (error) {
      console.error('CADデータの保存に失敗しました:', error);
    }
  }, [projectId, elements, layers, paperSettings, onSave]);

  // CADデータ読み込み機能（将来使用）
  // const loadCADData = useCallback(async (cadId: string) => {
  //   try {
  //     const savedCADs = JSON.parse(localStorage.getItem('cloudcad_data') || '[]');
  //     const cadData = savedCADs.find((cad: CADData) => cad.id === cadId);
  //     
  //     if (cadData) {
  //       setElements(cadData.elements || []);
  //       setLayers(cadData.layers || layers);
  //       setPaperSettings(cadData.paperSettings || paperSettings);
  //       console.log('CADデータが読み込まれました:', cadData.name);
  //     } else {
  //       console.error('指定されたCADデータが見つかりません');
  //     }
  //   } catch (error) {
  //     console.error('CADデータの読み込みに失敗しました:', error);
  //   }
  // }, [layers, paperSettings]);

  // JSON形式でエクスポート
  const exportToJSON = useCallback(() => {
    const exportData = {
      projectId,
      elements,
      layers,
      paperSettings,
      metadata: {
        exportedAt: new Date().toISOString(),
        coordinateSystem: paperSettings.coordinateSystem || 9,
        scale: paperSettings.scale,
        totalElements: elements.length,
        format: 'CloudCAD JSON v1.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudcad_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectId, elements, layers, paperSettings]);

  // JSON形式からインポート
  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.elements) {
          setElements(importData.elements);
        }
        if (importData.layers) {
          setLayers(importData.layers);
        }
        if (importData.paperSettings) {
          setPaperSettings(importData.paperSettings);
        }
        
        console.log('CADデータがインポートされました');
      } catch (error) {
        console.error('JSONファイルの読み込みに失敗しました:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  // DXFファイル形式でエクスポート
  const exportToDXF = useCallback(() => {
    const dxfContent: string[] = [];
    
    // DXFヘッダー
    dxfContent.push('0');
    dxfContent.push('SECTION');
    dxfContent.push('2');
    dxfContent.push('HEADER');
    dxfContent.push('9');
    dxfContent.push('$ACADVER');
    dxfContent.push('1');
    dxfContent.push('AC1015');
    dxfContent.push('0');
    dxfContent.push('ENDSEC');
    
    // テーブルセクション
    dxfContent.push('0');
    dxfContent.push('SECTION');
    dxfContent.push('2');
    dxfContent.push('TABLES');
    
    // レイヤーテーブル
    dxfContent.push('0');
    dxfContent.push('TABLE');
    dxfContent.push('2');
    dxfContent.push('LAYER');
    dxfContent.push('70');
    dxfContent.push(String(layers.length));
    
    layers.forEach(layer => {
      dxfContent.push('0');
      dxfContent.push('LAYER');
      dxfContent.push('2');
      dxfContent.push(layer.name);
      dxfContent.push('70');
      dxfContent.push('0');
      dxfContent.push('62');
      // 色をDXF色番号に変換（簡易版）
      const colorNum = layer.color === '#FF0000' ? 1 : 
                      layer.color === '#00FF00' ? 3 : 
                      layer.color === '#0000FF' ? 5 : 7;
      dxfContent.push(String(colorNum));
    });
    
    dxfContent.push('0');
    dxfContent.push('ENDTAB');
    dxfContent.push('0');
    dxfContent.push('ENDSEC');
    
    // エンティティセクション
    dxfContent.push('0');
    dxfContent.push('SECTION');
    dxfContent.push('2');
    dxfContent.push('ENTITIES');
    
    // 要素をDXF形式に変換
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      switch (element.type) {
        case 'line':
        case 'boundary_line':
        case 'contour_line':
          if (element.points.length >= 2) {
            for (let i = 0; i < element.points.length - 1; i++) {
              dxfContent.push('0');
              dxfContent.push('LINE');
              dxfContent.push('8');
              dxfContent.push(layer.name);
              dxfContent.push('10');
              dxfContent.push(String(element.points[i].x));
              dxfContent.push('20');
              dxfContent.push(String(element.points[i].y));
              dxfContent.push('11');
              dxfContent.push(String(element.points[i + 1].x));
              dxfContent.push('21');
              dxfContent.push(String(element.points[i + 1].y));
            }
          }
          break;
          
        case 'circle':
          if (element.points.length >= 2) {
            const center = element.points[0];
            const edge = element.points[1];
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );
            
            dxfContent.push('0');
            dxfContent.push('CIRCLE');
            dxfContent.push('8');
            dxfContent.push(layer.name);
            dxfContent.push('10');
            dxfContent.push(String(center.x));
            dxfContent.push('20');
            dxfContent.push(String(center.y));
            dxfContent.push('40');
            dxfContent.push(String(radius));
          }
          break;
          
        case 'point':
        case 'survey_point':
          if (element.points.length >= 1) {
            const point = element.points[0];
            dxfContent.push('0');
            dxfContent.push('POINT');
            dxfContent.push('8');
            dxfContent.push(layer.name);
            dxfContent.push('10');
            dxfContent.push(String(point.x));
            dxfContent.push('20');
            dxfContent.push(String(point.y));
          }
          break;
          
        case 'text':
          if (element.points.length >= 1 && element.properties.text) {
            const point = element.points[0];
            dxfContent.push('0');
            dxfContent.push('TEXT');
            dxfContent.push('8');
            dxfContent.push(layer.name);
            dxfContent.push('10');
            dxfContent.push(String(point.x));
            dxfContent.push('20');
            dxfContent.push(String(point.y));
            dxfContent.push('40');
            dxfContent.push(String(element.properties.fontSize || 12));
            dxfContent.push('1');
            dxfContent.push(element.properties.text);
          }
          break;
      }
    });
    
    dxfContent.push('0');
    dxfContent.push('ENDSEC');
    dxfContent.push('0');
    dxfContent.push('EOF');
    
    const blob = new Blob([dxfContent.join('\n')], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudcad_${new Date().toISOString().split('T')[0]}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, layers]);

  // OCF検定適合性チェック
  const validateOCFCompliance = useCallback((): { isCompliant: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    // 必須レイヤーのチェック
    const requiredLayers = ['S-BOUND', 'S-POINT', 'S-TEXT'];
    const presentLayers = layers.filter(l => l.visible).map(l => l.id);
    const missingLayers = requiredLayers.filter(layer => !presentLayers.includes(layer));
    
    if (missingLayers.length > 0) {
      issues.push(`必須レイヤーが未使用: ${missingLayers.join(', ')}`);
    }
    
    // 座標系のチェック
    if (!paperSettings.coordinateSystem || paperSettings.coordinateSystem < 1 || paperSettings.coordinateSystem > 19) {
      issues.push('有効な平面直角座標系が設定されていません');
    }
    
    // 縮尺のチェック
    const validScales = ['1:250', '1:500', '1:1000', '1:2500', '1:5000'];
    if (!validScales.includes(paperSettings.scale)) {
      issues.push('有効な縮尺が設定されていません');
    }
    
    // 測量点のチェック
    const surveyPoints = elements.filter(e => e.type === 'survey_point');
    if (surveyPoints.length < 3) {
      issues.push('測量点が3点未満です（3点以上必要）');
    }
    
    // 境界線のチェック
    const boundaryLines = elements.filter(e => e.type === 'boundary_line');
    if (boundaryLines.length === 0) {
      issues.push('境界線が含まれていません');
    }
    
    // 座標精度のチェック
    const pointsWithCoordinates = elements.filter(e => e.coordinates);
    if (pointsWithCoordinates.length > 0) {
      const lowPrecisionPoints = pointsWithCoordinates.filter(e => {
        const precision = Math.abs(e.coordinates!.realX % 1) > 0.1; // 0.1mm未満の精度をチェック
        return precision;
      });
      
      if (lowPrecisionPoints.length > 0) {
        issues.push(`低精度の座標が含まれています: ${lowPrecisionPoints.length}点`);
      }
    }
    
    return {
      isCompliant: issues.length === 0,
      issues
    };
  }, [elements, layers, paperSettings]);

  // OCF検定結果レポート生成
  const generateOCFReport = useCallback(() => {
    const validation = validateOCFCompliance();
    const reportData = {
      title: 'OCF検定適合性レポート',
      generatedAt: new Date().toISOString(),
      projectInfo: {
        coordinateSystem: `平面直角庩7標系第${paperSettings.coordinateSystem || 9}系`,
        scale: paperSettings.scale,
        paperSize: paperSettings.size.name,
        totalElements: elements.length
      },
      compliance: {
        status: validation.isCompliant ? '適合' : '非適合',
        issues: validation.issues
      },
      statistics: {
        surveyPoints: elements.filter(e => e.type === 'survey_point').length,
        boundaryLines: elements.filter(e => e.type === 'boundary_line').length,
        contourLines: elements.filter(e => e.type === 'contour_line').length,
        totalLayers: layers.filter(l => l.visible).length,
        coordinateAccuracy: 'ミリメートル精度'
      },
      recommendations: validation.isCompliant 
        ? ['すべてのOCF検定基準を満たしています。'] 
        : [
            '検出された問題を修正してください。',
            '測量点は3点以上配置してください。',
            '境界線を必ず含めてください。',
            '有効な平面直角座標系を設定してください。'
          ]
    };
    
    const reportContent = [
      `# ${reportData.title}`,
      '',
      `**生成日時:** ${new Date(reportData.generatedAt).toLocaleString('ja-JP')}`,
      '',
      '## プロジェクト情報',
      `- 座標系: ${reportData.projectInfo.coordinateSystem}`,
      `- 縮尺: ${reportData.projectInfo.scale}`,
      `- 用紙サイズ: ${reportData.projectInfo.paperSize}`,
      `- 総要素数: ${reportData.projectInfo.totalElements}`,
      '',
      '## 適合性チェック結果',
      `**ステータス:** ${reportData.compliance.status}`,
      '',
      reportData.compliance.issues.length > 0 ? '### 検出された問題' : '',
      ...reportData.compliance.issues.map(issue => `- ${issue}`),
      '',
      '## 統計情報',
      `- 測量点: ${reportData.statistics.surveyPoints}点`,
      `- 境界線: ${reportData.statistics.boundaryLines}本`,
      `- 等高線: ${reportData.statistics.contourLines}本`,
      `- 有効レイヤー: ${reportData.statistics.totalLayers}層`,
      `- 座標精度: ${reportData.statistics.coordinateAccuracy}`,
      '',
      '## 推奨事項',
      ...reportData.recommendations.map(rec => `- ${rec}`)
    ].join('\n');
    
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OCF検定レポート_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    return validation;
  }, [elements, layers, paperSettings, validateOCFCompliance]);

  // SXFファイル形式でエクスポート（OCF準拠）
  const exportToSXF = useCallback(() => {
    // SXFヘッダー情報
    const sxfHeader = {
      version: '3.1',
      coordinateSystem: paperSettings.coordinateSystem || 9,
      scale: paperSettings.scale,
      createdDate: new Date().toISOString().split('T')[0],
      creator: 'CloudCAD System'
    };
    
    // SXF準拠のレイヤー構造
    const sxfLayers = layers.map(layer => ({
      name: layer.id, // S-TOPO, S-STR等のOCF準拠レイヤー名
      description: layer.description,
      color: layer.color,
      visible: layer.visible,
      elements: elements.filter(e => e.layerId === layer.id)
    }));
    
    const sxfData = {
      header: sxfHeader,
      layers: sxfLayers,
      coordinateSystem: {
        epsg: `EPSG:${2443 + (paperSettings.coordinateSystem || 9) - 1}`, // 平面直角座標系のEPSGコード
        name: `平面直角座標系第${paperSettings.coordinateSystem || 9}系`,
        units: 'meters'
      },
      metadata: {
        totalElements: elements.length,
        paperSize: paperSettings.size,
        scale: paperSettings.scale,
        exportedAt: new Date().toISOString()
      }
    };
    
    // SXFフォーマット（簡易JSON版）としてエクスポート
    const blob = new Blob([JSON.stringify(sxfData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudcad_ocf_${new Date().toISOString().split('T')[0]}.sfc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, layers, paperSettings]);

  // DXFファイルからインポート
  const importFromDXF = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dxfContent = e.target?.result as string;
        const lines = dxfContent.split('\n');
        
        const importedElements: CADElement[] = [];
        let currentEntity: any = null;
        let currentLayer = 'S-BOUND';
        
        for (let i = 0; i < lines.length; i++) {
          const code = lines[i].trim();
          const value = lines[i + 1]?.trim();
          
          if (code === '0' && value) {
            // 新しいエンティティの開始
            if (currentEntity) {
              // 前のエンティティを処理
              if (currentEntity.type === 'LINE' && currentEntity.x1 !== undefined) {
                importedElements.push({
                  id: Date.now().toString() + Math.random(),
                  type: 'line',
                  layerId: currentLayer,
                  points: [
                    { x: currentEntity.x1, y: currentEntity.y1 },
                    { x: currentEntity.x2, y: currentEntity.y2 }
                  ],
                  properties: {
                    stroke: '#000000',
                    strokeWidth: 1
                  }
                });
              } else if (currentEntity.type === 'CIRCLE' && currentEntity.centerX !== undefined) {
                const centerX = currentEntity.centerX;
                const centerY = currentEntity.centerY;
                const radius = currentEntity.radius;
                importedElements.push({
                  id: Date.now().toString() + Math.random(),
                  type: 'circle',
                  layerId: currentLayer,
                  points: [
                    { x: centerX, y: centerY },
                    { x: centerX + radius, y: centerY }
                  ],
                  properties: {
                    stroke: '#000000',
                    strokeWidth: 1
                  }
                });
              }
            }
            
            currentEntity = { type: value };
          } else if (code === '8' && value) {
            // レイヤー名
            currentLayer = layers.find(l => l.name === value)?.id || 'S-BOUND';
          } else if (currentEntity) {
            // エンティティの属性
            switch (code) {
              case '10': 
                if (currentEntity.type === 'CIRCLE') {
                  currentEntity.centerX = parseFloat(value);
                } else {
                  currentEntity.x1 = parseFloat(value);
                }
                break;
              case '20': 
                if (currentEntity.type === 'CIRCLE') {
                  currentEntity.centerY = parseFloat(value);
                } else {
                  currentEntity.y1 = parseFloat(value);
                }
                break;
              case '11': currentEntity.x2 = parseFloat(value); break;
              case '21': currentEntity.y2 = parseFloat(value); break;
              case '40': currentEntity.radius = parseFloat(value); break;
            }
          }
          
          i++; // 値の行もスキップ
        }
        
        if (importedElements.length > 0) {
          setElements(prev => [...prev, ...importedElements]);
          console.log(`${importedElements.length}個の要素をDXFファイルからインポートしました`);
        }
      } catch (error) {
        console.error('DXFファイルの読み込みに失敗しました:', error);
      }
    };
    reader.readAsText(file);
  }, [layers]);

  // 座標系変換関数（平面直角座標系 ⇔ 経緯度）
  const coordinateTransform = {
    // 平面直角座標系から経緯度への変換（簡易版）
    planeToGeographic: (x: number, y: number, systemNumber: number = 9): { lat: number, lon: number } => {
      // 各座標系の原点情報（簡易版）
      const origins = {
        1: { lat: 33.0, lon: 129.5 },
        2: { lat: 33.0, lon: 131.0 },
        3: { lat: 36.0, lon: 132.16666667 },
        4: { lat: 33.0, lon: 133.5 },
        5: { lat: 36.0, lon: 134.33333333 },
        6: { lat: 36.0, lon: 136.0 },
        7: { lat: 36.0, lon: 137.16666667 },
        8: { lat: 36.0, lon: 138.5 },
        9: { lat: 36.0, lon: 139.83333333 }, // 東京都
        10: { lat: 40.0, lon: 140.83333333 },
        11: { lat: 26.0, lon: 142.25 },
        12: { lat: 44.0, lon: 142.25 },
        13: { lat: 44.0, lon: 144.25 },
        14: { lat: 44.0, lon: 146.0 },
        15: { lat: 26.0, lon: 127.5 },
        16: { lat: 26.0, lon: 124.0 },
        17: { lat: 26.0, lon: 125.0 },
        18: { lat: 20.0, lon: 136.0 },
        19: { lat: 26.0, lon: 154.0 }
      };
      
      const origin = origins[systemNumber as keyof typeof origins] || origins[9];
      
      // 簡易変換（実際にはより複雑な計算が必要）
      const latOffset = y / 111320; // 1度≈111.32km
      const lonOffset = x / (111320 * Math.cos(origin.lat * Math.PI / 180));
      
      return {
        lat: origin.lat + latOffset,
        lon: origin.lon + lonOffset
      };
    },
    
    // 経緯度から平面直角座標系への変換（簡易版）
    geographicToPlane: (lat: number, lon: number, systemNumber: number = 9): { x: number, y: number } => {
      const origins = {
        1: { lat: 33.0, lon: 129.5 },
        2: { lat: 33.0, lon: 131.0 },
        3: { lat: 36.0, lon: 132.16666667 },
        4: { lat: 33.0, lon: 133.5 },
        5: { lat: 36.0, lon: 134.33333333 },
        6: { lat: 36.0, lon: 136.0 },
        7: { lat: 36.0, lon: 137.16666667 },
        8: { lat: 36.0, lon: 138.5 },
        9: { lat: 36.0, lon: 139.83333333 },
        10: { lat: 40.0, lon: 140.83333333 },
        11: { lat: 26.0, lon: 142.25 },
        12: { lat: 44.0, lon: 142.25 },
        13: { lat: 44.0, lon: 144.25 },
        14: { lat: 44.0, lon: 146.0 },
        15: { lat: 26.0, lon: 127.5 },
        16: { lat: 26.0, lon: 124.0 },
        17: { lat: 26.0, lon: 125.0 },
        18: { lat: 20.0, lon: 136.0 },
        19: { lat: 26.0, lon: 154.0 }
      };
      
      const origin = origins[systemNumber as keyof typeof origins] || origins[9];
      
      const latDiff = lat - origin.lat;
      const lonDiff = lon - origin.lon;
      
      const y = latDiff * 111320;
      const x = lonDiff * 111320 * Math.cos(origin.lat * Math.PI / 180);
      
      return { x, y };
    },
    
    // 座標の表示形式変換
    formatCoordinate: (x: number, y: number, mode: 'plane' | 'geographic', systemNumber: number = 9): string => {
      if (mode === 'geographic') {
        const { lat, lon } = coordinateTransform.planeToGeographic(x, y, systemNumber);
        return `${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E`;
      } else {
        return `X: ${x.toFixed(3)}m, Y: ${y.toFixed(3)}m`;
      }
    }
  };

  // 座標表示モード切り替え
  const toggleCoordinateDisplay = useCallback(() => {
    setCoordinateDisplayMode(prev => prev === 'plane' ? 'geographic' : 'plane');
  }, []);

  // 精度管理機能
  const precisionManager = {
    // 座標の丸め処理
    roundCoordinate: (value: number): number => {
      return Math.round(value / precisionSettings.coordinatePrecision) * precisionSettings.coordinatePrecision;
    },
    
    // 角度の丸め処理
    roundAngle: (value: number): number => {
      return Math.round(value / precisionSettings.anglePrecision) * precisionSettings.anglePrecision;
    },
    
    // 距離の丸め処理
    roundDistance: (value: number): number => {
      return Math.round(value / precisionSettings.distancePrecision) * precisionSettings.distancePrecision;
    },
    
    // 標高の丸め処理
    roundElevation: (value: number): number => {
      return Math.round(value / precisionSettings.elevationPrecision) * precisionSettings.elevationPrecision;
    },
    
    // 精度等級を数値に変換
    getAccuracyValue: (grade: 'A' | 'B' | 'C'): number => {
      switch (grade) {
        case 'A': return 0.05; // ±5cm
        case 'B': return 0.10; // ±10cm
        case 'C': return 0.20; // ±20cm
        default: return 0.10;
      }
    },
    
    // 要素の精度検証
    validateElementPrecision: (element: CADElement): { isValid: boolean; issues: string[] } => {
      const issues: string[] = [];
      
      // 座標精度チェック
      element.points.forEach((point, index) => {
        const roundedX = precisionManager.roundCoordinate(point.x);
        const roundedY = precisionManager.roundCoordinate(point.y);
        
        if (Math.abs(point.x - roundedX) > 0.0001 || Math.abs(point.y - roundedY) > 0.0001) {
          issues.push(`点${index + 1}の座標精度が不十分です`);
        }
      });
      
      // 測量点の特別チェック
      if (element.type === 'survey_point' || element.type === 'control_point') {
        if (!element.coordinates) {
          issues.push('測量点に実座標が設定されていません');
        } else {
          const accuracy = precisionManager.getAccuracyValue(precisionSettings.qualityGrade);
          if (!element.properties.accuracy || parseFloat(element.properties.accuracy.replace(/[^±\d.]/g, '')) > accuracy) {
            issues.push(`精度等級${precisionSettings.qualityGrade}の基準を満たしていません`);
          }
        }
      }
      
      return {
        isValid: issues.length === 0,
        issues
      };
    },
    
    // 全要素の精度検証
    validateAllElements: (): { totalIssues: number; elementIssues: { [key: string]: string[] } } => {
      const elementIssues: { [key: string]: string[] } = {};
      let totalIssues = 0;
      
      elements.forEach(element => {
        const validation = precisionManager.validateElementPrecision(element);
        if (!validation.isValid) {
          elementIssues[element.id] = validation.issues;
          totalIssues += validation.issues.length;
        }
      });
      
      return { totalIssues, elementIssues };
    }
  };

  // ベクトルデータのエクスポート（SVG形式）
  const exportToSVG = useCallback(() => {
    const svgElements: string[] = [];
    
    // SVGヘッダー
    const svgWidth = paperSettings.size.width;
    const svgHeight = paperSettings.size.height;
    svgElements.push(`<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">`);
    
    // 背景
    svgElements.push(`<rect width="${svgWidth}" height="${svgHeight}" fill="white"/>`);
    
    // 各要素をSVG形式に変換
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      switch (element.type) {
        case 'line':
        case 'boundary_line':
        case 'contour_line':
          if (element.points.length >= 2) {
            const pathData = element.points.map((point, index) => {
              return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
            }).join(' ');
            svgElements.push(`<path d="${pathData}" stroke="${element.properties.stroke}" stroke-width="${element.properties.strokeWidth}" fill="none"/>`);
          }
          break;
          
        case 'circle':
          if (element.points.length >= 2) {
            const center = element.points[0];
            const edge = element.points[1];
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );
            svgElements.push(`<circle cx="${center.x}" cy="${center.y}" r="${radius}" stroke="${element.properties.stroke}" stroke-width="${element.properties.strokeWidth}" fill="${element.properties.fill || 'none'}"/>`);
          }
          break;
          
        case 'point':
        case 'survey_point':
          if (element.points.length >= 1) {
            const point = element.points[0];
            svgElements.push(`<circle cx="${point.x}" cy="${point.y}" r="3" fill="${element.properties.stroke}"/>`);
            svgElements.push(`<line x1="${point.x - 8}" y1="${point.y}" x2="${point.x + 8}" y2="${point.y}" stroke="${element.properties.stroke}" stroke-width="2"/>`);
            svgElements.push(`<line x1="${point.x}" y1="${point.y - 8}" x2="${point.x}" y2="${point.y + 8}" stroke="${element.properties.stroke}" stroke-width="2"/>`);
          }
          break;
          
        case 'text':
          if (element.points.length >= 1 && element.properties.text) {
            const point = element.points[0];
            svgElements.push(`<text x="${point.x}" y="${point.y}" font-size="${element.properties.fontSize || 12}" fill="${element.properties.stroke}">${element.properties.text}</text>`);
          }
          break;
      }
    });
    
    svgElements.push('</svg>');
    
    const blob = new Blob([svgElements.join('\n')], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudcad_vector_${new Date().toISOString().split('T')[0]}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, layers, paperSettings]);

  return (
    <Box h="100vh" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Paper shadow="sm" p="sm" withBorder>
        <Group justify="space-between">
          <Group>
            
            {/* 選択ツール */}
            <Group gap="xs">
              <Tooltip label="選択">
                <ActionIcon
                  variant={tool === 'pointer' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('pointer')}
                >
                  <IconPointer size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="線分 (クリック方式)">
                <ActionIcon
                  variant={tool === 'line' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('line')}
                >
                  <IconLine size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="円">
                <ActionIcon
                  variant={tool === 'circle' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('circle')}
                >
                  <IconCircle size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="基準点">
                <ActionIcon
                  variant={tool === 'point' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('point')}
                >
                  <IconSquare size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="測量点">
                <ActionIcon
                  variant={tool === 'survey_point' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('survey_point')}
                >
                  <IconTarget size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="境界線 (クリック方式)">
                <ActionIcon
                  variant={tool === 'boundary_line' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('boundary_line')}
                >
                  <IconMapPin size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="等高線 (クリック方式)">
                <ActionIcon
                  variant={tool === 'contour_line' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('contour_line')}
                >
                  <IconMountain size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="トラバース線">
                <ActionIcon
                  variant={tool === 'traverse_line' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('traverse_line')}
                >
                  <IconCompass size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="制御点">
                <ActionIcon
                  variant={tool === 'control_point' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('control_point')}
                >
                  <IconLocation size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="建物輪郭">
                <ActionIcon
                  variant={tool === 'building_outline' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('building_outline')}
                >
                  <IconBuildingBridge size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="文字">
                <ActionIcon
                  variant={tool === 'text' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('text')}
                >
                  <IconTypography size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="コメント">
                <ActionIcon
                  variant={tool === 'comment' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('comment')}
                >
                  <IconMessage size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="寸法">
                <ActionIcon
                  variant={tool === 'dimension' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('dimension')}
                >
                  <IconRuler2 size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            
            <Divider orientation="vertical" />
            
            {/* 表示設定 */}
            <Group gap="xs">
              <Tooltip label="グリッド表示">
                <ActionIcon
                  variant={showGrid ? 'filled' : 'light'}
                  onClick={() => setShowGrid(!showGrid)}
                >
                  <IconGrid3x3 size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="グリッドスナップ">
                <ActionIcon
                  variant={snapToGrid ? 'filled' : 'light'}
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  disabled={!showGrid}
                >
                  <IconGrid3x3 size={18} />
                </ActionIcon>
              </Tooltip>
              <Menu shadow="md" width={250} opened={showSnapMenu} onChange={setShowSnapMenu}>
                <Menu.Target>
                  <Tooltip label="オブジェクトスナップ設定">
                    <ActionIcon
                      variant={snapToObjects ? 'filled' : 'light'}
                      onClick={(e) => {
                        if (e.button === 0) { // 左クリック
                          setSnapToObjects(!snapToObjects);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowSnapMenu(true);
                      }}
                    >
                      <IconTarget size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>スナップタイプ選択</Menu.Label>
                  <Menu.Item
                    leftSection={
                      <Checkbox
                        checked={snapTypes.endpoint}
                        onChange={() => setSnapTypes(prev => ({ ...prev, endpoint: !prev.endpoint }))}
                        size="xs"
                      />
                    }
                    onClick={() => setSnapTypes(prev => ({ ...prev, endpoint: !prev.endpoint }))}
                  >
                    端点
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <Checkbox
                        checked={snapTypes.intersection}
                        onChange={() => setSnapTypes(prev => ({ ...prev, intersection: !prev.intersection }))}
                        size="xs"
                      />
                    }
                    onClick={() => setSnapTypes(prev => ({ ...prev, intersection: !prev.intersection }))}
                  >
                    交点
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <Checkbox
                        checked={snapTypes.perpendicular}
                        onChange={() => setSnapTypes(prev => ({ ...prev, perpendicular: !prev.perpendicular }))}
                        size="xs"
                      />
                    }
                    onClick={() => setSnapTypes(prev => ({ ...prev, perpendicular: !prev.perpendicular }))}
                  >
                    垂線
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <Checkbox
                        checked={snapTypes.online}
                        onChange={() => setSnapTypes(prev => ({ ...prev, online: !prev.online }))}
                        size="xs"
                      />
                    }
                    onClick={() => setSnapTypes(prev => ({ ...prev, online: !prev.online }))}
                  >
                    線上
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <Checkbox
                        checked={snapTypes.center}
                        onChange={() => setSnapTypes(prev => ({ ...prev, center: !prev.center }))}
                        size="xs"
                      />
                    }
                    onClick={() => setSnapTypes(prev => ({ ...prev, center: !prev.center }))}
                  >
                    円中心
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    onClick={() => {
                      const allEnabled = Object.values(snapTypes).every(v => v);
                      const newValue = !allEnabled;
                      setSnapTypes({
                        endpoint: newValue,
                        intersection: newValue,
                        perpendicular: newValue,
                        online: newValue,
                        center: newValue
                      });
                    }}
                  >
                    {Object.values(snapTypes).every(v => v) ? '全て無効' : '全て有効'}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Tooltip label="レイヤー">
                <ActionIcon
                  variant="light"
                  onClick={() => setShowLayerModal(true)}
                >
                  <IconLayersOff size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="用紙設定">
                <ActionIcon
                  variant="light"
                  onClick={() => {
                    console.log('用紙設定ボタンがクリックされました');
                    setShowPaperModal(true);
                  }}
                >
                  <IconFileText size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            
            <Divider orientation="vertical" />
            
            {/* ズーム */}
            <Group gap="xs">
              <Tooltip label="拡大">
                <ActionIcon variant="light" onClick={handleZoomIn}>
                  <IconZoomIn size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="縮小">
                <ActionIcon variant="light" onClick={handleZoomOut}>
                  <IconZoomOut size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="全体表示">
                <ActionIcon variant="light" onClick={handleZoomFit}>
                  <IconHome size={18} />
                </ActionIcon>
              </Tooltip>
              <Text size="sm" style={{ minWidth: '80px', textAlign: 'center' }}>
                {zoom >= 1 ? `${(zoom * 100).toFixed(0)}%` : `${(zoom * 100).toFixed(1)}%`}
              </Text>
            </Group>
          </Group>
          
          <Group>
            <Select
              data={layers.filter(l => l.visible).map(l => ({ value: l.id, label: l.name }))}
              value={activeLayer}
              onChange={(value) => setActiveLayer(value || 'boundary')}
              placeholder="作業レイヤー"
              w={150}
              styles={{
                dropdown: { zIndex: 1001 }
              }}
            />
            <Group gap="xs">
              <Button 
                leftSection={<IconDeviceFloppy size={16} />} 
                size="sm"
                onClick={saveCADData}
              >
                保存
              </Button>
              <Select
                placeholder="操作"
                size="sm"
                w={120}
                data={[
                  { value: 'export-json', label: 'JSON出力' },
                  { value: 'export-svg', label: 'SVG出力' },
                  { value: 'export-dxf', label: 'DXF出力' },
                  { value: 'export-sxf', label: 'SXF出力' },
                  { value: 'export-p21', label: 'P21出力' },
                  { value: 'export-sxf-binary', label: 'SXFバイナリ出力' },
                  { value: 'ocf-validate', label: 'OCF検定' },
                  { value: 'ocf-report', label: 'OCFレポート' },
                  { value: 'import-json', label: 'JSON読込' },
                  { value: 'import-dxf', label: 'DXF読込' },
                  { value: 'import-sxf', label: 'SXF/P21読込' }
                ]}
                onChange={(value) => {
                  if (value === 'export-json') {
                    exportToJSON();
                  } else if (value === 'export-svg') {
                    exportToSVG();
                  } else if (value === 'export-dxf') {
                    exportToDXF();
                  } else if (value === 'export-sxf') {
                    exportToSXF();
                  } else if (value === 'ocf-validate') {
                    const validation = validateOCFCompliance();
                    const message = validation.isCompliant 
                      ? 'OCF検定に適合しています。'
                      : `OCF検定に非適合です。\n\n問題:\n${validation.issues.join('\n')}`;
                    alert(message);
                  } else if (value === 'ocf-report') {
                    generateOCFReport();
                  } else if (value === 'import-json') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        importFromJSON(file);
                      }
                    };
                    input.click();
                  } else if (value === 'import-dxf') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.dxf';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        importFromDXF(file);
                      }
                    };
                    input.click();
                  } else if (value === 'import-sxf') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.sxf,.p21';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleImportSXF(file);
                      }
                    };
                    input.click();
                  } else if (value === 'export-p21') {
                    handleExportP21();
                  } else if (value === 'export-sxf-binary') {
                    handleExportSXF();
                  }
                }}
                styles={{
                  dropdown: { zIndex: 1001 }
                }}
              />
            </Group>
            <Button variant="light" size="sm" onClick={onClose}>
              閉じる
            </Button>
          </Group>
        </Group>
      </Paper>
      
      {/* タブ構造 */}
      <Tabs value={activeTab} onChange={setActiveTab} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs.List>
          <Tabs.Tab value="cad" leftSection={<IconSettings size={16} />}>
            CAD編集
          </Tabs.Tab>
          <Tabs.Tab value="coordinate" leftSection={<IconMapPins size={16} />}>
            座標編集
          </Tabs.Tab>
          <Tabs.Tab value="lot" leftSection={<IconNumbers size={16} />}>
            地番編集
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="cad" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* ページ管理 */}
          <Paper shadow="sm" p="sm" mb="sm" withBorder>
            <Group gap="xs">
              <Text size="sm" fw={600}>ページ管理:</Text>
              <Tooltip label="新しいページを追加">
                <ActionIcon variant="filled" color="green" onClick={addNewPage}>
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="現在のページを削除">
                <ActionIcon 
                  variant="filled"
                  color="red"
                  onClick={() => deletePage(currentPageId)}
                  disabled={pages.length <= 1}
                >
                  <IconMinus size={16} />
                </ActionIcon>
              </Tooltip>
              <Select
                data={pages.map(page => ({ value: page.id, label: page.name }))}
                value={currentPageId}
                onChange={(value) => value && setCurrentPageId(value)}
                placeholder="ページ選択"
                w={150}
                size="xs"
              />
              <Text size="xs" c="dimmed">
                {pages.findIndex(p => p.id === currentPageId) + 1} / {pages.length}
              </Text>
            </Group>
          </Paper>
          
          {/* CAD編集メインキャンバス */}
          <Box style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: isPanning ? 'grabbing' : 
                    (currentSnapPoint ? 'crosshair' : 
                     (tool === 'pointer' ? 'grab' : 'crosshair')),
            background: '#ffffff',
            display: 'block', // キャンバスの位置ずれを防ぐ
            touchAction: 'none' // タッチデバイスでのスクロールを防ぐ
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {/* ステータスバー */}
        <Paper
          shadow="sm"
          p="xs"
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10
          }}
        >
          <Group justify="space-between">
            <Group gap="lg">
              <Group gap="sm">
                <Text size="sm">座標系: 平面直角座標系第{paperSettings.coordinateSystem || 9}系</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={toggleCoordinateDisplay}
                >
                  {coordinateDisplayMode === 'plane' ? '経緯度表示' : '平面座標表示'}
                </Button>
              </Group>
              <Text size="sm">縮尺: {paperSettings.scale}</Text>
              <Text size="sm">要素数: {elements.length}</Text>
              <Group gap="xs">
                <Text size="sm">OCF準拠</Text>
                <Badge 
                  color={validateOCFCompliance().isCompliant ? 'green' : 'red'} 
                  size="sm"
                >
                  {validateOCFCompliance().isCompliant ? '適合' : '非適合'}
                </Badge>
              </Group>
            </Group>
            <Group gap="lg">
              <Text size="sm">選択ツール: {
                tool === 'pointer' ? '選択' :
                tool === 'line' ? '線分' :
                tool === 'circle' ? '円' :
                tool === 'point' ? '基準点' :
                tool === 'survey_point' ? '測量点' :
                tool === 'boundary_line' ? '境界線' :
                tool === 'contour_line' ? '等高線' :
                tool === 'traverse_line' ? 'トラバース線' :
                tool === 'control_point' ? '制御点' :
                tool === 'building_outline' ? '建物輪郭' :
                tool
              }</Text>
              <Text size="xs" c="dimmed">モーダル: {showPaperModal ? 'ON' : 'OFF'}</Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => setShowCoordinateInput(true)}
              >
                座標入力
              </Button>
            </Group>
          </Group>
        </Paper>
      </Box>
      
      {/* レイヤー管理モーダル */}
      {showLayerModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowLayerModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>レイヤー管理</h3>
            <Stack>
              {layers.map(layer => (
                <Paper key={layer.id} p="sm" withBorder>
                  <Group justify="space-between">
                    <Group>
                      <ActionIcon
                        variant="light"
                        onClick={() => {
                          setLayers(prev => prev.map(l => 
                            l.id === layer.id ? { ...l, visible: !l.visible } : l
                          ));
                        }}
                      >
                        {layer.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                      </ActionIcon>
                      <Stack gap={0}>
                        <Text fw={500}>{layer.name}</Text>
                        <Text size="xs" c="dimmed">{layer.description}</Text>
                      </Stack>
                    </Group>
                    <Group>
                      <ColorInput
                        value={layer.color}
                        onChange={(color) => {
                          setLayers(prev => prev.map(l => 
                            l.id === layer.id ? { ...l, color } : l
                          ));
                        }}
                        size="sm"
                        w={60}
                        styles={{
                          dropdown: { zIndex: 1001 }
                        }}
                      />
                      <Badge
                        variant={activeLayer === layer.id ? 'filled' : 'light'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setActiveLayer(layer.id)}
                      >
                        {activeLayer === layer.id ? '作業中' : '選択'}
                      </Badge>
                    </Group>
                  </Group>
                </Paper>
              ))}
              <Button onClick={() => setShowLayerModal(false)}>閉じる</Button>
            </Stack>
          </div>
        </div>
      )}
      
      {/* 座標入力モーダル */}
      {showCoordinateInput && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowCoordinateInput(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>座標入力</h3>
            <Stack>
              <Group justify="space-between">
                <Text size="sm">入力モード:</Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setCoordinateDisplayMode(prev => prev === 'plane' ? 'geographic' : 'plane')}
                >
                  {coordinateDisplayMode === 'plane' ? '平面座標' : '経緯度'}
                </Button>
              </Group>
              
              {coordinateDisplayMode === 'plane' ? (
                <>
                  <NumberInput
                    label="X座標 (メートル)"
                    value={coordinateInput.x}
                    onChange={(value) => setCoordinateInput(prev => ({ ...prev, x: Number(value) || 0 }))}
                    decimalScale={3}
                    step={0.001}
                  />
                  <NumberInput
                    label="Y座標 (メートル)"
                    value={coordinateInput.y}
                    onChange={(value) => setCoordinateInput(prev => ({ ...prev, y: Number(value) || 0 }))}
                    decimalScale={3}
                    step={0.001}
                  />
                </>
              ) : (
                <>
                  <NumberInput
                    label="緯度 (度)"
                    value={coordinateInput.y / 111320 + 36} // 簡易変換での表示
                    onChange={(value) => {
                      const lat = Number(value) || 36;
                      const y = (lat - 36) * 111320;
                      setCoordinateInput(prev => ({ ...prev, y }));
                    }}
                    decimalScale={6}
                    step={0.000001}
                  />
                  <NumberInput
                    label="経度 (度)"
                    value={coordinateInput.x / (111320 * Math.cos(36 * Math.PI / 180)) + 139.83333333} // 簡易変換での表示
                    onChange={(value) => {
                      const lon = Number(value) || 139.83333333;
                      const x = (lon - 139.83333333) * 111320 * Math.cos(36 * Math.PI / 180);
                      setCoordinateInput(prev => ({ ...prev, x }));
                    }}
                    decimalScale={6}
                    step={0.000001}
                  />
                </>
              )}
              
              <Text size="xs" c="dimmed">
                {coordinateDisplayMode === 'plane' 
                  ? coordinateTransform.formatCoordinate(coordinateInput.x, coordinateInput.y, 'geographic', paperSettings.coordinateSystem || 9)
                  : coordinateTransform.formatCoordinate(coordinateInput.x, coordinateInput.y, 'plane', paperSettings.coordinateSystem || 9)
                }
              </Text>
              
              <Button
                onClick={() => {
                  // 座標入力による点配置
                  const newElement: CADElement = {
                    id: Date.now().toString(),
                    type: 'survey_point',
                    layerId: activeLayer,
                    points: [{ x: coordinateInput.x, y: coordinateInput.y }],
                    properties: {
                      stroke: layers.find(l => l.id === activeLayer)?.color || '#FF0000',
                      strokeWidth: 2,
                      pointNumber: `P${elements.filter(e => e.type === 'survey_point').length + 1}`
                    },
                    coordinates: {
                      realX: coordinateInput.x * 1000, // メートルからミリメートルに変換
                      realY: coordinateInput.y * 1000,
                      realZ: 0
                    }
                  };
                  
                  setElements(prev => [...prev, newElement]);
                  setShowCoordinateInput(false);
                  console.log('座標入力による測量点を配置しました:', coordinateTransform.formatCoordinate(coordinateInput.x, coordinateInput.y, coordinateDisplayMode, paperSettings.coordinateSystem || 9));
                }}
              >
                測量点を配置
              </Button>
            </Stack>
          </div>
        </div>
      )}
      
      {/* 用紙設定モーダル */}
      {showPaperModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowPaperModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>用紙設定</h3>
            
            <Stack>
              <Select
                label="用紙サイズ"
                value={paperSettings.size.id}
                onChange={(value) => {
                  const size = paperSizes.find(p => p.id === value);
                  if (size) {
                    setPaperSettings(prev => ({ ...prev, size }));
                  }
                }}
                data={paperSizes.map(size => ({ value: size.id, label: `${size.name} (${size.width}×${size.height}mm)` }))}
                styles={{
                  dropdown: { zIndex: 1001 }
                }}
              />
              
              <Group grow>
                <Select
                  label="向き"
                  value={paperSettings.orientation}
                  onChange={(value) => setPaperSettings(prev => ({ 
                    ...prev, 
                    orientation: value as 'portrait' | 'landscape' 
                  }))}
                  data={[
                    { value: 'portrait', label: '縦向き' },
                    { value: 'landscape', label: '横向き' }
                  ]}
                  styles={{
                    dropdown: { zIndex: 1001 }
                  }}
                />
                <Button
                  variant="light"
                  leftSection={<IconRotate size={16} />}
                  onClick={() => setPaperSettings(prev => ({
                    ...prev,
                    orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait'
                  }))}
                >
                  回転
                </Button>
              </Group>
              
              <Select
                label="平面直角座標系"
                value={paperSettings.coordinateSystem?.toString()}
                onChange={(value) => setPaperSettings(prev => ({ 
                  ...prev, 
                  coordinateSystem: parseInt(value || '9') 
                }))}
                data={[
                  { value: '1', label: '1系 (長崎・鹿児島)' },
                  { value: '2', label: '2系 (福岡・佐賀・熊本・大分・宮崎)' },
                  { value: '3', label: '3系 (山口・島根・広島)' },
                  { value: '4', label: '4系 (香川・愛媛・徳島・高知)' },
                  { value: '5', label: '5系 (兵庫・鳥取・岡山)' },
                  { value: '6', label: '6系 (京都・大阪・奈良・和歌山)' },
                  { value: '7', label: '7系 (滋賀・三重)' },
                  { value: '8', label: '8系 (愛知・岐阜)' },
                  { value: '9', label: '9系 (東京・埼玉・千葉・茨城・栃木・群馬・福島)' },
                  { value: '10', label: '10系 (青森・秋田・山形・岩手・宮城)' },
                  { value: '11', label: '11系 (小笠原)' },
                  { value: '12', label: '12系 (北海道西部)' },
                  { value: '13', label: '13系 (北海道中央)' },
                  { value: '14', label: '14系 (北海道東部)' },
                  { value: '15', label: '15系 (沖縄)' },
                  { value: '16', label: '16系 (沖縄西部)' },
                  { value: '17', label: '17系 (沖縄西南部)' },
                  { value: '18', label: '18系 (沖縄南部)' },
                  { value: '19', label: '19系 (沖縄北部)' }
                ]}
                styles={{
                  dropdown: { zIndex: 1001 }
                }}
              />
              
              <Group justify="space-between">
                <Text size="sm">用紙枠を表示</Text>
                <Button
                  variant={paperSettings.showBorder ? 'filled' : 'light'}
                  size="sm"
                  onClick={() => setPaperSettings(prev => ({ 
                    ...prev, 
                    showBorder: !prev.showBorder 
                  }))}
                >
                  {paperSettings.showBorder ? 'ON' : 'OFF'}
                </Button>
              </Group>
              
              <Button onClick={() => setShowPaperModal(false)}>閉じる</Button>
            </Stack>
          </div>
        </div>
      )}

      {/* コメント入力モーダル */}
      <Modal
        opened={showCommentInput}
        onClose={handleCancelComment}
        title="コメントを追加"
        centered
      >
        <Stack>
          <Textarea
            label="コメント内容"
            placeholder="コメントを入力してください..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            minRows={3}
            maxRows={6}
            autoFocus
          />
          
          <Group justify="flex-end">
            <Button variant="light" onClick={handleCancelComment}>
              キャンセル
            </Button>
            <Button 
              onClick={handleAddComment}
              disabled={!commentText.trim()}
            >
              追加
            </Button>
          </Group>
        </Stack>
      </Modal>
        </Tabs.Panel>

        <Tabs.Panel value="coordinate" style={{ flex: 1, padding: '20px' }}>
          {/* 座標編集パネル */}
          <Stack>
            <Group justify="space-between">
              <Text size="lg" fw={600}>座標管理</Text>
              <Button leftSection={<IconPlus size={16} />} onClick={handleAddCoordinate}>
                座標点追加
              </Button>
            </Group>
            
            <Paper withBorder p="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">測量基準点・境界点の座標データを管理します</Text>
                  <Group>
                    <Button variant="light" size="sm">CSV インポート</Button>
                    <Button variant="light" size="sm">CSV エクスポート</Button>
                    <Button variant="light" size="sm">座標変換</Button>
                  </Group>
                </Group>
                
                {/* 座標一覧テーブル */}
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>点名</Table.Th>
                      <Table.Th>種類</Table.Th>
                      <Table.Th>X座標 (m)</Table.Th>
                      <Table.Th>Y座標 (m)</Table.Th>
                      <Table.Th>標高 (m)</Table.Th>
                      <Table.Th>精度</Table.Th>
                      <Table.Th>測量者</Table.Th>
                      <Table.Th>測量日</Table.Th>
                      <Table.Th>操作</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {coordinateData.map((coord) => (
                      <Table.Tr key={coord.id}>
                        <Table.Td>
                          <Text fw={600}>{coord.pointName}</Text>
                          <Text size="xs" c="dimmed">{coord.description}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={getTypeBadgeColor(coord.type)} variant="light">
                            {getTypeLabel(coord.type)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>
                            {coord.x?.toFixed(3)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>
                            {coord.y?.toFixed(3)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" style={{ fontFamily: 'monospace' }}>
                            {coord.z?.toFixed(3)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{coord.accuracy}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{coord.surveyor}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{coord.surveyDate}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handleEditCoordinate(coord)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => handleDeleteCoordinate(coord.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                
                <Group justify="center">
                  <Text size="sm" c="dimmed">
                    {coordinateData.length} 件の座標データが登録されています
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="lot" style={{ flex: 1, padding: '20px' }}>
          {/* 地番編集パネル */}
          <Stack>
            <Group justify="space-between">
              <Text size="lg" fw={600}>地番管理</Text>
              <Button leftSection={<IconPlus size={16} />}>地番追加</Button>
            </Group>
            
            <Paper withBorder p="md">
              <Stack gap="md">
                <Text size="sm" c="dimmed">土地の地番情報を管理します</Text>
                
                {/* 地番一覧 */}
                <Box style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stack align="center" gap="md">
                    <IconNumbers size={48} color="gray" />
                    <Text c="dimmed">地番データはここに表示されます</Text>
                    <Text size="sm" c="dimmed">地番、地目、面積などの情報を追加・編集できます</Text>
                  </Stack>
                </Box>
                
                <Group>
                  <Button variant="light">地番台帳インポート</Button>
                  <Button variant="light">地番台帳エクスポート</Button>
                  <Button variant="light">面積計算</Button>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
      
      {/* 座標追加・編集モーダル */}
      <Modal
        opened={showCoordinateModal}
        onClose={() => setShowCoordinateModal(false)}
        title={editingCoordinate ? "座標点編集" : "座標点追加"}
        size="lg"
      >
        <CoordinateForm
          coordinate={editingCoordinate}
          onSave={handleSaveCoordinate}
          onCancel={() => setShowCoordinateModal(false)}
        />
      </Modal>
    </Box>
  );
};

// 座標入力フォームコンポーネント
const CoordinateForm: React.FC<{
  coordinate?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ coordinate, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    pointName: coordinate?.pointName || '',
    type: coordinate?.type || 'boundary_point',
    x: coordinate?.x?.toString() || '',
    y: coordinate?.y?.toString() || '',
    z: coordinate?.z?.toString() || '',
    accuracy: coordinate?.accuracy || '±5mm',
    description: coordinate?.description || '',
    surveyor: coordinate?.surveyor || '',
    coordinateSystem: coordinate?.coordinateSystem || 'JGD2011'
  });
  
  const handleSubmit = () => {
    const data = {
      ...formData,
      x: parseFloat(formData.x),
      y: parseFloat(formData.y),
      z: parseFloat(formData.z)
    };
    onSave(data);
  };
  
  return (
    <Stack gap="md">
      <Group grow>
        <TextInput
          label="点名"
          value={formData.pointName}
          onChange={(e) => setFormData(prev => ({ ...prev, pointName: e.target.value }))}
          required
        />
        <Select
          label="種類"
          value={formData.type}
          onChange={(value) => setFormData(prev => ({ ...prev, type: value || 'boundary_point' }))}
          data={[
            { value: 'benchmark', label: '基準点' },
            { value: 'control_point', label: '制御点' },
            { value: 'boundary_point', label: '境界点' }
          ]}
          required
        />
      </Group>
      
      <Group grow>
        <TextInput
          label="X座標 (m)"
          value={formData.x}
          onChange={(e) => setFormData(prev => ({ ...prev, x: e.target.value }))}
          required
        />
        <TextInput
          label="Y座標 (m)"
          value={formData.y}
          onChange={(e) => setFormData(prev => ({ ...prev, y: e.target.value }))}
          required
        />
        <TextInput
          label="標高 (m)"
          value={formData.z}
          onChange={(e) => setFormData(prev => ({ ...prev, z: e.target.value }))}
          required
        />
      </Group>
      
      <Group grow>
        <Select
          label="精度"
          value={formData.accuracy}
          onChange={(value) => setFormData(prev => ({ ...prev, accuracy: value || '±5mm' }))}
          data={[
            { value: '±1mm', label: '±1mm' },
            { value: '±2mm', label: '±2mm' },
            { value: '±3mm', label: '±3mm' },
            { value: '±5mm', label: '±5mm' },
            { value: '±10mm', label: '±10mm' }
          ]}
        />
        <TextInput
          label="測量者"
          value={formData.surveyor}
          onChange={(e) => setFormData(prev => ({ ...prev, surveyor: e.target.value }))}
        />
      </Group>
      
      <TextInput
        label="説明"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
      />
      
      <Select
        label="座標系"
        value={formData.coordinateSystem}
        onChange={(value) => setFormData(prev => ({ ...prev, coordinateSystem: value || 'JGD2011' }))}
        data={[
          { value: 'JGD2000', label: 'JGD2000' },
          { value: 'JGD2011', label: 'JGD2011' },
          { value: 'Tokyo', label: '日本測地系' }
        ]}
      />
      
      <Group justify="flex-end">
        <Button variant="light" onClick={onCancel}>
          キャンセル
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.pointName || !formData.x || !formData.y || !formData.z}
        >
          {coordinate ? '更新' : '追加'}
        </Button>
      </Group>
    </Stack>
  );
};