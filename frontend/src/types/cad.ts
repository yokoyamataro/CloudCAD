// CAD関連の型定義を集約

export interface CADPoint {
  x: number;
  y: number;
}

export interface CADElement {
  id: string;
  type: 'line' | 'circle' | 'rectangle' | 'text' | 'comment' | 'dimension' | 'point' | 'survey_point' | 'boundary_line' | 'contour_line' | 'benchmark' | 'traverse_line' | 'control_point' | 'building_outline';
  layerId: string;
  points: CADPoint[];
  properties: {
    stroke: string;
    strokeWidth?: number;
    fill?: string;
    text?: string;
    fontSize?: number;
    // 測量専用プロパティ
    pointNumber?: string;      // 点番号
    elevation?: number;        // 標高
    accuracy?: string;         // 精度等級
    coordinateSystem?: number; // 座標系番号
    surveyMethod?: string;     // 測量手法
    angle?: number;            // 角度（方位角等）
    distance?: number;         // 距離
    azimuth?: number;          // 方位角
    buildingType?: string;     // 建物種別
    rotation?: number;         // 回転角度
  };
  // SXF/P21エクスポート用の追加プロパティ
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  centerX?: number;
  centerY?: number;
  radius?: number;
  color?: string;
  lineWidth?: number;
  text?: string;
  fontSize?: number;
  rotation?: number;
  coordinates?: {
    realX: number; // 実座標（ミリ単位）
    realY: number;
    realZ?: number; // 標高（ミリ単位）
  };
  // SXF準拠の属性
  sxfAttributes?: {
    layerName: string;
    lineType: string;
    lineWidth: number;
    color: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PaperSize {
  id: string;
  name: string;
  width: number;
  height: number;
}

export interface PaperSettings {
  size: PaperSize;
  orientation: 'portrait' | 'landscape';
  margin: number;
  scale: string;
  showBorder: boolean;
  coordinateSystem: number;
}

export interface CADLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  description?: string;
}

export interface CADPage {
  id: string;
  name: string;
  elements: CADElement[];
  paperSettings: PaperSettings;
  position: { x: number; y: number };
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MultiPageLayout {
  columns: number;
  rows: number;
  pageSpacing: number;
  padding: number;
}

export interface CADLevel {
  id: string;
  name: string;
  levelNumber: number;  // 読込順の番号（1,2,3...）、$$ATRU$$は0番
  originX: number;      // 原点X座標
  originY: number;      // 原点Y座標
  rotation: number;     // 回転角度（度）
  scaleX: number;       // X方向縮尺
  scaleY: number;       // Y方向縮尺
  description?: string; // 説明
  isActive?: boolean;   // アクティブレベル
}

export interface CADCoordinateSystem {
  paperLevel: CADLevel;    // 用紙レベル（1/1, 0,0, 0度）
  levels: CADLevel[];      // 作業レベル群
  activeLevel: string;     // 現在アクティブなレベルID
}