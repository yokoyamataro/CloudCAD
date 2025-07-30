import { create } from 'zustand';

// 型定義を直接定義
interface Layer {
  id: string;
  name: string;
  color: string;
  lineType: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  lineWidth: number;
  visible: boolean;
  locked: boolean;
  order: number;
  description?: string;
  projectId: string;
  createdAt: string;
  updatedAt?: string;
}

interface LayerState {
  layers: Layer[];
  currentLayerId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface CreateLayerRequest {
  name: string;
  color?: string;
  lineType?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  lineWidth?: number;
  visible?: boolean;
  locked?: boolean;
  description?: string;
  projectId: string;
}

interface UpdateLayerRequest {
  name?: string;
  color?: string;
  lineType?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  lineWidth?: number;
  visible?: boolean;
  locked?: boolean;
  description?: string;
}

// 標準レイヤー定義
export const STANDARD_LAYERS = [
  { name: '基準点', color: '#FF0000', description: '三角点、水準点、基準点等' },
  { name: '筆界', color: '#000000', description: '確定した筆界' },
  { name: '建物', color: '#8B4513', description: '建物の輪郭' },
  { name: '道路', color: '#808080', description: '道路境界線' },
  { name: '水路', color: '#0000FF', description: '河川、用水路等' },
  { name: '構造物', color: '#FF8C00', description: 'ブロック塀、擁壁等' },
  { name: '植生', color: '#008000', description: '樹木、竹林等' },
  { name: '地形', color: '#8B4513', description: '法面、崖等' },
  { name: '注記', color: '#FF1493', description: 'テキスト注記' },
  { name: '作業用', color: '#CCCCCC', description: '作業用補助線' }
];

interface LayerStore extends LayerState {
  // 認証付きリクエスト関数を定義
  authenticatedRequest: (url: string, options?: RequestInit) => Promise<Response>;
  
  // レイヤー操作
  createLayer: (layerData: CreateLayerRequest) => Promise<void>;
  updateLayer: (layerId: string, updates: UpdateLayerRequest) => Promise<void>;
  deleteLayer: (layerId: string) => Promise<void>;
  duplicateLayer: (layerId: string) => Promise<void>;
  
  // レイヤー表示制御
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  
  // レイヤー選択
  selectLayer: (layerId: string, multiSelect?: boolean) => void;
  deselectLayer: (layerId: string) => void;
  clearLayerSelection: () => void;
  
  // レイヤー順序
  moveLayerUp: (layerId: string) => void;
  moveLayerDown: (layerId: string) => void;
  reorderLayers: (layerIds: string[]) => void;
  
  // データ管理
  loadLayers: (projectId: string) => Promise<void>;
  createStandardLayers: (projectId: string) => Promise<void>;
  
  // ユーティリティ
  getLayerById: (layerId: string) => Layer | undefined;
  getVisibleLayers: () => Layer[];
  getUnlockedLayers: () => Layer[];
  getLayersByOrder: () => Layer[];
  
