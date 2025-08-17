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
  IconTrash,
  IconFolderOpen,
  IconFileImport,
  IconFileExport,
  IconDatabase,
  IconWaveSine,
  IconArrowLeft
} from '@tabler/icons-react';
// import { P21Parser } from '../../modules/sxf/P21Parser';
// import { P21Exporter } from '../../modules/sxf/P21Exporter';
// import { SXFParser } from '../../modules/sxf/SXFParser';
// import { SXFExporter } from '../../modules/sxf/SXFExporter';
// import { SXFConverter } from '../../modules/sxf/SXFConverter'; // 一時的に無効化
import { SXFParser, readSXFFileWithEncoding } from '../../utils/sxfParser';
import type { CADElement, PaperSize, PaperSettings, CADLayer, CADLevel, CADCoordinateSystem } from '../../types/cad';
import { cadElementService } from '../../services/cadElementService';
import { realtimeService } from '../../services/realtimeService';

interface CADPoint {
  x: number;
  y: number;
}



interface CADEditorProps {
  projectId: string;
  onClose: () => void;
  initialData?: CADElement[];
  onSave?: (data: CADData) => void;
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
  onSave
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
  const [zoom, setZoom] = useState(2.0); // 200%倍率で開始
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState<CADElement[]>(initialData);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [editingElementProperties, setEditingElementProperties] = useState<CADElement | null>(null);
  const [showElementDetails, setShowElementDetails] = useState(false);
  const [selectedElementDetails, setSelectedElementDetails] = useState<CADElement | null>(null);
  
  // データベース連携用の状態
  const [currentDrawingId, setCurrentDrawingId] = useState<string | null>(null);
  const [currentLayerId, setCurrentLayerId] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  // 現在の描画プロパティ
  const [currentDrawingProperties, setCurrentDrawingProperties] = useState({
    lineType: 'solid',
    lineWidth: 0.35,
    color: '#000000'
  });
  
  // CADレベル管理
  const [coordinateSystem, setCoordinateSystem] = useState<CADCoordinateSystem>({
    paperLevel: {
      id: 'paper',
      name: '用紙レベル',
      levelNumber: 0,  // 用紙レベルは0番
      originX: 0,
      originY: 0,
      rotation: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      description: '用紙座標系（1/1, 原点0,0, 回転0度）',
      isActive: false
    },
    levels: [],
    activeLevel: 'paper'
  });
  
  // 線種定義
  const lineTypes = [
    { value: 'solid', label: '実線', pattern: [] },
    { value: 'dashed', label: '破線', pattern: [5, 5] },
    { value: 'dotted', label: '点線', pattern: [2, 3] },
    { value: 'dashdot', label: '一点鎖線', pattern: [8, 3, 2, 3] },
    { value: 'dashdotdot', label: '二点鎖線', pattern: [8, 3, 2, 3, 2, 3] }
  ];
  
  // 線幅定義（mm単位）
  const lineWidths = [
    { value: 0.1, label: '0.1mm (極細)' },
    { value: 0.25, label: '0.25mm (細線)' },
    { value: 0.35, label: '0.35mm (標準)' },
    { value: 0.5, label: '0.5mm (中線)' },
    { value: 0.7, label: '0.7mm (太線)' },
    { value: 1.0, label: '1.0mm (極太)' },
    { value: 1.4, label: '1.4mm (特太)' }
  ];
  
  // 色定義
  const elementColors = [
    { value: '#000000', label: '黒' },
    { value: '#FF0000', label: '赤' },
    { value: '#0000FF', label: '青' },
    { value: '#00FF00', label: '緑' },
    { value: '#FF00FF', label: 'マゼンタ' },
    { value: '#00FFFF', label: 'シアン' },
    { value: '#FFFF00', label: '黄' },
    { value: '#808080', label: 'グレー' },
    { value: '#800000', label: '暗赤' },
    { value: '#000080', label: '暗青' }
  ];
  
  // 単一ページの用紙設定
  const [paperSettings, setPaperSettings] = useState<PaperSettings>({
    size: paperSizes.find(p => p.id === 'A3')!,
    orientation: 'landscape',
    margin: 10,
    scale: '1:500',
    showBorder: true,
    coordinateSystem: 9
  });
  
