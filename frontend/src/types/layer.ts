// レイヤー管理の型定義

export interface Layer {
  id: string;
  name: string;
  color: string;
  lineType: string;
  lineWidth: number;
  visible: boolean;
  locked: boolean;
  order: number;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LayerState {
  layers: Layer[];
  activeLayerId: string | null;
  selectedLayerIds: string[];
}

export interface CreateLayerRequest {
  name: string;
  color?: string;
  lineType?: string;
  lineWidth?: number;
  visible?: boolean;
  locked?: boolean;
  projectId: string;
}

export interface UpdateLayerRequest {
  name?: string;
  color?: string;
  lineType?: string;
  lineWidth?: number;
  visible?: boolean;
  locked?: boolean;
  order?: number;
}

// 地籍調査用の標準レイヤー定義
export const STANDARD_LAYERS = [
  {
    name: '基準点',
    color: '#FF0000',
    lineType: 'solid',
    lineWidth: 1.0,
    description: '三角点、水準点、基準点等'
  },
  {
    name: '境界点',
    color: '#00FF00',
    lineType: 'solid',
    lineWidth: 1.0,
    description: '筆界点、境界標識等'
  },
  {
    name: '筆界線',
    color: '#000000',
    lineType: 'solid',
    lineWidth: 2.0,
    description: '確定した筆界線'
  },
  {
    name: '推定筆界線',
    color: '#808080',
    lineType: 'dashed',
    lineWidth: 1.5,
    description: '推定される筆界線'
  },
  {
    name: '建物',
    color: '#8B4513',
    lineType: 'solid',
    lineWidth: 1.5,
    description: '建物の輪郭'
  },
  {
    name: '道路',
    color: '#FFFF00',
    lineType: 'solid',
    lineWidth: 2.0,
    description: '道路の中心線・境界線'
  },
  {
    name: '水系',
    color: '#0000FF',
    lineType: 'solid',
    lineWidth: 1.5,
    description: '河川、水路、池等'
  },
  {
    name: '地番',
    color: '#000000',
    lineType: 'solid',
    lineWidth: 1.0,
    description: '地番の表示'
  },
  {
    name: '寸法',
    color: '#FF00FF',
    lineType: 'solid',
    lineWidth: 0.5,
    description: '距離、面積等の寸法'
  },
  {
    name: '注記',
    color: '#008000',
    lineType: 'solid',
    lineWidth: 1.0,
    description: '説明文、注記等'
  }
] as const;