  // 状態管理
  setLayers: (layers: Layer[]) => void;
  clearLayers: () => void;
}

let layerCounter = 0;
const generateLayerId = () => `layer_${++layerCounter}_${Date.now()}`;

export const useLayer = create<LayerStore>((set, get) => ({
  // 初期状態
  layers: [],
  currentLayerId: null,
  isLoading: false,
  error: null,

  // 認証付きリクエスト関数
  authenticatedRequest: async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  },

  // レイヤー作成
  createLayer: async (layerData: CreateLayerRequest) => {
    try {
      const response = await authenticatedRequest('/layers', {
        method: 'POST',
        body: JSON.stringify(layerData),
      });

      const newLayer: Layer = response.layer;
      
      set(state => ({
        layers: [...state.layers, newLayer].sort((a, b) => a.order - b.order),
        activeLayerId: newLayer.id
      }));
    } catch (error) {
      // オフラインの場合はローカルで作成
      const newLayer: Layer = {
        id: generateLayerId(),
        name: layerData.name,
        color: layerData.color || '#000000',
        lineType: layerData.lineType || 'solid',
        lineWidth: layerData.lineWidth || 1.0,
        visible: layerData.visible ?? true,
        locked: layerData.locked ?? false,
        order: get().layers.length,
        projectId: layerData.projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set(state => ({
        layers: [...state.layers, newLayer],
        activeLayerId: newLayer.id
      }));
    }
  },

  // レイヤー更新
  updateLayer: async (layerId: string, updates: UpdateLayerRequest) => {
    try {
      const response = await authenticatedRequest(`/layers/${layerId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const updatedLayer: Layer = response.layer;

      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId ? updatedLayer : layer
        )
      }));
    } catch (error) {
      // オフラインの場合はローカルで更新
      set(state => ({
        layers: state.layers.map(layer => 
          layer.id === layerId 
            ? { 
                ...layer, 
                ...updates, 
                updatedAt: new Date().toISOString() 
              }
            : layer
        )
      }));
    }
  },

  // レイヤー削除
  deleteLayer: async (layerId: string) => {
    try {
      await authenticatedRequest(`/layers/${layerId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to delete layer on server:', error);
    }

    set(state => ({
      layers: state.layers.filter(layer => layer.id !== layerId),
      activeLayerId: state.activeLayerId === layerId ? null : state.activeLayerId,
      selectedLayerIds: state.selectedLayerIds.filter(id => id !== layerId)
    }));
  },

  // レイヤー複製
  duplicateLayer: async (layerId: string) => {
    const originalLayer = get().getLayerById(layerId);
    if (!originalLayer) return;

    const duplicateData: CreateLayerRequest = {
      name: `${originalLayer.name}_コピー`,
      color: originalLayer.color,
      lineType: originalLayer.lineType,
      lineWidth: originalLayer.lineWidth,
      visible: originalLayer.visible,
      locked: false,
      projectId: originalLayer.projectId || ''
    };

    await get().createLayer(duplicateData);
  },

  // 表示切り替え
  toggleLayerVisibility: (layerId: string) => {
    const layer = get().getLayerById(layerId);
    if (layer) {
      get().updateLayer(layerId, { visible: !layer.visible });
    }
  },

  // ロック切り替え
  toggleLayerLock: (layerId: string) => {
    const layer = get().getLayerById(layerId);
    if (layer) {
      get().updateLayer(layerId, { locked: !layer.locked });
    }
  },

  // アクティブレイヤー設定
  setActiveLayer: (layerId: string) => {
    set({ activeLayerId: layerId });
  },

  // レイヤー選択
  selectLayer: (layerId: string, multiSelect = false) => {
    set(state => {
      if (multiSelect) {
        const isSelected = state.selectedLayerIds.includes(layerId);
        return {
          selectedLayerIds: isSelected
            ? state.selectedLayerIds.filter(id => id !== layerId)
            : [...state.selectedLayerIds, layerId]
        };
      } else {
        return { selectedLayerIds: [layerId] };
      }
    });
  },

  // レイヤー選択解除
  deselectLayer: (layerId: string) => {
    set(state => ({
      selectedLayerIds: state.selectedLayerIds.filter(id => id !== layerId)
    }));
  },

  // すべての選択解除
  clearLayerSelection: () => {
    set({ selectedLayerIds: [] });
  },

  // レイヤーを上に移動
  moveLayerUp: (layerId: string) => {
    const layers = get().getLayersByOrder();
    const index = layers.findIndex(layer => layer.id === layerId);
    
    if (index > 0) {
      const newOrder = layers[index - 1].order;
      get().updateLayer(layerId, { order: newOrder - 0.5 });
      
      // 順序を正規化
      setTimeout(() => {
        const normalizedLayers = get().getLayersByOrder();
        normalizedLayers.forEach((layer, idx) => {
          get().updateLayer(layer.id, { order: idx });
        });
      }, 100);
    }
  },

  // レイヤーを下に移動
  moveLayerDown: (layerId: string) => {
    const layers = get().getLayersByOrder();
    const index = layers.findIndex(layer => layer.id === layerId);
    
    if (index < layers.length - 1) {
      const newOrder = layers[index + 1].order;
      get().updateLayer(layerId, { order: newOrder + 0.5 });
      
      // 順序を正規化
      setTimeout(() => {
        const normalizedLayers = get().getLayersByOrder();
        normalizedLayers.forEach((layer, idx) => {
          get().updateLayer(layer.id, { order: idx });
        });
      }, 100);
    }
  },

  // レイヤー順序の再配置
  reorderLayers: (layerIds: string[]) => {
    layerIds.forEach((layerId, index) => {
      get().updateLayer(layerId, { order: index });
    });
  },

  // プロジェクトのレイヤー読み込み
  loadLayers: async (projectId: string) => {
    try {
      const response = await authenticatedRequest(`/projects/${projectId}/layers`);
      const layers: Layer[] = response.layers || [];
      
      set({ 
        layers: layers.sort((a, b) => a.order - b.order),
        activeLayerId: layers.length > 0 ? layers[0].id : null
      });
    } catch (error) {
      console.error('Failed to load layers:', error);
      // エラーの場合は空のレイヤーリストを設定
      set({ layers: [], activeLayerId: null });
    }
  },

  // 標準レイヤーの作成
  createStandardLayers: async (projectId: string) => {
    try {
      for (let i = 0; i < STANDARD_LAYERS.length; i++) {
        const standardLayer = STANDARD_LAYERS[i];
        await get().createLayer({
          ...standardLayer,
          projectId,
          visible: true,
          locked: false
        });
      }
    } catch (error) {
      console.error('Failed to create standard layers:', error);
    }
  },

  // ユーティリティメソッド
  getLayerById: (layerId: string) => {
    return get().layers.find(layer => layer.id === layerId);
  },

  getVisibleLayers: () => {
    return get().layers.filter(layer => layer.visible);
  },

  getUnlockedLayers: () => {
    return get().layers.filter(layer => !layer.locked);
  },

  getLayersByOrder: () => {
    return [...get().layers].sort((a, b) => a.order - b.order);
  },

  // 状態管理
  setLayers: (layers: Layer[]) => {
    set({ 
      layers: layers.sort((a, b) => a.order - b.order),
      activeLayerId: layers.length > 0 ? layers[0].id : null
    });
  },

  clearLayers: () => {
    set({
      layers: [],
      activeLayerId: null,
      selectedLayerIds: []
    });
  }
}));