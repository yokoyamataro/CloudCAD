import * as THREE from 'three';
import type { 
  SXFFile, 
  SXFElement, 
  SXFLine, 
  SXFCircle, 
  SXFText, 
  SXFPoint, 
  SXFPolyline,
  SXFArc
} from '../../types/sxf';
import type { CADElement } from '../../types/cad';
import { 
  createLineElement, 
  createPointElement, 
  createTextElement, 
  createPolygonElement 
} from '../drawing/DrawingUtils';

export interface SXFConversionOptions {
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  flipY?: boolean; // CADとWebGLの座標系の違いを補正
  defaultLayer?: string;
  colorMapping?: Record<string, string>;
  lineTypeMapping?: Record<string, string>;
}

export interface SXFConversionResult {
  success: boolean;
  elements: CADElement[];
  layers: string[];
  errors: string[];
  warnings: string[];
  statistics: {
    totalElements: number;
    convertedElements: number;
    skippedElements: number;
    unsupportedTypes: string[];
  };
}

export class SXFConverter {
  private options: Required<SXFConversionOptions>;
  private errors: string[] = [];
  private warnings: string[] = [];
  private layerColorMap: Map<string, string> = new Map();
  private elementCounter = 0;

  constructor(options: SXFConversionOptions = {}) {
    this.options = {
      scale: options.scale ?? 1.0,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
      offsetZ: options.offsetZ ?? 0,
      flipY: options.flipY ?? true, // CADは通常Y軸が上向き
      defaultLayer: options.defaultLayer ?? 'default',
      colorMapping: options.colorMapping ?? {},
      lineTypeMapping: options.lineTypeMapping ?? {}
    };
  }

  // SXFファイルをCADElementsに変換
  async convertSXFFile(sxfFile: SXFFile): Promise<SXFConversionResult> {
    this.errors = [];
    this.warnings = [];
    this.layerColorMap.clear();
    this.elementCounter = 0;

    try {
      // レイヤー情報を構築
      this.buildLayerColorMap(sxfFile.layers);

      // 要素を変換
      const elements: CADElement[] = [];
      const unsupportedTypes = new Set<string>();
      let convertedCount = 0;
      let skippedCount = 0;

      for (const sxfElement of sxfFile.elements) {
        try {
          const drawingElement = this.convertElement(sxfElement);
          if (drawingElement) {
            elements.push(drawingElement);
            convertedCount++;
          } else {
            skippedCount++;
            unsupportedTypes.add(sxfElement.type);
          }
        } catch (error) {
          this.errors.push(`要素 ${sxfElement.id} の変換に失敗: ${error.message}`);
          skippedCount++;
        }
      }

      return {
        success: this.errors.length === 0,
        elements,
        layers: Array.from(this.layerColorMap.keys()),
        errors: this.errors,
        warnings: this.warnings,
        statistics: {
          totalElements: sxfFile.elements.length,
          convertedElements: convertedCount,
          skippedElements: skippedCount,
          unsupportedTypes: Array.from(unsupportedTypes)
        }
      };
    } catch (error) {
      this.errors.push(`変換処理中にエラーが発生: ${error.message}`);
      return {
        success: false,
        elements: [],
        layers: [],
        errors: this.errors,
        warnings: this.warnings,
        statistics: {
          totalElements: 0,
          convertedElements: 0,
          skippedElements: 0,
          unsupportedTypes: []
        }
      };
    }
  }

  // レイヤーカラーマップの構築
  private buildLayerColorMap(layers: any[]): void {
    for (const layer of layers) {
      const color = this.options.colorMapping[layer.color] || layer.color || '#000000';
      this.layerColorMap.set(layer.id, color);
    }
  }

  // SXF要素をDrawing要素に変換
  private convertElement(sxfElement: SXFElement): CADElement | null {
    switch (sxfElement.type) {
      case 'LINE':
        return this.convertLine(sxfElement as SXFLine);
      case 'CIRCLE':
        return this.convertCircle(sxfElement as SXFCircle);
      case 'ARC':
        return this.convertArc(sxfElement as SXFArc);
      case 'TEXT':
        return this.convertText(sxfElement as SXFText);
      case 'POINT':
        return this.convertPoint(sxfElement as SXFPoint);
      case 'POLYLINE':
        return this.convertPolyline(sxfElement as SXFPolyline);
      default:
        this.warnings.push(`未サポートの要素タイプ: ${sxfElement.type}`);
        return null;
    }
  }

  // 線分の変換
  private convertLine(sxfLine: SXFLine): LineElement {
    const startPoint = this.transformPoint(sxfLine.startPoint);
    const endPoint = this.transformPoint(sxfLine.endPoint);
    const color = this.getElementColor(sxfLine);

    return createLineElement(
      this.generateId(),
      startPoint,
      endPoint,
      {
        color,
        layer: sxfLine.layerId || this.options.defaultLayer
      }
    );
  }

