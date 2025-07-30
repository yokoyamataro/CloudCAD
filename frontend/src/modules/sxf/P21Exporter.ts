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

export interface P21ExportOptions {
  version?: string;
  encoding?: string;
  author?: string;
  organization?: string;
  coordinateSystem?: string;
  units?: string;
  precision?: number;
}

export interface P21ExportResult {
  success: boolean;
  content?: string;
  errors: string[];
  warnings: string[];
}

export class P21Exporter {
  private options: Required<P21ExportOptions>;
  private entityCounter: number = 1;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(options: P21ExportOptions = {}) {
    this.options = {
      version: options.version || 'SXF 3.1',
      encoding: options.encoding || 'UTF-8',
      author: options.author || 'CloudCAD',
      organization: options.organization || 'Unknown',
      coordinateSystem: options.coordinateSystem || 'JGD2000',
      units: options.units || 'mm',
      precision: options.precision || 6
    };
  }

  // CAD要素をP21ファイルにエクスポート
  async exportElements(elements: CADElement[]): Promise<P21ExportResult> {
    this.errors = [];
    this.warnings = [];
    this.entityCounter = 1;

    try {
      const content = this.generateP21Content(elements);
      
      return {
        success: this.errors.length === 0,
        content,
        errors: this.errors,
        warnings: this.warnings
      };
    } catch (error) {
      this.errors.push(`エクスポート中にエラーが発生しました: ${error.message}`);
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  // P21ファイル内容の生成
  private generateP21Content(elements: DrawingElement[]): string {
    const header = this.generateHeader();
    const data = this.generateDataSection(elements);
    
    return `ISO-10303-21;
${header}
${data}
END-ISO-10303-21;`;
  }

  // ヘッダーセクションの生成
  private generateHeader(): string {
    const timestamp = new Date().toISOString();
    
    return `HEADER;
FILE_DESCRIPTION(('${this.options.version}'), '2;1');
FILE_NAME('', '${timestamp}', ('${this.options.author}'), ('${this.options.organization}'), 
  'CloudCAD SXF Exporter', 'CloudCAD', '');
FILE_SCHEMA(('SXF_3_1'));
ENDSEC;`;
  }

  // データセクションの生成
  private generateDataSection(elements: CADElement[]): string {
    let data = 'DATA;\n';
    
    // レイヤー情報の生成
    const layers = this.extractLayers(elements);
    for (const layer of layers) {
      data += this.generateLayerEntity(layer);
    }
    
    // 要素の生成
    for (const element of elements) {
      const entityData = this.generateElementEntity(element);
      if (entityData) {
        data += entityData;
      }
    }
    
    data += 'ENDSEC;\n';
    return data;
  }

  // レイヤー情報の抽出
  private extractLayers(elements: CADElement[]): Array<{id: string, name: string, color: string}> {
    const layerMap = new Map<string, {id: string, name: string, color: string}>();
    
    for (const element of elements) {
      const layerId = element.layerId || 'default';
      if (!layerMap.has(layerId)) {
        layerMap.set(layerId, {
          id: layerId,
          name: layerId,
          color: element.color || '#000000'
        });
      }
    }
    
    return Array.from(layerMap.values());
  }

  // レイヤーエンティティの生成
  private generateLayerEntity(layer: {id: string, name: string, color: string}): string {
    const entityId = this.entityCounter++;
    return `#${entityId} = SXF_LAYER('${layer.name}', '${layer.color}', .T.);\n`;
  }

  // 要素エンティティの生成
  private generateElementEntity(element: CADElement): string | null {
    try {
      switch (element.type) {
        case 'line':
          return this.generateLineEntity(element);
        case 'point':
          return this.generatePointEntity(element);
        case 'text':
          return this.generateTextEntity(element);
        case 'circle':
          return this.generateCircleEntity(element);
        case 'polygon':
          return this.generatePolygonEntity(element);
        default:
          this.warnings.push(`未対応の要素タイプ: ${element.type}`);
          return null;
      }
    } catch (error) {
      this.errors.push(`要素 ${element.id} の変換に失敗: ${error.message}`);
      return null;
    }
  }

  // 線分エンティティの生成
  private generateLineEntity(element: CADElement): string {
    const entityId = this.entityCounter++;
    const startPoint = this.formatPoint(element.startX || 0, element.startY || 0);
    const endPoint = this.formatPoint(element.endX || 0, element.endY || 0);
    
    return `#${entityId} = SXF_LINE(${startPoint}, ${endPoint}, '${element.color || '#000000'}', ${element.lineWidth || 1});\n`;
  }

  // 点エンティティの生成
  private generatePointEntity(element: CADElement): string {
    const entityId = this.entityCounter++;
    const position = this.formatPoint(element.startX || 0, element.startY || 0);
    
    return `#${entityId} = SXF_POINT(${position}, '${element.color || '#000000'}');\n`;
  }

  // テキストエンティティの生成
  private generateTextEntity(element: CADElement): string {
    const entityId = this.entityCounter++;
    const position = this.formatPoint(element.startX || 0, element.startY || 0);
    const text = element.text || '';
    const height = element.fontSize || 10;
    const rotation = element.rotation || 0;
    
    return `#${entityId} = SXF_TEXT(${position}, '${text}', ${height}, ${rotation}, '${element.color || '#000000'}');\n`;
  }

  // 円エンティティの生成
  private generateCircleEntity(element: CADElement): string {
    const entityId = this.entityCounter++;
    const center = this.formatPoint(element.centerX || 0, element.centerY || 0);
    const radius = element.radius || 1;
    
    return `#${entityId} = SXF_CIRCLE(${center}, ${radius}, '${element.color || '#000000'}');\n`;
  }

  // ポリゴンエンティティの生成
  private generatePolygonEntity(element: CADElement): string {
    const entityId = this.entityCounter++;
    
    // ポリゴンの頂点を解析
    const points = element.points || [];
    const pointsStr = points.map(p => this.formatPoint(p.x, p.y)).join(', ');
    
    return `#${entityId} = SXF_POLYLINE((${pointsStr}), '${element.color || '#000000'}', .T.);\n`;
  }

  // 座標の書式化
  private formatPoint(x: number, y: number, z: number = 0): string {
    const precision = this.options.precision;
    const formattedX = Number(x.toFixed(precision));
    const formattedY = Number(y.toFixed(precision));
    const formattedZ = Number(z.toFixed(precision));
    
    return `CARTESIAN_POINT('', (${formattedX}, ${formattedY}, ${formattedZ}))`;
  }

  // 数値の書式化
  private formatNumber(value: number): string {
    return Number(value.toFixed(this.options.precision)).toString();
  }

  // 文字列のエスケープ
  private escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}