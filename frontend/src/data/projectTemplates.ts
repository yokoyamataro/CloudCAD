import type { ProjectTemplate } from '../types/project';

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'urban-residential',
    name: '都市部住宅地調査',
    description: '住宅密集地域の地籍調査プロジェクト',
    image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
    category: 'urban',
    features: ['高密度住宅', '狭小敷地', '複雑な境界線', '道路境界'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:500',
      units: 'メートル'
    }
  },
  {
    id: 'rural-agricultural',
    name: '農村部農地調査',
    description: '農地・山林を含む農村地域の調査',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop',
    category: 'rural',
    features: ['農地区画', '用水路', '農道', '山林境界'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:1000',
      units: 'メートル'
    }
  },
  {
    id: 'industrial-zone',
    name: '工業地域調査',
    description: '工場・倉庫等の工業地域の調査',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop',
    category: 'industrial',
    features: ['大規模敷地', '工場建屋', '駐車場', '緑地帯'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:1000',
      units: 'メートル'
    }
  },
  {
    id: 'new-residential',
    name: '新興住宅地調査',
    description: '新たに開発された住宅地の調査',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    category: 'residential',
    features: ['整然とした区画', '新しい道路', '公園・緑地', '上下水道'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:500',
      units: 'メートル'
    }
  },
  {
    id: 'coastal-area',
    name: '沿岸地域調査',
    description: '海岸線を含む地域の調査',
    image: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop',
    category: 'rural',
    features: ['海岸線', '防波堤', '漁港施設', '塩田跡地'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:1000',
      units: 'メートル'
    }
  },
  {
    id: 'mountain-forest',
    name: '山間部森林調査',
    description: '山間部の森林地域の調査',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
    category: 'rural',
    features: ['森林境界', '林道', '渓流', '急傾斜地'],
    defaultSettings: {
      coordinateSystem: 'JGD2011',
      scale: '1:2500',
      units: 'メートル'
    }
  }
];

export const getTemplateById = (id: string): ProjectTemplate | undefined => {
  return PROJECT_TEMPLATES.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): ProjectTemplate[] => {
  return PROJECT_TEMPLATES.filter(template => template.category === category);
};