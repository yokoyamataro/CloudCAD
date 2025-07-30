import { create } from 'zustand';
import * as THREE from 'three';

// 型定義を直接定義
interface DrawingElement {
  id: string;
  type: 'line' | 'polyline' | 'polygon' | 'circle' | 'arc' | 'text' | 'point';
  coordinates: number[];
  properties: {
    color: string;
    lineWidth: number;
    lineType: string;
    fillColor?: string;
    text?: string;
    fontSize?: number;
    rotation?: number;
  };
  layerId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface DrawingSettings {
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapDistance: number;
  backgroundColor: string;
}

interface CameraSettings {
  position: THREE.Vector3;
  target: THREE.Vector3;
  zoom: number;
}

interface DrawingState {
  elements: DrawingElement[];
  selectedElementIds: string[];
  currentTool: string;
  isDrawing: boolean;
  settings: DrawingSettings;
  camera: CameraSettings;
  viewport: {
    width: number;
    height: number;
  };
}

import { 
  createLineElement, 
  createPointElement, 
  createTextElement, 
  createPolygonElement 
} from './DrawingUtils';

interface DrawingStore extends DrawingState {
  // アクション
  addElement: (element: DrawingElement) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<DrawingElement>) => void;
  selectElement: (id: string) => void;
  deselectElement: (id: string) => void;
  clearSelection: () => void;
  setCurrentTool: (tool: DrawingState['currentTool']) => void;
  updateSettings: (settings: Partial<DrawingSettings>) => void;
  updateCamera: (camera: Partial<CameraSettings>) => void;
  
  // 描画操作
  addLine: (startPoint: THREE.Vector3, endPoint: THREE.Vector3, options?: any) => void;
  addPoint: (position: THREE.Vector3, options?: any) => void;
  addText: (position: THREE.Vector3, text: string, options?: any) => void;
  addPolygon: (points: THREE.Vector3[], options?: any) => void;
  
  // ユーティリティ
  getElementById: (id: string) => DrawingElement | undefined;
  getSelectedElements: () => DrawingElement[];
  hasUnsavedChanges: () => boolean;
  markClean: () => void;
  markDirty: () => void;
  
  // 履歴機能（簡易版）
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// デフォルト設定
const defaultSettings: DrawingSettings = {
  backgroundColor: '#f0f0f0',
  gridVisible: true,
  gridSize: 10,
  snapToGrid: false,
  defaultLineColor: '#000000',
  defaultPointColor: '#ff0000',
  defaultTextColor: '#000000'
};

const defaultCamera: CameraSettings = {
  position: new THREE.Vector3(0, 0, 100),
  target: new THREE.Vector3(0, 0, 0),
  zoom: 1,
  is2D: true
};

let elementCounter = 0;
const generateId = () => `element_${++elementCounter}`;

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  // 初期状態
  elements: [],
  selectedElements: [],
  currentTool: 'select',
  settings: defaultSettings,
  camera: defaultCamera,
  isDirty: false,

  // 基本操作
  addElement: (element) => {
    set(state => ({
      elements: [...state.elements, element],
      isDirty: true
    }));
  },

  removeElement: (id) => {
    set(state => ({
      elements: state.elements.filter(el => el.id !== id),
      selectedElements: state.selectedElements.filter(selId => selId !== id),
      isDirty: true
    }));
  },

  updateElement: (id, updates) => {
    set(state => ({
      elements: state.elements.map(el => 
        el.id === id ? { ...el, ...updates } : el
      ),
      isDirty: true
    }));
  },

  // 選択操作
  selectElement: (id) => {
    set(state => ({
      selectedElements: [...state.selectedElements, id]
    }));
  },

  deselectElement: (id) => {
    set(state => ({
      selectedElements: state.selectedElements.filter(selId => selId !== id)
    }));
  },

  clearSelection: () => {
    set({ selectedElements: [] });
  },

  // ツール設定
  setCurrentTool: (tool) => {
    set({ currentTool: tool });
  },

  // 設定更新
  updateSettings: (settings) => {
    set(state => ({
      settings: { ...state.settings, ...settings }
    }));
  },

  updateCamera: (camera) => {
    set(state => ({
      camera: { ...state.camera, ...camera }
    }));
  },

  // 描画操作
  addLine: (startPoint, endPoint, options = {}) => {
    const element = createLineElement(
      generateId(), 
      startPoint, 
      endPoint, 
      {
        color: get().settings.defaultLineColor,
        ...options
      }
    );
    get().addElement(element);
  },

  addPoint: (position, options = {}) => {
    const element = createPointElement(
      generateId(),
      position,
      {
        color: get().settings.defaultPointColor,
        ...options
      }
    );
    get().addElement(element);
  },

  addText: (position, text, options = {}) => {
    const element = createTextElement(
      generateId(),
      position,
      text,
      {
        color: get().settings.defaultTextColor,
        ...options
      }
    );
    get().addElement(element);
  },

  addPolygon: (points, options = {}) => {
    const element = createPolygonElement(
      generateId(),
      points,
      options
    );
    get().addElement(element);
  },

  // ユーティリティ
  getElementById: (id) => {
    return get().elements.find(el => el.id === id);
  },

  getSelectedElements: () => {
    const { elements, selectedElements } = get();
    return elements.filter(el => selectedElements.includes(el.id));
  },

  hasUnsavedChanges: () => {
    return get().isDirty;
  },

  markClean: () => {
    set({ isDirty: false });
  },

  markDirty: () => {
    set({ isDirty: true });
  },

  // 履歴機能（簡易版 - 後で改良）
  undo: () => {
    // TODO: 履歴スタックの実装
    console.log('Undo - not implemented yet');
  },

  redo: () => {
    // TODO: 履歴スタックの実装
    console.log('Redo - not implemented yet');
  },

  canUndo: () => {
    // TODO: 履歴スタックの実装
    return false;
  },

  canRedo: () => {
    // TODO: 履歴スタックの実装
    return false;
  }
}));