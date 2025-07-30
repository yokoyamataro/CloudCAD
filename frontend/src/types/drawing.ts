import * as THREE from 'three';

// 基本図形の型定義
export interface DrawingElement {
  id: string;
  type: 'line' | 'point' | 'text' | 'polygon';
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  mesh?: THREE.Mesh | THREE.Line | THREE.Points;
  visible: boolean;
  locked: boolean;
  layer?: string;
}

// 線分の型定義
export interface LineElement extends DrawingElement {
  type: 'line';
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  lineWidth?: number;
  color?: string;
}

// 点の型定義
export interface PointElement extends DrawingElement {
  type: 'point';
  position: THREE.Vector3;
  size?: number;
  color?: string;
  symbol?: string;
}

// テキストの型定義
export interface TextElement extends DrawingElement {
  type: 'text';
  position: THREE.Vector3;
  text: string;
  fontSize?: number;
  color?: string;
  rotation?: number;
}

// ポリゴンの型定義
export interface PolygonElement extends DrawingElement {
  type: 'polygon';
  points: THREE.Vector3[];
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// 描画設定
export interface DrawingSettings {
  backgroundColor: string;
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  defaultLineColor: string;
  defaultPointColor: string;
  defaultTextColor: string;
}

// カメラ設定
export interface CameraSettings {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
  is2D: boolean;
}

// 描画状態
export interface DrawingState {
  elements: DrawingElement[];
  selectedElements: string[];
  currentTool: 'select' | 'line' | 'point' | 'text' | 'polygon' | 'pan' | 'zoom';
  settings: DrawingSettings;
  camera: CameraSettings;
  isDirty: boolean;
}