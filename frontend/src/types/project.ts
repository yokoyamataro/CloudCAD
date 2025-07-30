// プロジェクト関連の型定義

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  image: string;
  category: 'urban' | 'rural' | 'industrial' | 'residential';
  features: string[];
  defaultSettings: {
    coordinateSystem: string;
    scale: string;
    units: string;
  };
}

export interface CADData {
  id: string;
  name: string;
  type: 'drawing' | 'blueprint' | 'survey';
  format: 'sxf' | 'dxf' | 'dwg';
  filePath?: string;
  elements: DrawingElement[];
  layers: Layer[];
  createdAt: string;
  updatedAt?: string;
}

export interface CoordinateData {
  id: string;
  name: string;
  type: 'benchmark' | 'control_point' | 'boundary_point';
  coordinates: {
    x: number;
    y: number;
    z?: number;
    system: string; // JGD2000, JGD2011等
  };
  accuracy: string;
  description?: string;
  createdAt: string;
}

export interface DrawingElement {
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
  };
  layerId: string;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  templateId: string;
  template: ProjectTemplate;
  location: {
    address: string;
    prefecture: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  settings: {
    coordinateSystem: string;
    scale: string;
    units: string;
  };
  cadData: CADData[];
  coordinateData: CoordinateData[];
  status: 'planning' | 'in_progress' | 'review' | 'completed';
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}