  // 円の変換（ポリゴンとして近似）
  private convertCircle(sxfCircle: SXFCircle): PolygonElement {
    const center = this.transformPoint(sxfCircle.center);
    const radius = sxfCircle.radius * this.options.scale;
    const segments = 32; // 円の分割数
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, center.z));
    }

    const color = this.getElementColor(sxfCircle);
    
    return createPolygonElement(
      this.generateId(),
      points,
      {
        strokeColor: color,
        fillColor: 'transparent',
        strokeWidth: 1,
        layer: sxfCircle.layerId || this.options.defaultLayer
      }
    );
  }

  // 円弧の変換（線分として近似）
  private convertArc(sxfArc: SXFArc): PolygonElement {
    const center = this.transformPoint(sxfArc.center);
    const radius = sxfArc.radius * this.options.scale;
    const segments = 16; // 円弧の分割数
    const points: THREE.Vector3[] = [];

    const startAngle = sxfArc.startAngle;
    const endAngle = sxfArc.endAngle;
    const angleStep = (endAngle - startAngle) / segments;

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const x = center.x + Math.cos(angle) * radius;
      const y = center.y + Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, y, center.z));
    }

    const color = this.getElementColor(sxfArc);
    
    return createPolygonElement(
      this.generateId(),
      points,
      {
        strokeColor: color,
        fillColor: 'transparent',
        strokeWidth: 1,
        layer: sxfArc.layerId || this.options.defaultLayer
      }
    );
  }

  // テキストの変換
  private convertText(sxfText: SXFText): TextElement {
    const position = this.transformPoint(sxfText.position);
    const color = this.getElementColor(sxfText);

    return createTextElement(
      this.generateId(),
      position,
      sxfText.text,
      {
        fontSize: sxfText.height * this.options.scale,
        color,
        rotation: sxfText.rotation,
        layer: sxfText.layerId || this.options.defaultLayer
      }
    );
  }

  // 点の変換
  private convertPoint(sxfPoint: SXFPoint): PointElement {
    const position = this.transformPoint(sxfPoint.position);
    const color = this.getElementColor(sxfPoint);

    return createPointElement(
      this.generateId(),
      position,
      {
        color,
        size: (sxfPoint.size || 3) * this.options.scale,
        layer: sxfPoint.layerId || this.options.defaultLayer
      }
    );
  }

  // ポリラインの変換
  private convertPolyline(sxfPolyline: SXFPolyline): PolygonElement {
    const points = sxfPolyline.points.map(point => this.transformPoint(point));
    const color = this.getElementColor(sxfPolyline);

    return createPolygonElement(
      this.generateId(),
      points,
      {
        strokeColor: color,
        fillColor: sxfPolyline.closed ? 'rgba(0,0,0,0.1)' : 'transparent',
        strokeWidth: 1,
        layer: sxfPolyline.layerId || this.options.defaultLayer
      }
    );
  }

  // 座標変換
  private transformPoint(point: [number, number, number?]): THREE.Vector3 {
    let x = (point[0] || 0) * this.options.scale + this.options.offsetX;
    let y = (point[1] || 0) * this.options.scale + this.options.offsetY;
    const z = (point[2] || 0) * this.options.scale + this.options.offsetZ;

    // Y軸反転（CAD座標系からWebGL座標系への変換）
    if (this.options.flipY) {
      y = -y;
    }

    return new THREE.Vector3(x, y, z);
  }

  // 要素の色を取得
  private getElementColor(element: SXFElement): string {
    // 要素固有の色が指定されている場合
    if (element.color) {
      return this.options.colorMapping[element.color] || element.color;
    }

    // レイヤーの色を使用
    const layerColor = this.layerColorMap.get(element.layerId);
    if (layerColor) {
      return layerColor;
    }

    // デフォルト色
    return '#000000';
  }

  // 一意なIDの生成
  private generateId(): string {
    return `sxf_${++this.elementCounter}`;
  }

  // 座標系変換のユーティリティ
  static transformCoordinateSystem(
    points: THREE.Vector3[], 
    fromSystem: string, 
    toSystem: string
  ): THREE.Vector3[] {
    // 座標系変換の実装（簡易版）
    // 実際の実装では、測地系変換ライブラリを使用
    
    if (fromSystem === toSystem) {
      return points;
    }

    // TODO: proj4やepsg-indexライブラリを使用した座標系変換
    console.warn(`座標系変換 ${fromSystem} -> ${toSystem} は未実装です`);
    return points;
  }

  // 単位変換のユーティリティ
  static convertUnits(value: number, fromUnit: string, toUnit: string): number {
    const units: Record<string, number> = {
      'mm': 1,
      'cm': 10,
      'm': 1000,
      'km': 1000000,
      'inch': 25.4,
      'ft': 304.8,
      'yard': 914.4
    };

    const fromScale = units[fromUnit] || 1;
    const toScale = units[toUnit] || 1;

    return value * (fromScale / toScale);
  }
}