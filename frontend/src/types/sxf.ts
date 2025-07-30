// SXF(P21)フォーマットの型定義

// SXFファイルのヘッダー情報
export interface SXFHeader {
  version: string;
  createdBy: string;
  createdDate: Date;
  modifiedDate?: Date;
  encoding: string;
  units: 'mm' | 'cm' | 'm';
  coordinateSystem?: string;
}

// SXFレイヤー情報
export interface SXFLayer {
  id: string;
  name: string;
  color: string;
  lineType: string;
  lineWidth: number;
  visible: boolean;
  locked: boolean;
}

// SXF基本図形要素の種類
export type SXFElementType = 
  | 'LINE'           // 線分
  | 'CIRCLE'         // 円
  | 'ARC'            // 円弧
  | 'POLYLINE'       // ポリライン
  | 'TEXT'           // 文字
  | 'POINT'          // 点
  | 'DIMENSION'      // 寸法
  | 'HATCH'          // ハッチング
  | 'SPLINE'         // スプライン
  | 'ELLIPSE';       // 楕円

// SXF基本図形要素
export interface SXFElement {
  id: string;
  type: SXFElementType;
  layerId: string;
  color?: string;
  lineType?: string;
  lineWidth?: number;
  visible: boolean;
  attributes: Record<string, any>;
}

// 線分要素
export interface SXFLine extends SXFElement {
  type: 'LINE';
  startPoint: [number, number, number?];
  endPoint: [number, number, number?];
}

// 円要素
export interface SXFCircle extends SXFElement {
  type: 'CIRCLE';
  center: [number, number, number?];
  radius: number;
}

// 円弧要素
export interface SXFArc extends SXFElement {
  type: 'ARC';
  center: [number, number, number?];
  radius: number;
  startAngle: number;  // ラジアン
  endAngle: number;    // ラジアン
}

// ポリライン要素
export interface SXFPolyline extends SXFElement {
  type: 'POLYLINE';
  points: Array<[number, number, number?]>;
  closed: boolean;
}

// 文字要素
export interface SXFText extends SXFElement {
  type: 'TEXT';
  text: string;
  position: [number, number, number?];
  height: number;
  rotation: number;    // ラジアン
  fontName?: string;
  bold?: boolean;
  italic?: boolean;
}

// 点要素
export interface SXFPoint extends SXFElement {
  type: 'POINT';
  position: [number, number, number?];
  symbol?: string;
  size?: number;
}

// SXFファイル全体の構造
export interface SXFFile {
  header: SXFHeader;
  layers: SXFLayer[];
  elements: SXFElement[];
  metadata: Record<string, any>;
}

// P21パーサーのオプション
export interface P21ParseOptions {
  encoding?: string;
  strictMode?: boolean;
  ignoreErrors?: boolean;
  coordinateSystem?: string;
  unitScale?: number;
}

// パース結果
export interface P21ParseResult {
  success: boolean;
  data?: SXFFile;
  errors: string[];
  warnings: string[];
}

// P21エンティティの基本構造
export interface P21Entity {
  id: number;
  type: string;
  parameters: any[];
}

// よく使用されるSXF属性
export interface SXFCommonAttributes {
  // レイヤー属性
  layer_name?: string;
  layer_color?: string;
  layer_linetype?: string;
  
  // 線種属性
  linetype_name?: string;
  linetype_scale?: number;
  
  // 色属性
  color_number?: number;
  color_rgb?: [number, number, number];
  
  // 線幅属性
  lineweight?: number;
  
  // 文字属性
  text_style?: string;
  text_height?: number;
  text_width_factor?: number;
  
  // 座標系属性
  coordinate_system?: string;
  origin_point?: [number, number, number?];
  
  // メタデータ
  created_by?: string;
  created_date?: string;
  modified_date?: string;
  
  // 地籍調査特有の属性
  survey_area?: string;
  plot_number?: string;
  survey_date?: string;
  surveyor?: string;
}