  // タブ管理
  
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
      case 'survey': return '測量点';
      case 'benchmark': return '水準点';
      default: return type;
    }
  };
  
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'survey': return 'blue';
      case 'benchmark': return 'green';
      default: return 'gray';
    }
  };
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
  const [showPaperModal, setShowPaperModal] = useState(false);
  
  // テキスト入力関連
  const [showTextModal, setShowTextModal] = useState(false);
  const [textPosition, setTextPosition] = useState<{x: number, y: number} | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textFontSize, setTextFontSize] = useState(12);
  const [textFontName, setTextFontName] = useState('MS Gothic');
  const [editingTextElement, setEditingTextElement] = useState<CADElement | null>(null);
  // const [customPaperSize, setCustomPaperSize] = useState({ width: 400, height: 300 });
  
  // レイヤー管理（シンプル構成）
  const [layers, setLayers] = useState<CADLayer[]>([
    { id: 'MAIN', name: 'メイン図面', visible: true, locked: false, description: 'メインの作図レイヤー' },
    { id: 'REFERENCE', name: '参考図', visible: true, locked: false, description: '参考用の図面' },
    { id: 'TEMPORARY', name: '一時作業', visible: true, locked: false, description: '一時的な作業用レイヤー' }
  ]);
  const [activeLayer, setActiveLayer] = useState('MAIN');
  const [showLayerModal, setShowLayerModal] = useState(false);
  const [showNewLayerModal, setShowNewLayerModal] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  
  // 新規レベル作成関連
  const [showNewLevelModal, setShowNewLevelModal] = useState(false);
  const [newLevel, setNewLevel] = useState({
    name: '',
    originX: 0,
    originY: 0,
    rotation: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    description: ''
  });
  
  // デフォルト描画色
  const [currentStrokeColor, setCurrentStrokeColor] = useState('#000000');

  // レイヤー管理ハンドラー
  const handleCreateNewLayer = () => {
    if (newLayerName.trim()) {
      const newLayerId = `L-${Date.now()}`;
      const newLayer: CADLayer = {
        id: newLayerId,
        name: newLayerName.trim(),
        visible: true,
        locked: false,
        description: `ユーザー作成レイヤー: ${newLayerName.trim()}`
      };
      setLayers(prev => [...prev, newLayer]);
      setActiveLayer(newLayerId);
      setNewLayerName('');
      setShowNewLayerModal(false);
    }
  };

  const handleEditLayer = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setEditingLayer(layerId);
      setEditingLayerName(layer.name);
    }
  };

  const handleSaveLayerEdit = () => {
    if (editingLayer && editingLayerName.trim()) {
      setLayers(prev => prev.map(layer => 
        layer.id === editingLayer 
          ? { ...layer, name: editingLayerName.trim() }
          : layer
      ));
      setEditingLayer(null);
      setEditingLayerName('');
    }
  };

  const handleDeleteLayer = (layerId: string) => {
    // デフォルトレイヤー（MAIN, REFERENCE, TEMPORARY）は削除不可
    if (['MAIN', 'REFERENCE', 'TEMPORARY'].includes(layerId)) {
      alert('デフォルトレイヤーは削除できません');
      return;
    }
    
    // 要素が存在するレイヤーは削除前に確認
    const elementsInLayer = elements.filter(e => e.layerId === layerId);
    if (elementsInLayer.length > 0) {
      if (!confirm(`レイヤー内に${elementsInLayer.length}個の要素があります。削除しますか？`)) {
        return;
      }
      // 要素も一緒に削除
      setElements(prev => prev.filter(e => e.layerId !== layerId));
    }
    
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    
    // アクティブレイヤーが削除された場合、別のレイヤーに切り替え
    if (activeLayer === layerId) {
      const remainingLayers = layers.filter(layer => layer.id !== layerId);
      setActiveLayer(remainingLayers.length > 0 ? remainingLayers[0].id : 'MAIN');
    }
  };

  // レベル管理ハンドラー
  const handleCreateNewLevel = () => {
    if (newLevel.name.trim()) {
      const newLevelId = `LEVEL-${Date.now()}`;
      const maxLevelNumber = Math.max(...coordinateSystem.levels.map(l => l.levelNumber), 0) + 1;
      
      const levelToAdd: CADLevel = {
        id: newLevelId,
        name: newLevel.name.trim(),
        levelNumber: maxLevelNumber,
        originX: newLevel.originX,
        originY: newLevel.originY,
        rotation: newLevel.rotation,
        scaleX: newLevel.scaleX,
        scaleY: newLevel.scaleY,
        description: newLevel.description || `ユーザー作成レベル: ${newLevel.name.trim()}`,
        isActive: false
      };

      setCoordinateSystem(prev => ({
        ...prev,
        levels: [...prev.levels, levelToAdd],
        activeLevel: newLevelId
      }));

      // フォームをリセット
      setNewLevel({
        name: '',
        originX: 0,
        originY: 0,
        rotation: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        description: ''
      });
      setShowNewLevelModal(false);
    }
  };

  const handleResetNewLevel = () => {
    setNewLevel({
      name: '',
      originX: 0,
      originY: 0,
      rotation: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      description: ''
    });
  };
  
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

  // 単一ページの境界を計算する関数
  const getPageBounds = useCallback(() => {
    const { width, height } = paperSettings.size;
    const actualWidth = paperSettings.orientation === 'landscape' 
      ? Math.max(width, height) : Math.min(width, height);
    const actualHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(width, height) : Math.max(width, height);
    
    return {
      left: 0,
      top: 0,
      right: actualWidth,
      bottom: actualHeight,
      width: actualWidth,
      height: actualHeight
    };
  }, [paperSettings]);
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
    // 用紙左下原点座標系からスクリーン座標系に変換
    // worldX(右方向) -> screenX(右向き), worldY(上方向) -> screenY(下向き、反転)
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // 用紙サイズを取得
    const currentSize = paperSettings.size;
    const paperHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(currentSize.width, currentSize.height)
      : Math.max(currentSize.width, currentSize.height);
    
    return {
      x: worldX * zoom + pan.x, // ワールドX(右方向) → スクリーンX
      y: pan.y + (paperHeight - worldY) * zoom // 修正: pan.yは用紙上端、worldYを反転
    };
  }, [zoom, pan, paperSettings]);

  // スナップポイントを検出する関数
  const findSnapPoint = useCallback((screenX: number, screenY: number) => {
    if (!snapToObjects) {
      return null;
    }

    // 新座標系に合わせて変換
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // CSS座標系を使用（DPR調整なし）
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;
    
    const worldPos = {
      x: (screenX - pan.x) / zoom, // スクリーンX → ワールドX（右方向）
      y: (pan.y - screenY) / zoom // スクリーンY → ワールドY（上方向）
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
    // 用紙左下を原点とする座標系に変換
    // 右がX軸正方向、上がY軸正方向（標準的なCAD座標系）
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // CSS座標系を使用（DPR調整なし）
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;
    
    // 座標変換の定義を修正:
    // pan.x = 用紙左端のスクリーンX座標 (worldX=0の時のscreenX)
    // pan.y = 用紙上端のスクリーンY座標 (worldY=paperHeightの時のscreenY)
    
    // 1. スクリーンX → ワールドX（右方向）
    const worldX = (screenX - pan.x) / zoom;
    
    // 2. スクリーンY → ワールドY（上方向、Y軸反転）
    // 用紙サイズを取得
    const currentSize = paperSettings.size;
    const paperHeight = paperSettings.orientation === 'landscape' 
      ? Math.min(currentSize.width, currentSize.height)
      : Math.max(currentSize.width, currentSize.height);
    
    // pan.yを用紙上端のスクリーンY座標として定義
    // worldY = paperHeight - (screenY - pan.y) / zoom
    const worldY = paperHeight - (screenY - pan.y) / zoom;
    
    // 常に座標変換の詳細をログ出力（デバッグ用）
    if (Math.abs(worldX) < 5 && worldY >= -5 && worldY <= 5) { // 原点付近の時
      console.log('=== 詳細座標変換デバッグ ===');
      console.log(`入力: スクリーン(${screenX}, ${screenY}), CSS canvas高さ: ${canvasHeight}`);
      console.log(`パン: (${pan.x}, ${pan.y}), ズーム: ${zoom}, 用紙高さ: ${paperHeight}`);
      console.log(`計算過程:`);
      console.log(`  worldX = (${screenX} - ${pan.x}) / ${zoom} = ${((screenX - pan.x) / zoom).toFixed(4)}`);
      console.log(`  worldY = ${paperHeight} - (${screenY} - ${pan.y}) / ${zoom} = ${(paperHeight - (screenY - pan.y) / zoom).toFixed(4)}`);
      console.log(`結果: ワールド(${worldX}, ${worldY})`);
      
      // 逆変換テスト
      const testBack = worldToScreen(worldX, worldY);
      console.log(`逆変換テスト: ワールド(${worldX}, ${worldY}) → スクリーン(${testBack.x.toFixed(2)}, ${testBack.y.toFixed(2)})`);
      console.log(`逆変換誤差: (${Math.abs(testBack.x - screenX).toFixed(4)}, ${Math.abs(testBack.y - screenY).toFixed(4)})`);
      
      // 原点テストと座標系の確認
      const origin = worldToScreen(0, 0);
      const backToOrigin = screenToWorld(origin.x, origin.y);
      console.log(`原点テスト: (0,0) → スクリーン(${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}) → ワールド(${backToOrigin.x.toFixed(6)}, ${backToOrigin.y.toFixed(6)})`);
      
      // 用紙右下角のテスト（仮定：用紙サイズ297x210mm）
      const paperCorner = worldToScreen(297, 210);
      const backToCorner = screenToWorld(paperCorner.x, paperCorner.y);
      console.log(`用紙右上テスト: (297,210) → スクリーン(${paperCorner.x.toFixed(2)}, ${paperCorner.y.toFixed(2)}) → ワールド(${backToCorner.x.toFixed(2)}, ${backToCorner.y.toFixed(2)})`);
      
      // Y軸の詳細確認
      console.log(`Y座標詳細: paperBottomScreenY=${pan.y.toFixed(2)}, 現在screenY=${screenY}, 計算worldY=${worldY.toFixed(4)}`);
      console.log('===========================');
    }

    // オブジェクトスナップが有効な場合
    if (snapToObjects) {
      const snapPoint = findSnapPoint(screenX, screenY);
      if (snapPoint) {
        // スナップポイントが見つかった場合はそこにスナップ
        // スナップポイントも新座標系に変換
        const rect = canvas.getBoundingClientRect();
        const canvasHeight = rect.height;
        const snapWorldX = (snapPoint.x - pan.x) / zoom;
        const snapWorldY = (pan.y - snapPoint.y) / zoom;
        return { x: snapWorldX, y: snapWorldY };
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
  
  // 単一ページ描画関数
  const drawSinglePage = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const bounds = getPageBounds();
    const screenBounds = {
      left: bounds.left * zoom + pan.x,
      top: bounds.top * zoom + pan.y,
      right: bounds.right * zoom + pan.x,
      bottom: bounds.bottom * zoom + pan.y
    };
    
    // 用紙の背景を描画
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(screenBounds.left, screenBounds.top, 
                 (bounds.width * zoom), (bounds.height * zoom));
    
    // 用紙の枠線を描画
    if (paperSettings.showBorder) {
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenBounds.left, screenBounds.top, 
                     (bounds.width * zoom), (bounds.height * zoom));
    }
    
    // 要素を描画
    drawElements(ctx);
  }, [getPageBounds, zoom, pan, paperSettings.showBorder]);



  // 単一ページ用のグリッド描画関数
  const drawPageGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!showGrid) return;
    
    const bounds = getPageBounds();
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
    
    // デバッグ: 用紙位置をログ出力
    if (Math.random() < 0.01) { // 1%の確率でログ出力
      console.log('=== 用紙描画位置デバッグ ===');
      console.log(`パン: (${pan.x.toFixed(2)}, ${pan.y.toFixed(2)})`);
      console.log(`ズーム: ${zoom.toFixed(4)}`);
      console.log(`用紙原点(0,0)のスクリーン座標: (${paperOrigin.x.toFixed(2)}, ${paperOrigin.y.toFixed(2)})`);
      console.log(`用紙サイズ: ${paperWidth} x ${paperHeight}`);
      console.log('===========================');
    }
    
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
    console.log('drawElements 開始: 要素数=', elements.length);
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      // sxfAttributesから色を取得、fallbackで既存の仕組みを使用
      const strokeColor = element.sxfAttributes?.color || element.style?.strokeColor || element.properties?.stroke || '#FF0000';
      ctx.strokeStyle = strokeColor;
      
      // sxfAttributesから線幅を取得
      const baseLineWidth = element.sxfAttributes?.lineWidth || element.style?.strokeWidth || element.properties?.strokeWidth || 1;
      
      // 線幅の違いを明確にするための計算
      // baseLineWidthを基準に、より幅広い範囲で線幅を設定
      let calculatedLineWidth;
      
      if (zoom < 0.1) {
        // 非常に小さなズーム時は線幅を強調
        calculatedLineWidth = Math.max(0.5, baseLineWidth * 3);
      } else if (zoom < 0.5) {
        // 小さなズーム時
        calculatedLineWidth = Math.max(0.5, baseLineWidth * 2);
      } else if (zoom < 2.0) {
        // 通常のズーム時
        calculatedLineWidth = Math.max(0.5, baseLineWidth * 1.5);
      } else {
        // 大きなズーム時
        calculatedLineWidth = Math.max(0.5, baseLineWidth);
      }
      
      // 最終的な線幅を設定（0.5～10ピクセルの範囲）
      ctx.lineWidth = Math.max(0.5, Math.min(10, calculatedLineWidth));
      
      // 線種パターンを設定
      const lineType = element.sxfAttributes?.lineType || 'solid';
      const lineTypeDefinition = lineTypes.find(lt => lt.value === lineType);
      if (lineTypeDefinition && lineTypeDefinition.pattern.length > 0) {
        // 破線パターンをズームに応じてスケール
        const scaledPattern = lineTypeDefinition.pattern.map(p => p * Math.max(1, zoom));
        ctx.setLineDash(scaledPattern);
      } else {
        ctx.setLineDash([]); // 実線
      }
      
      ctx.fillStyle = element.style?.fillColor || 'transparent';
      
      switch (element.type) {
        case 'line':
          if (element.points && element.points?.length >= 2) {
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            let hasValidPoints = false;
            for (let i = 1; i < element.points?.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              // 有効な座標かチェック（無限大やNaNを除外）
              if (isFinite(pointScreen.x) && isFinite(pointScreen.y)) {
                ctx.lineTo(pointScreen.x, pointScreen.y);
                hasValidPoints = true;
              }
            }
            
            // 有効なポイントがある場合のみ描画
            if (hasValidPoints) {
              ctx.stroke();
              
              // 極小ズーム時のデバッグログ
              if (zoom < 0.01 && Math.random() < 0.01) { // 1%の確率でログ出力
                console.log(`線描画: zoom=${zoom.toFixed(6)}, 線幅=${ctx.lineWidth}, 開始点=(${startScreen.x.toFixed(1)}, ${startScreen.y.toFixed(1)})`);
              }
            }
          }
          break;
          
        case 'circle':
          // 新しい形式（points使用）をサポート
          if (element.points?.length >= 2) {
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
            if (element.style?.fillColor) ctx.fill();
          }
          // 古い形式（center/radius使用）もサポート
          else if ((element as any).center && (element as any).radius) {
            const center = (element as any).center;
            const radius = (element as any).radius;
            const centerScreen = worldToScreen(center.x, center.y);
            
            ctx.beginPath();
            ctx.arc(centerScreen.x, centerScreen.y, radius * zoom, 0, 2 * Math.PI);
            ctx.stroke();
            if (element.style?.fillColor) ctx.fill();
          }
          break;
          
        case 'point':
          if (element.points?.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            ctx.fillStyle = element.style?.strokeColor || '#FF0000';
            ctx.beginPath();
            ctx.arc(pointScreen.x, pointScreen.y, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // 十字マーク（固定サイズ）
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
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
          if (element.points?.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            // 測量点シンボル（三角形）
            ctx.fillStyle = element.style?.strokeColor || '#FF0000';
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
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
          if (element.points?.length >= 2) {
            // 境界線（特殊な線種）
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 5, 2, 5]); // 境界線パターン
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points?.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          break;

        case 'bezier':
          if (element.points?.length >= 2) {
            // ベジェ曲線
            ctx.strokeStyle = element.style?.strokeColor || '#804000';
            ctx.lineWidth = element.style?.strokeWidth || 1;
            
            ctx.beginPath();
            const points = element.points.map(p => worldToScreen(p.x, p.y));
            
            ctx.moveTo(points[0].x, points[0].y);
            
            if (points.length >= 4) {
              // 4点以上の場合：4点ずつ三次ベジェ曲線を描画
              for (let i = 0; i < points.length - 3; i += 3) {
                const p0 = points[i];
                const cp1 = points[i + 1];
                const cp2 = points[i + 2];
                const p1 = points[i + 3];
                
                if (i === 0) {
                  ctx.moveTo(p0.x, p0.y);
                }
                ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y);
              }
            } else if (points.length === 3) {
              // 3点の場合は制御点を複製して三次ベジェ曲線に変換
              ctx.bezierCurveTo(points[1].x, points[1].y, points[1].x, points[1].y, points[2].x, points[2].y);
            } else if (points.length === 2) {
              // 2点の場合は直線として三次ベジェ曲線で描画
              const dx = (points[1].x - points[0].x) / 3;
              const dy = (points[1].y - points[0].y) / 3;
              ctx.bezierCurveTo(
                points[0].x + dx, points[0].y + dy,
                points[0].x + 2 * dx, points[0].y + 2 * dy,
                points[1].x, points[1].y
              );
            }
            ctx.stroke();
          }
          break;

        case 'traverse_line':
          if (element.points?.length >= 2) {
            // トラバース線（測量線）
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 4]); // 点線パターン
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points?.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            
            // 距離と方位角表示
            if (element.properties.distance && element.properties.azimuth) {
              const midPoint = Math.floor(element.points?.length / 2);
              const midScreen = worldToScreen(element.points[midPoint].x, element.points[midPoint].y);
              ctx.fillStyle = '#006600';
              ctx.font = '8px Arial';
              ctx.fillText(`${element.properties.distance.toFixed(2)}m`, midScreen.x + 5, midScreen.y - 10);
              ctx.fillText(`${element.properties.azimuth.toFixed(1)}°`, midScreen.x + 5, midScreen.y + 5);
            }
          }
          break;

        case 'control_point':
          if (element.points?.length >= 1) {
            const point = element.points[0];
            const pointScreen = worldToScreen(point.x, point.y);
            
            // 制御点シンボル（四角形）
            ctx.fillStyle = element.style?.strokeColor || '#FF0000';
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
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
          if (element.points?.length >= 3) {
            // 建物輪郭線
            ctx.strokeStyle = element.style?.strokeColor || '#FF0000';
            ctx.fillStyle = element.style?.fillColor || 'rgba(128, 128, 128, 0.3)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            const startScreen = worldToScreen(element.points[0].x, element.points[0].y);
            ctx.moveTo(startScreen.x, startScreen.y);
            
            for (let i = 1; i < element.points?.length; i++) {
              const pointScreen = worldToScreen(element.points[i].x, element.points[i].y);
              ctx.lineTo(pointScreen.x, pointScreen.y);
            }
            ctx.closePath();
            
            if (element.style?.fillColor) {
              ctx.fill();
            }
            ctx.stroke();
            
            // 建物種別表示
            if (element.properties.buildingType) {
              const centerX = element.points.reduce((sum, p) => sum + p.x, 0) / element.points?.length;
              const centerY = element.points.reduce((sum, p) => sum + p.y, 0) / element.points?.length;
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
          if (element.points?.length >= 1 && element.properties.text) {
            const pointScreen = worldToScreen(element.points[0].x, element.points[0].y);
            
            // テキストカラーを設定（優先順位: properties.stroke > style.strokeColor > デフォルト）
            const textColor = element.properties.stroke || 
                             element.style?.strokeColor || 
                             '#000000';
            ctx.fillStyle = textColor;
            
            // フォント設定
            const fontSize = (element.properties.fontSize || 12) * zoom;
            const fontName = element.properties.fontName || 'MS Gothic';
            ctx.font = `${fontSize}px "${fontName}", Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            
            // テキスト描画
            ctx.fillText(element.properties.text, pointScreen.x, pointScreen.y);
            
            // 選択時のハイライト
            if (selectedElementIds.includes(element.id)) {
              const textMetrics = ctx.measureText(element.properties.text);
              const textWidth = textMetrics.width;
              const textHeight = fontSize;
              
              ctx.strokeStyle = '#0066CC';
              ctx.lineWidth = 1;
              ctx.setLineDash([5, 5]);
              ctx.strokeRect(pointScreen.x - 2, pointScreen.y - textHeight - 2, textWidth + 4, textHeight + 4);
              ctx.setLineDash([]);
            }
          }
          break;
          
        case 'comment':
          if (element.points?.length >= 1 && element.properties.text) {
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
    if (element.points?.length === 0) return null;
    
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
    
    // 単一ページを描画
    drawSinglePage(ctx, canvas);
    
    // グリッドを描画
    drawPageGrid(ctx, canvas);
    
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
  }, [elements, layers, isDrawing, currentPath, isLineDrawing, linePoints, previewPoint, tool, zoom, pan, paperSettings, showGrid, mousePos]);

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
        },
        sxfAttributes: {
          layerName: layers.find(l => l.id === activeLayer)?.name || 'Default',
          lineType: currentDrawingProperties.lineType,
          lineWidth: 0.25,
          color: '#e6cc00'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
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

  // 要素プロパティ編集機能
  const handleEditElementProperties = (elementId: string) => {
    const element = elements.find(e => e.id === elementId);
    if (element) {
      setEditingElementProperties({...element});
      setShowPropertiesPanel(true);
    }
  };

  const handleSaveElementProperties = (updatedElement: CADElement) => {
    setElements(prev => prev.map(el => 
      el.id === updatedElement.id ? updatedElement : el
    ));
    
    // データベースに永続化
    if (updatedElement.id) {
      persistElementUpdate(updatedElement.id, updatedElement);
    }
    
    setShowPropertiesPanel(false);
    setEditingElementProperties(null);
  };

  const handleCancelElementProperties = () => {
    setShowPropertiesPanel(false);
    setEditingElementProperties(null);
  };

  // レベル間座標変換関数
  const transformCoordinates = useCallback((x: number, y: number, fromLevel: CADLevel, toLevel: CADLevel) => {
    // fromLevelからtoLevelへの座標変換
    
    // 1. fromLevelのスケールを適用（逆変換）
    let transformedX = x / fromLevel.scaleX;
    let transformedY = y / fromLevel.scaleY;
    
    // 2. fromLevelの回転を適用（逆変換）
    if (fromLevel.rotation !== 0) {
      const radians = -fromLevel.rotation * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const newX = transformedX * cos - transformedY * sin;
      const newY = transformedX * sin + transformedY * cos;
      transformedX = newX;
      transformedY = newY;
    }
    
    // 3. fromLevelの原点を適用（逆変換）
    transformedX += fromLevel.originX;
    transformedY += fromLevel.originY;
    
    // 4. toLevelの原点を適用
    transformedX -= toLevel.originX;
    transformedY -= toLevel.originY;
    
    // 5. toLevelの回転を適用
    if (toLevel.rotation !== 0) {
      const radians = toLevel.rotation * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const newX = transformedX * cos - transformedY * sin;
      const newY = transformedX * sin + transformedY * cos;
      transformedX = newX;
      transformedY = newY;
    }
    
    // 6. toLevelのスケールを適用
    transformedX *= toLevel.scaleX;
    transformedY *= toLevel.scaleY;
    
    return { x: transformedX, y: transformedY };
  }, []);

  // アクティブレベルから用紙レベルへの変換
  const transformToPaper = useCallback((x: number, y: number) => {
    const activeLevel = coordinateSystem.levels.find(l => l.id === coordinateSystem.activeLevel) || coordinateSystem.paperLevel;
    return transformCoordinates(x, y, activeLevel, coordinateSystem.paperLevel);
  }, [coordinateSystem, transformCoordinates]);

  // 用紙レベルからアクティブレベルへの変換
  const transformFromPaper = useCallback((x: number, y: number) => {
    const activeLevel = coordinateSystem.levels.find(l => l.id === coordinateSystem.activeLevel) || coordinateSystem.paperLevel;
    return transformCoordinates(x, y, coordinateSystem.paperLevel, activeLevel);
  }, [coordinateSystem, transformCoordinates]);

  // 要素の当たり判定
  const findElementAtPosition = (worldX: number, worldY: number): CADElement | null => {
    const tolerance = 5 / zoom; // ズームに応じた許容範囲
    
    // 逆順でチェック（後に描画された要素が優先）
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      
      if (element.type === 'line' && element.points?.length >= 2) {
        // 線分の当たり判定
        for (let j = 0; j < element.points.length - 1; j++) {
          const p1 = element.points[j];
          const p2 = element.points[j + 1];
          
          const dist = distancePointToLineSegment(worldX, worldY, p1.x, p1.y, p2.x, p2.y);
          if (dist <= tolerance) {
            return element;
          }
        }
      } else if (element.type === 'circle') {
        // 円の当たり判定
        if (element.centerX !== undefined && element.centerY !== undefined && element.radius !== undefined) {
          const dist = Math.sqrt(Math.pow(worldX - element.centerX, 2) + Math.pow(worldY - element.centerY, 2));
          if (Math.abs(dist - element.radius) <= tolerance) {
            return element;
          }
        }
      } else if (element.points?.length > 0) {
        // その他の要素（点、多角形など）
        for (const point of element.points) {
          const dist = Math.sqrt(Math.pow(worldX - point.x, 2) + Math.pow(worldY - point.y, 2));
          if (dist <= tolerance) {
            return element;
          }
        }
      }
    }
    
    return null;
  };

  // 点と線分の距離を計算
  const distancePointToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };



  // SXF要素をCAD要素に変換する関数
  const convertSXFToCADElement = useCallback((sxfElement: any, index: number): CADElement | null => {
    try {
      const baseElement = {
        id: `sxf_${sxfElement.id}_${index}`,
        layerId: 'MAIN', // デフォルトレイヤー
        style: {
          strokeColor: '#FF0000', // 赤色をデフォルト
          strokeWidth: 0.25,
          fillColor: 'transparent'
        },
        visible: true,
        locked: false,
        metadata: {
          source: 'sxf',
          originalId: sxfElement.id,
          originalType: sxfElement.type
        }
      };

      switch (sxfElement.type) {
        case 'arc_feature':
          if (sxfElement.properties.centerX !== undefined && 
              sxfElement.properties.centerY !== undefined && 
              sxfElement.properties.radius !== undefined) {
            
            // 座標値をそのまま使用（座標系変換はズームで調整）
            const centerX = sxfElement.properties.centerX;
            const centerY = sxfElement.properties.centerY;
            const radius = Math.max(sxfElement.properties.radius, 1); // 最小半径を1に設定
            
            console.log(`円要素: 中心(${centerX}, ${centerY}), 半径:${radius}`);
            
            return {
              ...baseElement,
              type: 'circle',
              points: [
                { x: centerX, y: centerY },
                { x: centerX + radius, y: centerY }
              ]
            } as CADElement;
          }
          break;

        case 'user_defined_colour_feature':
          // 色定義は直接要素として表示しない
          return null;

        case 'width_feature':
          // 線幅定義は直接要素として表示しない  
          return null;

        case 'text_font_feature':
          // フォント定義は直接要素として表示しない
          return null;

        case 'composite_curve_org_feature':
          // 複合曲線は点として表示（簡易表示）
          return {
            ...baseElement,
            type: 'point',
            point: { x: 0, y: 0 }, // 座標情報がない場合のデフォルト
            style: {
              ...baseElement.style,
              strokeColor: '#0000FF'
            }
          } as CADElement;

        case 'CARTESIAN_POINT':
          // 座標ポイントを点要素として表示
          if (sxfElement.properties.hasCoordinates) {
            return {
              ...baseElement,
              type: 'point',
              points: [{ x: sxfElement.properties.x, y: sxfElement.properties.y }]
            } as CADElement;
          }
          return null;
          
        case 'CIRCLE':
          // 円要素の処理
          if (sxfElement.properties.circleData) {
            // シンプルな円として表示
            return {
              ...baseElement,
              type: 'circle',
              points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] // デフォルト半径
            } as CADElement;
          }
          return null;
          
        case 'POLYLINE':
          // ポリラインを線要素として表示
          if (sxfElement.properties.polylineData) {
            return {
              ...baseElement,
              type: 'line',
              points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] // デフォルトライン
            } as CADElement;
          }
          return null;
          
        case 'LINE':
          // 線要素の処理
          if (sxfElement.properties.lineData) {
            return {
              ...baseElement,
              type: 'line',
              points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] // デフォルトライン
            } as CADElement;
          }
          return null;
          
        case 'line_feature':
          // 線分特徴の処理
          console.log(`line_feature処理開始:`, sxfElement.properties);
          if (sxfElement.properties.hasLineData && 
              sxfElement.properties.startX !== undefined && sxfElement.properties.startY !== undefined &&
              sxfElement.properties.endX !== undefined && sxfElement.properties.endY !== undefined) {
            
            const startX = sxfElement.properties.startX;
            const startY = sxfElement.properties.startY;
            const endX = sxfElement.properties.endX;
            const endY = sxfElement.properties.endY;
            
            console.log(`line_feature変換: (${startX}, ${startY}) -> (${endX}, ${endY})`);
            const cadElement = {
              ...baseElement,
              type: 'line',
              points: [
                { x: startX, y: startY },
                { x: endX, y: endY }
              ],
              // SXF固有の情報を保持
              layer: sxfElement.properties.layer,
              color: sxfElement.properties.color,
              lineType: sxfElement.properties.lineType,
              pen: sxfElement.properties.pen,
              sxfType: 'line_feature' // SXF要素タイプを記録
            } as CADElement & {
              layer?: string;
              color?: string;
              lineType?: string;
              pen?: string;
              sxfType?: string;
            };
            console.log(`line_feature CAD要素作成完了:`, cadElement);
            return cadElement;
          } else {
            console.log(`line_feature変換スキップ: hasLineData=${sxfElement.properties.hasLineData}, 座標定義=${sxfElement.properties.startX !== undefined && sxfElement.properties.startY !== undefined && sxfElement.properties.endX !== undefined && sxfElement.properties.endY !== undefined}`);
          }
          return null;
        
        case 'polyline_feature':
          // ポリライン特徴の処理
          if (sxfElement.properties.hasPolylineData && sxfElement.properties.polylinePoints) {
            const points = sxfElement.properties.polylinePoints;
            console.log(`polyline_feature変換: ${points.length}個のポイントを線要素に変換`);
            return {
              ...baseElement,
              type: 'line',
              points: points,
              // SXF固有の情報を保持
              layer: sxfElement.properties.layer,
              color: sxfElement.properties.color,
              lineType: sxfElement.properties.lineType,
              pen: sxfElement.properties.pen,
              sxfType: 'polyline_feature' // SXF要素タイプを記録
            } as CADElement & {
              layer?: string;
              color?: string;
              lineType?: string;
              pen?: string;
              sxfType?: string;
            };
          }
          return null;
        
        default:
          // 非表示要素はスキップ
          if (['DRAUGHTING_PRE_DEFINED_COLOUR', 'LENGTH_MEASURE_WITH_UNIT', 'EXTERNAL_SOURCE', 
               'EXTERNALLY_DEFINED_TEXT_FONT', 'COLOUR_RGB', 'DRAUGHTING_PRE_DEFINED_CURVE_FONT',
               'CURVE_STYLE_FONT_PATTERN', 'CURVE_STYLE_FONT', 'CURVE_STYLE', 'PRESENTATION_STYLE_ASSIGNMENT',
               'AXIS2_PLACEMENT_2D', 'TRIMMED_CURVE', 'DRAUGHTING_SUBFIGURE_REPRESENTATION',
               'SYMBOL_REPRESENTATION_MAP', 'DIRECTION', 'VECTOR', 'PLANAR_EXTENT', 'TEXT_LITERAL_WITH_EXTENT',
               'TEXT_STYLE_FOR_DEFINED_FONT', 'SYMBOL_TARGET', 'PRE_DEFINED_POINT_MARKER_SYMBOL',
               'DEFINED_SYMBOL', 'SYMBOL_COLOUR', 'SYMBOL_STYLE', 'COMPOSITE_CURVE_SEGMENT', 'COMPOSITE_CURVE',
               'user_defined_colour_feature', 'pre_defined_font_feature', 'user_defined_font_feature', 'width_feature'].includes(sxfElement.type)) {
            // これらは表示要素ではないためスキップ
            return null;
          }
          // その他の未対応要素
          console.log(`未対応のSXF要素タイプ: ${sxfElement.type}`);
          return null;
      }

      return null;
    } catch (error) {
      console.error('SXF要素変換エラー:', error, sxfElement);
      return null;
    }
  }, []);

  // SFC/P21インポート・エクスポート機能
  const handleImportSXF = useCallback(async (file: File) => {
    console.log('SFC/SXF/P21ファイルインポート開始:', file.name, file.size, 'bytes');
    
    try {
      const fileContent = await readSXFFileWithEncoding(file);
      console.log('ファイル内容読み込み完了:', fileContent.length, '文字');

      // 我々のSXFパーサーを使用
      const parser = new SXFParser();
      console.log('SFC/SXF解析開始...');
      
      // レベルグループ化解析で座標変換を適用
      const sxfData = parser.parseWithLevelGrouping(fileContent);

      console.log('SFC/SXF解析完了:', sxfData.statistics);
      console.log('SFC/SXF要素詳細:', sxfData.elements);
      console.log('SFC/SXFレベル詳細:', sxfData.levels);

      // CADレベル情報を処理（重複除去）
      if (sxfData.levels && sxfData.levels.length > 0) {
        // 重複するIDのレベルを除去
        const uniqueLevels = sxfData.levels.filter((level, index, arr) => 
          arr.findIndex(l => l.id === level.id) === index
        );
        
        console.log(`SXFレベル処理: ${sxfData.levels.length}個 -> ${uniqueLevels.length}個（重複除去後）`);
        
        const newLevels: CADLevel[] = uniqueLevels.map((sxfLevel, index) => ({
          id: sxfLevel.id,
          name: sxfLevel.name || `レベル${index}`,
          levelNumber: sxfLevel.levelNumber,  // SXFParserで設定された番号を使用
          originX: sxfLevel.originX,
          originY: sxfLevel.originY,
          rotation: sxfLevel.rotation,
          scaleX: sxfLevel.scaleX,
          scaleY: sxfLevel.scaleY,
          description: `レベル${sxfLevel.levelNumber}: 縮尺 1/${Math.round(1/sxfLevel.scaleX)}, 原点(${sxfLevel.originX.toFixed(2)}, ${sxfLevel.originY.toFixed(2)}), 回転${sxfLevel.rotation.toFixed(2)}°`,
          isActive: index === 0
        }));
        
        setCoordinateSystem(prev => ({
          ...prev,
          levels: newLevels,
          activeLevel: newLevels.length > 0 ? newLevels[0].id : 'paper'
        }));
        
        console.log(`${newLevels.length}個のCADレベルを検出しました:`, newLevels);
      }

      // SXF要素をCAD要素に変換
      const convertedElements: CADElement[] = [];
      let elementCount = 0;

      for (const sxfElement of sxfData.elements) {
        const cadElement = convertSXFToCADElement(sxfElement, elementCount++);
        if (cadElement) {
          convertedElements.push(cadElement);
        }
        
        // パフォーマンス制限：一度に表示する要素数を制限
        if (convertedElements.length >= 1000) {
          console.log('パフォーマンス制限により1000要素で変換を停止');
          break;
        }
      }

      // 変換された要素をCADエディタに追加
      if (convertedElements.length > 0) {
        setElements(prev => [...prev, ...convertedElements]);
        console.log(`${convertedElements.length}個の要素をインポートしました`);
        
        // 座標系情報を更新し、データに合わせてズームとパンを自動調整
        if (sxfData.statistics.coordinateRange.minX !== Infinity) {
          const range = sxfData.statistics.coordinateRange;
          console.log('元の座標範囲:', range);
          
          // データの中心を計算
          const centerX = (range.minX + range.maxX) / 2;
          const centerY = (range.minY + range.maxY) / 2;
          
          // データの範囲を計算
          const rangeX = Math.abs(range.maxX - range.minX);
          const rangeY = Math.abs(range.maxY - range.minY);
          
          console.log('データ中心:', { centerX, centerY });
          console.log('データ範囲:', { rangeX, rangeY });
          
          // キャンバスサイズを取得（デフォルトサイズを仮定）
          const canvasWidth = 800;
          const canvasHeight = 600;
          
          // データがキャンバスに収まるよう適切なズーム倍率を計算
          // マージンを20%確保
          const zoomX = (canvasWidth * 0.8) / rangeX;
          const zoomY = (canvasHeight * 0.8) / rangeY;
          const appropriateZoom = Math.min(zoomX, zoomY, 2.0); // 最大2倍まで
          
          // データ中心が画面中央に来るようパン値を計算
          const panX = canvasWidth / 2 - centerX * appropriateZoom;
          const panY = canvasHeight / 2 - centerY * appropriateZoom;
          
          console.log('計算されたズームとパン:', { 
            zoom: appropriateZoom, 
            pan: { x: panX, y: panY } 
          });
          
          setZoom(appropriateZoom);
          setPan({ x: panX, y: panY });
        } else {
          // 座標範囲が取得できない場合のデフォルト設定
          console.log('座標範囲が不明、デフォルト表示設定を使用');
          setZoom(1.0);
          setPan({ x: 400, y: 300 });
        }

        // 用紙サイズ情報があれば設定を更新
        if (sxfData.paperSize) {
          console.log('SFCファイルから用紙サイズを検出:', sxfData.paperSize);
          setPaperSettings(prev => ({
            ...prev,
            size: {
              id: 'sfc-custom',
              name: `SFC用紙 (${sxfData.paperSize!.width}×${sxfData.paperSize!.height})`,
              width: sxfData.paperSize!.width,
              height: sxfData.paperSize!.height
            }
          }));
        }
        
        const paperInfo = sxfData.paperSize ? 
          `\n\n用紙サイズ: ${sxfData.paperSize.width} × ${sxfData.paperSize.height}` : '';
        const summaryMessage = `${convertedElements.length}個の要素を正常にインポートしました\n\n解析結果:\n${parser.getSummary()}${paperInfo}`;
        console.log(summaryMessage);
        alert(summaryMessage);
      } else {
        console.log('変換可能な要素が見つかりませんでした');
        alert('変換可能な要素が見つかりませんでした\n\n解析結果:\n' + parser.getSummary());
      }
      
    } catch (error: any) {
      console.error('ファイルインポートエラー:', error);
      alert(`ファイルの読み込み中にエラーが発生しました:\n${error.message}`);
    }
  }, [paperSettings.coordinateSystem, convertSXFToCADElement]);

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
    
    // スクリーン座標からワールド座標に変換（単一ページ）
    return screenToWorld(screenX, screenY);
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
    
    // CSS座標系でパン用座標を計算
    const cssScreenPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // 中ボタンまたは選択ツール+ドラッグでパン開始
    if (e.button === 1 || (tool === 'pointer' && e.button === 0)) {
      setIsPanning(true);
      setLastPanPos(cssScreenPos); // CSS座標系を使用
      return;
    }
    
    const pos = getMousePos(e);
    
    if (tool === 'pointer') {
      // 要素選択
      const hitElement = findElementAtPosition(pos.x, pos.y);
      if (hitElement) {
        setSelectedElement(hitElement.id);
        
        // シングルクリックで詳細表示
        setSelectedElementDetails(hitElement);
        setShowElementDetails(true);
        
        // ダブルクリック判定（detail === 2）
        if (e.detail === 2) {
          handleEditElementProperties(hitElement.id);
        }
      } else {
        setSelectedElement(null);
      }
      return;
    }
    
    // コメント追加
    if (tool === 'comment') {
      setCommentPosition(pos);
      setShowCommentInput(true);
      return;
    }
    
    // 線分系ツールはクリック方式
    if (tool === 'line' || tool === 'line-thin' || tool === 'line-thick' || tool === 'line-bold' || tool === 'boundary_line' || tool === 'bezier' || tool === 'traverse_line' || tool === 'building_outline') {
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
  
  // テキスト作成・更新関数
  const handleCreateText = () => {
    console.log('handleCreateText 開始', { textInput, textPosition, editingTextElement });
    
    if (!textInput.trim()) {
      console.log('テキストが空のため処理終了');
      return;
    }

    try {
      if (editingTextElement) {
        // 既存テキストの更新
        console.log('テキスト更新モード');
        setElements(prev => prev.map(element => 
          element.id === editingTextElement.id
            ? {
                ...element,
                properties: {
                  ...element.properties,
                  text: textInput,
                  fontSize: textFontSize,
                  fontName: textFontName
                },
                updatedAt: new Date().toISOString(),
                version: element.version + 1
              }
            : element
        ));
      } else if (textPosition) {
        // 新規テキストの作成
        console.log('新規テキスト作成モード', textPosition);
        const newElement: CADElement = {
          id: `text_${Date.now()}`,
          type: 'text',
          layerId: activeLayer,
          points: [textPosition],
          properties: {
            stroke: currentStrokeColor,
            text: textInput,
            fontSize: textFontSize,
            fontName: textFontName
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        };

        console.log('新規テキスト要素:', newElement);
        setElements(prev => {
          const newElements = [...prev, newElement];
          console.log('要素追加後のリスト:', newElements);
          return newElements;
        });
      } else {
        console.log('エラー: textPositionがnull');
        return;
      }
      
      // リセット
      setShowTextModal(false);
      setTextInput('');
      setTextPosition(null);
      setEditingTextElement(null);
      console.log('テキスト作成完了、状態リセット');
    } catch (error) {
      console.error('テキスト作成エラー:', error);
    }
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
    
    // CSS座標でマウス位置を計算（DPR調整前）
    const cssScreenPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // 用紙座標（ワールド座標）を計算して保存（CSS座標を使用）
    const worldPos = screenToWorld(cssScreenPos.x, cssScreenPos.y);
    
    // デバッグ用ログ（一時的）
    if (Math.random() < 0.1) { // 10%の確率でログ出力
      console.log('=== マウス座標デバッグ ===');
      console.log('CSS座標:', cssScreenPos);
      console.log('DPR座標:', screenPos);
      console.log('ワールド座標:', worldPos);
      console.log('パン:', pan);
      console.log('ズーム:', zoom);
      console.log('========================');
    }
    
    setMouseCoords(worldPos);
    
    // パン処理（CSS座標系を使用）
    if (isPanning) {
      const deltaX = cssScreenPos.x - lastPanPos.x;
      const deltaY = cssScreenPos.y - lastPanPos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPos(cssScreenPos);
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
          stroke: currentStrokeColor,
          strokeWidth: 1
        },
        sxfAttributes: {
          layerName: layers.find(l => l.id === activeLayer)?.name || 'Default',
          lineType: currentDrawingProperties.lineType,
          lineWidth: currentDrawingProperties.lineWidth,
          color: currentDrawingProperties.color
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };
      
      setElements(prev => [...prev, newElement]);
      
      // データベースに永続化
      persistElement(newElement);
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

  // API要素からCAD要素への変換
  const convertApiElementToCAD = (apiElement: any): CADElement => {
    const baseElement: Partial<CADElement> = {
      id: apiElement.id,
      type: apiElement.type,
      visible: apiElement.visible !== false,
      locked: apiElement.locked || false,
      layerId: apiElement.layerId,
      properties: typeof apiElement.properties === 'string' 
        ? JSON.parse(apiElement.properties) 
        : apiElement.properties,
      style: typeof apiElement.style === 'string' 
        ? JSON.parse(apiElement.style) 
        : apiElement.style
    };

    // WKTジオメトリから座標情報を復元
    const geometryData = cadElementService.convertFromWKT(apiElement.geometry, apiElement.type);
    
    return {
      ...baseElement,
      ...geometryData,
      position: geometryData.position || { x: 0, y: 0 }
    } as CADElement;
  };

  // CAD要素の永続化（作成）
  const persistElement = async (element: CADElement) => {
    if (!currentDrawingId || !projectId) return;
    
    try {
      const apiElement = cadElementService.convertToApiElement(element, currentDrawingId, projectId);
      await cadElementService.createElement(apiElement);
    } catch (error) {
      console.error('Failed to persist element:', error);
    }
  };

  // CAD要素の永続化（更新）
  const persistElementUpdate = async (elementId: string, updates: Partial<CADElement>) => {
    if (!projectId) return;
    
    try {
      const updateData: any = {};
      if (updates.position || updates.startPosition || updates.endPosition || updates.points) {
        const tempElement = { ...updates, id: elementId } as CADElement;
        updateData.geometry = cadElementService.convertGeometryToWKT(tempElement);
      }
      if (updates.properties) updateData.properties = updates.properties;
      if (updates.style) updateData.style = updates.style;
      if (updates.visible !== undefined) updateData.visible = updates.visible;
      if (updates.locked !== undefined) updateData.locked = updates.locked;
      if (updates.layerId) updateData.layerId = updates.layerId;
      
      updateData.projectId = projectId;
      
      await cadElementService.updateElement(elementId, updateData);
    } catch (error) {
      console.error('Failed to persist element update:', error);
    }
  };

  // キーボードイベントリスナー
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // リアルタイム機能の初期化
  useEffect(() => {
    // プロジェクトに参加
    realtimeService.joinProject(projectId);
    setIsRealtimeConnected(realtimeService.isConnected());

    // 要素作成イベント
    const handleElementCreated = (element: any) => {
      setElements(prev => {
        // 重複を避けて追加
        if (prev.some(e => e.id === element.id)) return prev;
        
        const cadElement = convertApiElementToCAD(element);
        return [...prev, cadElement];
      });
    };

    // 要素更新イベント
    const handleElementUpdated = (element: any) => {
      setElements(prev => prev.map(e => 
        e.id === element.id ? { ...e, ...convertApiElementToCAD(element) } : e
      ));
    };

    // 要素削除イベント
    const handleElementDeleted = (data: { id: string }) => {
      setElements(prev => prev.filter(e => e.id !== data.id));
    };

    // 一括更新イベント
    const handleElementsBatchUpdated = (elements: any[]) => {
      setElements(prev => {
        const updatedMap = new Map(elements.map(el => [el.id, convertApiElementToCAD(el)]));
        return prev.map(e => updatedMap.has(e.id) ? updatedMap.get(e.id)! : e);
      });
    };

    // 座標更新イベント（リアルタイム）
    const handleCoordinateUpdate = (data: any) => {
      // 他のユーザーの座標変更を視覚的に表示（実装は後で）
      console.log('Coordinate update from other user:', data);
    };

    // イベントリスナーを登録
    realtimeService.on('element-created', handleElementCreated);
    realtimeService.on('element-updated', handleElementUpdated);
    realtimeService.on('element-deleted', handleElementDeleted);
    realtimeService.on('elements-batch-updated', handleElementsBatchUpdated);
    realtimeService.on('coordinate-update', handleCoordinateUpdate);

    return () => {
      // クリーンアップ
      realtimeService.off('element-created', handleElementCreated);
      realtimeService.off('element-updated', handleElementUpdated);
      realtimeService.off('element-deleted', handleElementDeleted);
      realtimeService.off('elements-batch-updated', handleElementsBatchUpdated);
      realtimeService.off('coordinate-update', handleCoordinateUpdate);
      realtimeService.leaveProject(projectId);
    };
  }, [projectId]);

  // 初期化時に用紙を中央に配置
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 少し遅延させてキャンバスサイズが確定してから実行
    const timer = setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const currentSize = paperSizes.find(p => p.id === paperSettings.size.id) || paperSizes[0];
        const paperWidth = paperSettings.orientation === 'landscape' 
          ? Math.max(currentSize.width, currentSize.height)
          : Math.min(currentSize.width, currentSize.height);
        const paperHeight = paperSettings.orientation === 'landscape' 
          ? Math.min(currentSize.width, currentSize.height)
          : Math.max(currentSize.width, currentSize.height);
        
        // 用紙を画面中央に配置するパン値を計算（200%ズーム時）
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const paperCenterX = (paperWidth * 2.0) / 2; // zoom = 2.0
        const paperCenterY = (paperHeight * 2.0) / 2; // zoom = 2.0
        
        setPan({ 
          x: centerX - paperCenterX, 
          y: centerY - paperCenterY 
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [paperSettings]); // paperSettingsが変更されたときも再実行

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // パン終了
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // ダブルクリック検出
    if (e.detail === 2) {
      // 線描画終了
      if (isLineDrawing) {
        finishLineDrawing();
        return;
      }
      
      // テキスト編集（ダブルクリックでテキスト要素を編集）
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const worldPos = screenToWorld(x, y);
        
        // クリック位置にあるテキスト要素を検索
        const clickedTextElement = elements.find(element => {
          if (element.type === 'text' && element.points?.length >= 1) {
            const textPos = element.points[0];
            const distance = Math.sqrt(
              Math.pow(worldPos.x - textPos.x, 2) + 
              Math.pow(worldPos.y - textPos.y, 2)
            );
            return distance < 20; // 20px以内
          }
          return false;
        });
        
        if (clickedTextElement) {
          // テキスト編集モードに入る
          setEditingTextElement(clickedTextElement);
          setTextInput(clickedTextElement.properties.text || '');
          setTextFontSize(clickedTextElement.properties.fontSize || 12);
          setTextFontName(clickedTextElement.properties.fontName || 'MS Gothic');
          setShowTextModal(true);
          return;
        }
      }
    }

    // テキストツールの場合はテキスト入力モーダルを表示
    if (tool === 'text') {
      // テキストツール使用時はメインレイヤーを使用
      if (activeLayer !== 'MAIN') {
        setActiveLayer('MAIN');
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const worldPos = screenToWorld(x, y);
        console.log('テキストツール: 座標設定', worldPos);
        setTextPosition(worldPos);
        setShowTextModal(true);
        return;
      }
    }
    
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    let finalPath: CADPoint[];
    
    // ツールごとに適切なポイント数に調整
    if (tool === 'line' || tool === 'line-thin' || tool === 'line-thick' || tool === 'line-bold') {
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
    // 線幅をツールに応じて設定
    let strokeWidth = 1; // デフォルト
    if (tool === 'line-thin') strokeWidth = 0.5;
    else if (tool === 'line-thick') strokeWidth = 3;
    else if (tool === 'line-bold') strokeWidth = 5;
    else if (tool === 'boundary_line') strokeWidth = 2;
    else if (tool === 'traverse_line') strokeWidth = 2;
    
    const baseProperties = {
      stroke: currentStrokeColor,
      strokeWidth: strokeWidth
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
      },
      sxfAttributes: {
        layerName: layers.find(l => l.id === activeLayer)?.name || 'Default',
        lineType: currentDrawingProperties.lineType,
        lineWidth: tool === 'boundary_line' ? 0.7 : tool === 'traverse_line' ? 0.7 : currentDrawingProperties.lineWidth,
        color: currentDrawingProperties.color
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };
    
    setElements(prev => [...prev, newElement]);
    
    // データベースに永続化
    persistElement(newElement);
    
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
    // 目標: 用紙の左下角(0,0)を適切な位置に配置
    const screenCenterX = rect.width / 2;
    const screenCenterY = rect.height / 2;
    
    // 新しい座標変換に基づくパン値計算
    // worldToScreen式: screenX = worldX * zoom + pan.x, screenY = pan.y + (paperHeight - worldY) * zoom
    // pan.x = 用紙左端のスクリーンX座標 (worldX=0の時のscreenX)  
    // pan.y = 用紙上端のスクリーンY座標 (worldY=paperHeightの時のscreenY)
    
    // 用紙中心(paperWidth/2, paperHeight/2)をスクリーン中央に配置
    // screenCenterX = (paperWidth/2) * fitZoom + pan.x  →  pan.x = screenCenterX - (paperWidth/2) * fitZoom
    // screenCenterY = pan.y + (paperHeight - paperHeight/2) * fitZoom = pan.y + (paperHeight/2) * fitZoom
    // →  pan.y = screenCenterY - (paperHeight/2) * fitZoom
    
    const panX = screenCenterX - (paperWidth / 2) * fitZoom;
    const panY = screenCenterY - (paperHeight / 2) * fitZoom;
    
    setZoom(fitZoom);
    setPan({ 
      x: panX,
      y: panY
    });
    
    console.log('ZoomFit設定:', {
      paperWidth, paperHeight, fitZoom,
      screenCenter: { x: screenCenterX, y: screenCenterY },
      pan: { x: panX, y: panY }
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
    // CSS座標系でマウス位置を取得（DPR調整なし）
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // ズーム倍率（大きな座標系の場合はより細かく調整）
    const zoomFactor = zoom < 0.1 ? 
      (e.deltaY > 0 ? 0.95 : 1.05) :  // 小さなズームでは細かく調整
      (e.deltaY > 0 ? 0.9 : 1.1);     // 通常のズーム調整
    
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.0001), 20);
    
    // デバッグログ（大きな座標系の場合）
    if (zoom < 0.1) {
      console.log(`ズーム調整: ${zoom.toFixed(6)} -> ${newZoom.toFixed(6)}, パン: (${pan.x.toFixed(2)}, ${pan.y.toFixed(2)})`);
    }
    
    // マウス位置を中心にズーム（CSS座標系を使用）
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
      // デフォルト色番号
      dxfContent.push('7');
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
        case 'bezier':
          if (element.points?.length >= 2) {
            for (let i = 0; i < element.points?.length - 1; i++) {
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
          if (element.points?.length >= 2) {
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
          if (element.points?.length >= 1) {
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
          if (element.points?.length >= 1 && element.properties.text) {
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
    const requiredLayers = ['MAIN'];
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
        contourLines: elements.filter(e => e.type === 'bezier').length,
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
      name: layer.id, // レイヤー名
      description: layer.description,
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
        let currentLayer = 'MAIN';
        
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
            currentLayer = layers.find(l => l.name === value)?.id || 'MAIN';
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
          if (element.points?.length >= 2) {
            const pathData = element.points.map((point, index) => {
              return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
            }).join(' ');
            svgElements.push(`<path d="${pathData}" stroke="${element.style?.strokeColor || '#FF0000'}" stroke-width="${element.style?.strokeWidth || 1}" fill="none"/>`);
          }
          break;

        case 'bezier':
          if (element.points?.length >= 2) {
            let pathData = `M ${element.points[0].x} ${element.points[0].y}`;
            
            if (element.points.length >= 4) {
              // 4点以上の場合：4点ずつ三次ベジェ曲線を描画
              for (let i = 0; i < element.points.length - 3; i += 3) {
                const cp1 = element.points[i + 1];
                const cp2 = element.points[i + 2];
                const p1 = element.points[i + 3];
                pathData += ` C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${p1.x} ${p1.y}`;
              }
            } else if (element.points.length === 3) {
              // 3点の場合は制御点を複製して三次ベジェ曲線に変換
              pathData += ` C ${element.points[1].x} ${element.points[1].y} ${element.points[1].x} ${element.points[1].y} ${element.points[2].x} ${element.points[2].y}`;
            } else if (element.points.length === 2) {
              // 2点の場合は直線として三次ベジェ曲線で描画
              const dx = (element.points[1].x - element.points[0].x) / 3;
              const dy = (element.points[1].y - element.points[0].y) / 3;
              const cp1x = element.points[0].x + dx;
              const cp1y = element.points[0].y + dy;
              const cp2x = element.points[0].x + 2 * dx;
              const cp2y = element.points[0].y + 2 * dy;
              pathData += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${element.points[1].x} ${element.points[1].y}`;
            }
            
            svgElements.push(`<path d="${pathData}" stroke="${element.style?.strokeColor || '#804000'}" stroke-width="${element.style?.strokeWidth || 1}" fill="none"/>`);
          }
          break;
          
        case 'circle':
          if (element.points?.length >= 2) {
            const center = element.points[0];
            const edge = element.points[1];
            const radius = Math.sqrt(
              Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
            );
            svgElements.push(`<circle cx="${center.x}" cy="${center.y}" r="${radius}" stroke="${element.style?.strokeColor || '#FF0000'}" stroke-width="${element.style?.strokeWidth || 1}" fill="${element.style?.fillColor || 'none'}"/>`);
          }
          break;
          
        case 'point':
        case 'survey_point':
          if (element.points?.length >= 1) {
            const point = element.points[0];
            svgElements.push(`<circle cx="${point.x}" cy="${point.y}" r="3" fill="${element.style?.strokeColor || '#FF0000'}"/>`);
            svgElements.push(`<line x1="${point.x - 8}" y1="${point.y}" x2="${point.x + 8}" y2="${point.y}" stroke="${element.style?.strokeColor || '#FF0000'}" stroke-width="2"/>`);
            svgElements.push(`<line x1="${point.x}" y1="${point.y - 8}" x2="${point.x}" y2="${point.y + 8}" stroke="${element.style?.strokeColor || '#FF0000'}" stroke-width="2"/>`);
          }
          break;
          
        case 'text':
          if (element.points?.length >= 1 && element.properties.text) {
            const point = element.points[0];
            svgElements.push(`<text x="${point.x}" y="${point.y}" font-size="${element.properties.fontSize || 12}" fill="${element.style?.strokeColor || '#FF0000'}">${element.properties.text}</text>`);
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

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'CloudCAD - CAD図面作成システム';
    return () => {
      document.title = 'CloudCAD';
    };
  }, []);

  return (
    <Box h="100vh" w="100vw" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ツールバー */}
      <Paper shadow="sm" p="sm" withBorder style={{ width: '100%' }}>
        <Group justify="space-between">
          <Group>
            {/* プロジェクト詳細に戻る */}
            <Tooltip label="プロジェクト詳細に戻る">
              <ActionIcon 
                variant="light" 
                color="gray"
                onClick={onClose}
                size="lg"
              >
                <IconArrowLeft size={18} />
              </ActionIcon>
            </Tooltip>
            
            <Divider orientation="vertical" />
            
            {/* ファイル操作 */}
            <Group gap="xs">
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Tooltip label="ファイルを開く">
                    <ActionIcon variant="light" color="blue">
                      <IconFolderOpen size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>インポート</Menu.Label>
                  <Menu.Item 
                    leftSection={<IconFileImport size={16} />}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.sxf,.sfc,.p21';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          handleImportSXF(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    SXF/SFC/P21ファイル
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileImport size={16} />}
                    onClick={() => {
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
                    }}
                  >
                    JSONファイル
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileImport size={16} />}
                    onClick={() => {
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
                    }}
                  >
                    DXFファイル
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Tooltip label="ファイルを保存">
                    <ActionIcon variant="light" color="green">
                      <IconDeviceFloppy size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>エクスポート</Menu.Label>
                  <Menu.Item 
                    leftSection={<IconFileExport size={16} />}
                    onClick={exportToJSON}
                  >
                    JSON形式
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileExport size={16} />}
                    onClick={exportToSVG}
                  >
                    SVG形式
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileExport size={16} />}
                    onClick={exportToDXF}
                  >
                    DXF形式
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileExport size={16} />}
                    onClick={exportToSXF}
                  >
                    SXF形式
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileExport size={16} />}
                    onClick={handleExportP21}
                  >
                    P21形式
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item 
                    leftSection={<IconSettings size={16} />}
                    onClick={() => {
                      const validation = validateOCFCompliance();
                      const message = validation.isCompliant 
                        ? 'OCF検定に適合しています。'
                        : `OCF検定に非適合です。\n\n問題:\n${validation.issues.join('\n')}`;
                      alert(message);
                    }}
                  >
                    OCF検定
                  </Menu.Item>
                  <Menu.Item 
                    leftSection={<IconFileText size={16} />}
                    onClick={generateOCFReport}
                  >
                    OCFレポート
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              
              <Tooltip label="CADデータ保存">
                <ActionIcon variant="light" color="orange" onClick={saveCADData}>
                  <IconDatabase size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            
            <Divider orientation="vertical" />
            
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
              <Tooltip label="点要素（基準点・測量点）">
                <ActionIcon
                  variant={tool === 'point' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('point')}
                >
                  <IconMapPin size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="ベジェ曲線">
                <ActionIcon
                  variant={tool === 'bezier' ? 'filled' : 'light'}
                  onClick={() => handleToolChange('bezier')}
                >
                  <IconWaveSine size={18} />
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
            {/* レイヤー選択 */}
            <Select
              data={[
                ...layers.filter(l => l.visible).map(l => ({ value: l.id, label: l.name })),
                { value: '___new___', label: '+ 新規作成' }
              ]}
              value={activeLayer}
              onChange={(value) => {
                if (value === '___new___') {
                  console.log('新規レイヤー作成を開始');
                  setShowNewLayerModal(true);
                } else {
                  setActiveLayer(value || 'MAIN');
                }
              }}
              placeholder="レイヤー"
              w={120}
              size="xs"
              styles={{
                dropdown: { zIndex: 999 }
              }}
            />
            
            {/* 描画プロパティ設定 */}
            <Group gap="xs">
              <Select
                value={currentDrawingProperties.lineType}
                onChange={(value) => {
                  if (value) {
                    setCurrentDrawingProperties(prev => ({ ...prev, lineType: value }));
                  }
                }}
                data={lineTypes.map(lt => ({ value: lt.value, label: lt.label }))}
                placeholder="線種"
                w={100}
                size="xs"
                styles={{ dropdown: { zIndex: 1001 } }}
              />
              
              <Select
                value={currentDrawingProperties.lineWidth.toString()}
                onChange={(value) => {
                  if (value) {
                    setCurrentDrawingProperties(prev => ({ ...prev, lineWidth: parseFloat(value) }));
                  }
                }}
                data={lineWidths.map(lw => ({ value: lw.value.toString(), label: lw.label }))}
                placeholder="線幅"
                w={120}
                size="xs"
                styles={{ dropdown: { zIndex: 1001 } }}
              />
              
              <Select
                value={currentDrawingProperties.color}
                onChange={(value) => {
                  if (value) {
                    setCurrentDrawingProperties(prev => ({ ...prev, color: value }));
                  }
                }}
                data={elementColors.map(color => ({ 
                  value: color.value, 
                  label: color.label,
                  leftSection: <div style={{
                    width: 12,
                    height: 12,
                    backgroundColor: color.value,
                    border: '1px solid #ccc',
                    borderRadius: 2
                  }} />
                }))}
                placeholder="色"
                w={100}
                size="xs"
                styles={{ dropdown: { zIndex: 1001 } }}
              />
            </Group>
            
            <Divider orientation="vertical" />
            
            {/* CADレベル選択 */}
            <Select
              value={coordinateSystem.activeLevel}
              onChange={(value) => {
                if (value === '___new_level___') {
                  setShowNewLevelModal(true);
                } else if (value) {
                  setCoordinateSystem(prev => ({
                    ...prev,
                    activeLevel: value
                  }));
                }
              }}
              data={[
                { 
                  value: coordinateSystem.paperLevel.id, 
                  label: `用紙: ${coordinateSystem.paperLevel.name}` 
                },
                ...coordinateSystem.levels.filter((level, index, arr) => 
                  arr.findIndex(l => l.id === level.id) === index
                ).map(level => ({ 
                  value: level.id, 
                  label: `レベル${level.levelNumber}: ${level.name} (1/${Math.round(1/level.scaleX)})` 
                })),
                { value: '___new_level___', label: '+ 新規レベル作成' }
              ]}
              placeholder="座標レベル"
              w={180}
              size="xs"
              styles={{ dropdown: { zIndex: 1001 } }}
            />
          </Group>
        </Group>
      </Paper>
      
      
      {/* CAD編集メインコンテンツ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          
          {/* CAD編集メインキャンバス */}
          <Box style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            cursor: isPanning ? 'grabbing' : 'crosshair',
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
                tool === 'point' ? '点要素' :
                tool === 'survey_point' ? '測量点' :
                tool === 'boundary_line' ? '境界線' :
                tool === 'bezier' ? 'ベジェ曲線' :
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
                        {editingLayer === layer.id ? (
                          <TextInput
                            value={editingLayerName}
                            onChange={(e) => setEditingLayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveLayerEdit();
                              } else if (e.key === 'Escape') {
                                setEditingLayer(null);
                                setEditingLayerName('');
                              }
                            }}
                            onBlur={handleSaveLayerEdit}
                            size="xs"
                            autoFocus
                          />
                        ) : (
                          <Menu shadow="md" width={150}>
                            <Menu.Target>
                              <Text 
                                fw={500} 
                                style={{ cursor: 'context-menu' }}
                                onContextMenu={(e) => e.preventDefault()}
                              >
                                {layer.name}
                              </Text>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item 
                                leftSection={<IconEdit size={14} />}
                                onClick={() => handleEditLayer(layer.id)}
                              >
                                名前を編集
                              </Menu.Item>
                              {!['MAIN', 'REFERENCE', 'TEMPORARY'].includes(layer.id) && (
                                <Menu.Item 
                                  leftSection={<IconTrash size={14} />}
                                  onClick={() => handleDeleteLayer(layer.id)}
                                  color="red"
                                >
                                  レイヤーを削除
                                </Menu.Item>
                              )}
                            </Menu.Dropdown>
                          </Menu>
                        )}
                        <Text size="xs" c="dimmed">{layer.description}</Text>
                      </Stack>
                    </Group>
                    <Badge
                      variant={activeLayer === layer.id ? 'filled' : 'light'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveLayer(layer.id)}
                    >
                      {activeLayer === layer.id ? '作業中' : '選択'}
                    </Badge>
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
                      stroke: currentStrokeColor,
                      strokeWidth: 2,
                      pointNumber: `P${elements.filter(e => e.type === 'survey_point').length + 1}`
                    },
                    coordinates: {
                      realX: coordinateInput.x * 1000, // メートルからミリメートルに変換
                      realY: coordinateInput.y * 1000,
                      realZ: 0
                    },
                    sxfAttributes: {
                      layerName: layers.find(l => l.id === activeLayer)?.name || 'Default',
                      lineType: currentDrawingProperties.lineType,
                      lineWidth: currentDrawingProperties.lineWidth,
                      color: currentDrawingProperties.color
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1
                  };
                  
                  setElements(prev => [...prev, newElement]);
                  
                  // データベースに永続化
                  persistElement(newElement);
                  
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
      
      {/* 座標追加・編集モーダル */}
      <Modal
        opened={showCoordinateModal}
        onClose={() => setShowCoordinateModal(false)}
        title={editingCoordinate ? "座標点編集" : "座標点追加"}
        size="lg"
      >
        <Stack>
          <TextInput
            label="点名"
            placeholder="座標点名を入力"
            defaultValue={editingCoordinate?.pointName || ''}
          />
          <NumberInput
            label="X座標 (メートル)"
            placeholder="X座標を入力"
            defaultValue={editingCoordinate?.x || 0}
            decimalScale={3}
            step={0.001}
          />
          <NumberInput
            label="Y座標 (メートル)"
            placeholder="Y座標を入力"
            defaultValue={editingCoordinate?.y || 0}
            decimalScale={3}
            step={0.001}
          />
          <NumberInput
            label="Z座標 (メートル)"
            placeholder="Z座標を入力"
            defaultValue={editingCoordinate?.z || 0}
            decimalScale={3}
            step={0.001}
          />
          <Select
            label="座標種別"
            defaultValue={editingCoordinate?.type || 'benchmark'}
            data={[
              { value: 'survey', label: '測量点' },
              { value: 'benchmark', label: '水準点' }
            ]}
          />
          <Textarea
            label="備考"
            placeholder="備考を入力"
            defaultValue={editingCoordinate?.description || ''}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setShowCoordinateModal(false)}>
              キャンセル
            </Button>
            <Button onClick={() => {
              // Save coordinate logic would go here
              setShowCoordinateModal(false);
            }}>
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* 要素プロパティ編集モーダル */}
      <Modal
        opened={showPropertiesPanel}
        onClose={handleCancelElementProperties}
        title={`要素プロパティ編集 (${editingElementProperties?.type || ''})`}
        size="lg"
      >
        {editingElementProperties && (
          <Stack>
            <Group grow>
              <Select
                label="レイヤ"
                value={editingElementProperties.sxfAttributes?.layerName || editingElementProperties.layerId}
                onChange={(value) => {
                  if (value && editingElementProperties) {
                    const layer = layers.find(l => l.name === value || l.id === value);
                    setEditingElementProperties({
                      ...editingElementProperties,
                      layerId: layer?.id || value,
                      sxfAttributes: {
                        ...editingElementProperties.sxfAttributes,
                        layerName: layer?.name || value
                      }
                    });
                  }
                }}
                data={layers.map(layer => ({ value: layer.name, label: layer.name }))}
              />
              
              <Select
                label="線種"
                value={editingElementProperties.sxfAttributes?.lineType || 'solid'}
                onChange={(value) => {
                  if (value && editingElementProperties) {
                    setEditingElementProperties({
                      ...editingElementProperties,
                      sxfAttributes: {
                        ...editingElementProperties.sxfAttributes,
                        lineType: value
                      }
                    });
                  }
                }}
                data={lineTypes.map(lt => ({ value: lt.value, label: lt.label }))}
              />
            </Group>
            
            <Group grow>
              <Select
                label="線幅"
                value={editingElementProperties.sxfAttributes?.lineWidth?.toString() || '0.35'}
                onChange={(value) => {
                  if (value && editingElementProperties) {
                    setEditingElementProperties({
                      ...editingElementProperties,
                      sxfAttributes: {
                        ...editingElementProperties.sxfAttributes,
                        lineWidth: parseFloat(value)
                      }
                    });
                  }
                }}
                data={lineWidths.map(lw => ({ value: lw.value.toString(), label: lw.label }))}
              />
              
              <Select
                label="色"
                value={editingElementProperties.sxfAttributes?.color || '#000000'}
                onChange={(value) => {
                  if (value && editingElementProperties) {
                    setEditingElementProperties({
                      ...editingElementProperties,
                      sxfAttributes: {
                        ...editingElementProperties.sxfAttributes,
                        color: value
                      },
                      properties: {
                        ...editingElementProperties.properties,
                        stroke: value
                      }
                    });
                  }
                }}
                data={elementColors.map(color => ({ 
                  value: color.value, 
                  label: color.label,
                  // カラーサンプルを表示
                  leftSection: <div style={{
                    width: 16,
                    height: 16,
                    backgroundColor: color.value,
                    border: '1px solid #ccc',
                    borderRadius: 2
                  }} />
                }))}
              />
            </Group>
            
            {/* 要素固有のプロパティ */}
            {(editingElementProperties.type === 'text' || editingElementProperties.type === 'comment') && (
              <Textarea
                label="テキスト内容"
                value={editingElementProperties.properties.text || ''}
                onChange={(e) => {
                  setEditingElementProperties({
                    ...editingElementProperties,
                    properties: {
                      ...editingElementProperties.properties,
                      text: e.target.value
                    }
                  });
                }}
                minRows={2}
              />
            )}
            
            {editingElementProperties.type === 'survey_point' && (
              <TextInput
                label="点番号"
                value={editingElementProperties.properties.pointNumber || ''}
                onChange={(e) => {
                  setEditingElementProperties({
                    ...editingElementProperties,
                    properties: {
                      ...editingElementProperties.properties,
                      pointNumber: e.target.value
                    }
                  });
                }}
              />
            )}
            
            <Group justify="flex-end">
              <Button variant="light" onClick={handleCancelElementProperties}>
                キャンセル
              </Button>
              <Button onClick={() => handleSaveElementProperties(editingElementProperties)}>
                保存
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* 要素詳細表示モーダル */}
      <Modal
        opened={showElementDetails}
        onClose={() => setShowElementDetails(false)}
        title="要素詳細情報"
        size="md"
      >
        {selectedElementDetails && (
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Badge size="lg" variant="light" color="blue">
                {(selectedElementDetails as any).sxfType === 'line_feature' ? 'Line Feature' : 
                 (selectedElementDetails as any).sxfType === 'polyline_feature' ? 'Polyline Feature' :
                 selectedElementDetails.type === 'line' ? '線分' : 
                 selectedElementDetails.type}
              </Badge>
              <Text size="sm" c="dimmed">ID: {selectedElementDetails.id}</Text>
            </Group>

            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Text fw={500}>レベル</Text></Table.Td>
                  <Table.Td>
                    {(() => {
                      const elementLevel = coordinateSystem.levels.find(l => l.id === selectedElementDetails.levelId) || coordinateSystem.paperLevel;
                      return `レベル${elementLevel.levelNumber}: ${elementLevel.name}`;
                    })()}
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text fw={500}>レイヤ</Text></Table.Td>
                  <Table.Td>{(selectedElementDetails as any).layer || selectedElementDetails.layerId || 'デフォルト'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text fw={500}>色</Text></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <div 
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: (selectedElementDetails as any).color || selectedElementDetails.style?.stroke || '#000000',
                          border: '1px solid #ccc',
                          borderRadius: 2
                        }}
                      />
                      {(selectedElementDetails as any).color || selectedElementDetails.style?.stroke || '#000000'}
                    </Group>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text fw={500}>線種</Text></Table.Td>
                  <Table.Td>{(selectedElementDetails as any).lineType || '実線'}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text fw={500}>ペン</Text></Table.Td>
                  <Table.Td>{(selectedElementDetails as any).pen || selectedElementDetails.style?.strokeWidth || 'デフォルト'}</Table.Td>
                </Table.Tr>
                {selectedElementDetails.points && selectedElementDetails.points.length > 0 && (
                  <Table.Tr>
                    <Table.Td><Text fw={500}>座標</Text></Table.Td>
                    <Table.Td>
                      <Stack gap="xs">
                        {selectedElementDetails.points.map((point, index) => (
                          <Text key={index} size="sm" ff="monospace">
                            P{index + 1}: ({point.x.toFixed(3)}, {point.y.toFixed(3)})
                          </Text>
                        ))}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                )}
                {selectedElementDetails.createdAt && (
                  <Table.Tr>
                    <Table.Td><Text fw={500}>作成日時</Text></Table.Td>
                    <Table.Td>{new Date(selectedElementDetails.createdAt).toLocaleString('ja-JP')}</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setShowElementDetails(false)}>
                閉じる
              </Button>
              <Button 
                onClick={() => {
                  setShowElementDetails(false);
                  handleEditElementProperties(selectedElementDetails.id);
                }}
              >
                プロパティ編集
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* テキスト入力モーダル */}
      <Modal
        opened={showTextModal}
        onClose={() => {
          setShowTextModal(false);
          setTextInput('');
          setTextPosition(null);
          setEditingTextElement(null);
        }}
        title={editingTextElement ? "テキスト編集" : "テキスト入力"}
        size="md"
        centered
        zIndex={1000}
        withinPortal={false}
      >
        <Stack spacing="md">
          <TextInput
            label="テキスト"
            placeholder="テキストを入力してください"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            autoFocus
          />
          
          <Group grow>
            <NumberInput
              label="フォントサイズ"
              value={textFontSize}
              onChange={(value) => setTextFontSize(value || 12)}
              min={8}
              max={72}
              step={1}
            />
            <Select
              label="フォント"
              value={textFontName}
              onChange={(value) => setTextFontName(value || 'MS Gothic')}
              data={[
                { value: 'MS Gothic', label: 'MS ゴシック' },
                { value: 'MS Mincho', label: 'MS 明朝' },
                { value: 'Arial', label: 'Arial' },
                { value: 'Times New Roman', label: 'Times New Roman' },
                { value: 'Courier New', label: 'Courier New' }
              ]}
            />
          </Group>
          
          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowTextModal(false);
                setTextInput('');
                setTextPosition(null);
                setEditingTextElement(null);
              }}
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleCreateText}
              disabled={!textInput.trim()}
            >
              {editingTextElement ? "更新" : "作成"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 新規レイヤー作成モーダル */}
      {console.log('モーダル状態:', showNewLayerModal)}
      <Modal
        opened={showNewLayerModal}
        onClose={() => {
          setShowNewLayerModal(false);
          setNewLayerName('');
        }}
        title="新規レイヤー作成"
        size="md"
        centered
        zIndex={1002}
        withinPortal={false}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          header: { zIndex: 1003 },
          body: { zIndex: 1003 },
          content: { zIndex: 1003 },
          overlay: { zIndex: 1002 }
        }}
      >
        <Stack spacing="md">
          <TextInput
            label="レイヤー名"
            placeholder="レイヤー名を入力してください"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newLayerName.trim()) {
                handleCreateNewLayer();
              }
            }}
            autoFocus
          />
          
          <Group justify="flex-end" mt="md">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewLayerModal(false);
                setNewLayerName('');
              }}
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleCreateNewLayer}
              disabled={!newLayerName.trim()}
            >
              作成
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 新規レベル作成モーダル */}
      <Modal
        opened={showNewLevelModal}
        onClose={() => {
          setShowNewLevelModal(false);
          handleResetNewLevel();
        }}
        title="新規レベル作成"
        size="lg"
        centered
        zIndex={1004}
        withinPortal={false}
      >
        <Stack spacing="md">
          <Group grow>
            <TextInput
              label="レベル名"
              placeholder="レベル名を入力"
              value={newLevel.name}
              onChange={(e) => setNewLevel(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextInput
              label="説明"
              placeholder="レベルの説明（任意）"
              value={newLevel.description}
              onChange={(e) => setNewLevel(prev => ({ ...prev, description: e.target.value }))}
            />
          </Group>

          <Text size="sm" fw={500} mt="md">原点設定</Text>
          <Group grow>
            <NumberInput
              label="原点X座標 (mm)"
              value={newLevel.originX}
              onChange={(value) => setNewLevel(prev => ({ ...prev, originX: Number(value) || 0 }))}
              step={0.1}
              precision={2}
            />
            <NumberInput
              label="原点Y座標 (mm)"
              value={newLevel.originY}
              onChange={(value) => setNewLevel(prev => ({ ...prev, originY: Number(value) || 0 }))}
              step={0.1}
              precision={2}
            />
          </Group>

          <Text size="sm" fw={500} mt="md">回転・縮尺設定</Text>
          <Group grow>
            <NumberInput
              label="回転角度 (度)"
              value={newLevel.rotation}
              onChange={(value) => setNewLevel(prev => ({ ...prev, rotation: Number(value) || 0 }))}
              step={0.1}
              precision={2}
              min={-360}
              max={360}
            />
            <NumberInput
              label="X方向縮尺"
              value={newLevel.scaleX}
              onChange={(value) => setNewLevel(prev => ({ ...prev, scaleX: Number(value) || 1.0 }))}
              step={0.1}
              precision={3}
              min={0.001}
              max={1000}
            />
            <NumberInput
              label="Y方向縮尺"
              value={newLevel.scaleY}
              onChange={(value) => setNewLevel(prev => ({ ...prev, scaleY: Number(value) || 1.0 }))}
              step={0.1}
              precision={3}
              min={0.001}
              max={1000}
            />
          </Group>

          <Group grow mt="md">
            <Button
              variant="outline"
              onClick={handleResetNewLevel}
            >
              リセット
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewLevelModal(false);
                handleResetNewLevel();
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreateNewLevel}
              disabled={!newLevel.name.trim()}
            >
              作成
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* マウス座標表示 */}
      <Paper 
        p="xs" 
        withBorder 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 0,
          borderTop: '1px solid #dee2e6'
        }}
      >
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            {mouseCoords 
              ? `マウス位置: X=${mouseCoords.x.toFixed(2)}mm(右), Y=${mouseCoords.y.toFixed(2)}mm(上)`
              : 'マウス位置: ---'
            }
          </Text>
          <Text size="sm" c="dimmed">
            ズーム: {(zoom * 100).toFixed(0)}% | 用紙: {paperSettings.size.name} ({paperSettings.orientation === 'landscape' ? '横' : '縦'})
          </Text>
        </Group>
        
        {/* 現在のレベル詳細情報 */}
        <Group justify="center" mt="xs">
          <Text size="xs" c="blue" fw={500}>
            {(() => {
              const activeLevel = coordinateSystem.levels.find(l => l.id === coordinateSystem.activeLevel) || coordinateSystem.paperLevel;
              const levelDisplay = activeLevel.levelNumber === 0 ? 'レベル0(用紙)' : `レベル${activeLevel.levelNumber}`;
              const scaleDisplay = `1/${Math.round(1/activeLevel.scaleX)}`;
              const originDisplay = `原点(${activeLevel.originX.toFixed(2)}, ${activeLevel.originY.toFixed(2)})`;
              const rotationDisplay = activeLevel.rotation !== 0 ? `, 回転${activeLevel.rotation.toFixed(2)}°` : '';
              
              return `${levelDisplay}: ${activeLevel.name} | 縮尺${scaleDisplay} | ${originDisplay}${rotationDisplay}`;
            })()}
          </Text>
        </Group>
      </Paper>
      </div>
    </Box>
  );
};

export default CADEditor;
