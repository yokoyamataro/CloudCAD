import type { 
  SXFFile, 
  SXFHeader, 
  SXFElement, 
  SXFLayer,
  SXFLine,
  SXFPoint,
  SXFCircle,
  SXFText,
  SXFPolyline,
  SXFArc
} from '../../types/sxf';

export interface SXFParseOptions {
  encoding?: string;
  strictMode?: boolean;
  ignoreErrors?: boolean;
  coordinateSystem?: string;
  unitScale?: number;
}

export interface SXFParseResult {
  success: boolean;
  data?: SXFFile;
  errors: string[];
  warnings: string[];
}

// SXFファイルのセクション識別子
const SXF_SECTIONS = {
  HEADER: 0x01,
  FEATURE: 0x02,
  LAYER: 0x03,
  LINE: 0x10,
  CIRCLE: 0x11,
  ARC: 0x12,
  TEXT: 0x13,
  POINT: 0x14,
  POLYLINE: 0x15,
  SPLINE: 0x16,
  HATCH: 0x17
};

export class SXFParser {
  private options: Required<SXFParseOptions>;
  private errors: string[] = [];
  private warnings: string[] = [];
  private dataView: DataView;
  private position: number = 0;

  constructor(options: SXFParseOptions = {}) {
    this.options = {
      encoding: options.encoding || 'shift_jis',
      strictMode: options.strictMode ?? true,
      ignoreErrors: options.ignoreErrors ?? false,
      coordinateSystem: options.coordinateSystem || 'JGD2000',
      unitScale: options.unitScale ?? 1.0
    };
  }

  // SXFファイルのパース
  async parseFile(buffer: ArrayBuffer): Promise<SXFParseResult> {
    this.errors = [];
    this.warnings = [];
    this.dataView = new DataView(buffer);
    this.position = 0;

    try {
      // SXFファイルヘッダーの確認
      if (!this.validateSXFHeader()) {
        throw new Error('有効なSXFファイルではありません');
      }

      // ヘッダー情報の読み込み
      const header = this.parseHeader();
      
      // レイヤー情報の読み込み
      const layers = this.parseLayers();
      
      // 図形要素の読み込み
      const elements = this.parseElements();

      const sxfFile: SXFFile = {
        header,
        layers,
        elements,
        metadata: {
          fileSize: buffer.byteLength,
          elementsCount: elements.length,
          layersCount: layers.length
        }
      };

      return {
        success: this.errors.length === 0,
        data: sxfFile,
        errors: this.errors,
        warnings: this.warnings
      };
    } catch (error) {
      this.errors.push(`SXF解析中にエラーが発生しました: ${error.message}`);
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  // SXFファイルヘッダーの検証
  private validateSXFHeader(): boolean {
    if (this.dataView.byteLength < 32) {
      return false;
    }

    // SXFファイルの識別子をチェック
    const magic = this.readString(8);
    return magic.startsWith('SXF') || magic.includes('CAD');
  }

  // ヘッダー情報の解析
  private parseHeader(): SXFHeader {
    // SXFヘッダーの標準構造に従って読み込み
    const version = this.readString(16).trim();
    const createdBy = this.readString(32).trim();
    const createdDate = new Date(this.readUint32() * 1000);
    const units = this.readString(8).trim() || 'mm';
    const encoding = this.readString(16).trim() || this.options.encoding;

    return {
      version: version || 'SXF 3.1',
      createdBy: createdBy || 'Unknown',
      createdDate,
      encoding,
      units
    };
  }

  // レイヤー情報の解析
  private parseLayers(): SXFLayer[] {
    const layers: SXFLayer[] = [];
    
    while (this.position < this.dataView.byteLength) {
      const sectionType = this.readUint8();
      
      if (sectionType === SXF_SECTIONS.LAYER) {
        const layer = this.parseLayer();
        if (layer) {
          layers.push(layer);
        }
      } else if (sectionType >= SXF_SECTIONS.LINE) {
        // 図形要素のセクションに到達したら終了
        this.position--;
        break;
      } else {
        // 不明なセクションをスキップ
        this.skipSection();
      }
    }
    
    return layers;
  }

  // レイヤー情報の解析
  private parseLayer(): SXFLayer | null {
    try {
      const length = this.readUint32();
      const layerId = this.readString(16).trim();
      const name = this.readString(32).trim();
      const color = this.readColorValue();
      const lineType = this.readString(16).trim();
      const lineWidth = this.readFloat32();
      const visible = this.readUint8() === 1;
      const locked = this.readUint8() === 1;

      return {
        id: layerId,
        name: name || layerId,
        color,
        lineType: lineType || 'CONTINUOUS',
        lineWidth: lineWidth || 1.0,
        visible,
        locked
      };
    } catch (error) {
      this.errors.push(`レイヤー解析エラー: ${error.message}`);
      return null;
    }
  }

  // 図形要素の解析
  private parseElements(): SXFElement[] {
    const elements: SXFElement[] = [];
    
    while (this.position < this.dataView.byteLength) {
      try {
        const sectionType = this.readUint8();
        const element = this.parseElement(sectionType);
        
        if (element) {
          elements.push(element);
        }
      } catch (error) {
        this.errors.push(`要素解析エラー: ${error.message}`);
        if (this.options.strictMode) {
          break;
        }
      }
    }
    
    return elements;
  }

  // 図形要素の解析
  private parseElement(sectionType: number): SXFElement | null {
    switch (sectionType) {
      case SXF_SECTIONS.LINE:
        return this.parseLineElement();
      case SXF_SECTIONS.POINT:
        return this.parsePointElement();
      case SXF_SECTIONS.CIRCLE:
        return this.parseCircleElement();
      case SXF_SECTIONS.TEXT:
        return this.parseTextElement();
      case SXF_SECTIONS.POLYLINE:
        return this.parsePolylineElement();
      case SXF_SECTIONS.ARC:
        return this.parseArcElement();
      default:
        this.warnings.push(`未対応の要素タイプ: ${sectionType}`);
        this.skipSection();
        return null;
    }
  }

  // 線分要素の解析
  private parseLineElement(): SXFLine {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const startX = this.readFloat64() * this.options.unitScale;
    const startY = this.readFloat64() * this.options.unitScale;
    const endX = this.readFloat64() * this.options.unitScale;
    const endY = this.readFloat64() * this.options.unitScale;
    
    return {
      id,
      type: 'LINE',
      layerId,
      startPoint: { x: startX, y: startY, z: 0 },
      endPoint: { x: endX, y: endY, z: 0 },
      visible: true,
      attributes: {}
    };
  }

  // 点要素の解析
  private parsePointElement(): SXFPoint {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const x = this.readFloat64() * this.options.unitScale;
    const y = this.readFloat64() * this.options.unitScale;
    const z = this.readFloat64() * this.options.unitScale;
    
    return {
      id,
      type: 'POINT',
      layerId,
      position: { x, y, z },
      visible: true,
      attributes: {}
    };
  }

  // 円要素の解析
  private parseCircleElement(): SXFCircle {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const centerX = this.readFloat64() * this.options.unitScale;
    const centerY = this.readFloat64() * this.options.unitScale;
    const radius = this.readFloat64() * this.options.unitScale;
    
    return {
      id,
      type: 'CIRCLE',
      layerId,
      center: { x: centerX, y: centerY, z: 0 },
      radius,
      visible: true,
      attributes: {}
    };
  }

  // テキスト要素の解析
  private parseTextElement(): SXFText {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const x = this.readFloat64() * this.options.unitScale;
    const y = this.readFloat64() * this.options.unitScale;
    const height = this.readFloat64() * this.options.unitScale;
    const rotation = this.readFloat64();
    const textLength = this.readUint16();
    const text = this.readString(textLength);
    
    return {
      id,
      type: 'TEXT',
      layerId,
      text,
      position: { x, y, z: 0 },
      height,
      rotation,
      visible: true,
      attributes: {}
    };
  }

  // ポリライン要素の解析
  private parsePolylineElement(): SXFPolyline {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const pointCount = this.readUint32();
    const points: Array<{x: number, y: number, z: number}> = [];
    
    for (let i = 0; i < pointCount; i++) {
      const x = this.readFloat64() * this.options.unitScale;
      const y = this.readFloat64() * this.options.unitScale;
      const z = this.readFloat64() * this.options.unitScale;
      points.push({ x, y, z });
    }
    
    const closed = this.readUint8() === 1;
    
    return {
      id,
      type: 'POLYLINE',
      layerId,
      points,
      closed,
      visible: true,
      attributes: {}
    };
  }

  // 円弧要素の解析
  private parseArcElement(): SXFArc {
    const length = this.readUint32();
    const id = this.readString(16).trim();
    const layerId = this.readString(16).trim();
    
    const centerX = this.readFloat64() * this.options.unitScale;
    const centerY = this.readFloat64() * this.options.unitScale;
    const radius = this.readFloat64() * this.options.unitScale;
    const startAngle = this.readFloat64();
    const endAngle = this.readFloat64();
    
    return {
      id,
      type: 'ARC',
      layerId,
      center: { x: centerX, y: centerY, z: 0 },
      radius,
      startAngle,
      endAngle,
      visible: true,
      attributes: {}
    };
  }

  // データ読み込みヘルパー関数群
  private readUint8(): number {
    const value = this.dataView.getUint8(this.position);
    this.position += 1;
    return value;
  }

  private readUint16(): number {
    const value = this.dataView.getUint16(this.position, true); // little endian
    this.position += 2;
    return value;
  }

  private readUint32(): number {
    const value = this.dataView.getUint32(this.position, true); // little endian
    this.position += 4;
    return value;
  }

  private readFloat32(): number {
    const value = this.dataView.getFloat32(this.position, true); // little endian
    this.position += 4;
    return value;
  }

  private readFloat64(): number {
    const value = this.dataView.getFloat64(this.position, true); // little endian
    this.position += 8;
    return value;
  }

  private readString(length: number): string {
    const bytes = new Uint8Array(this.dataView.buffer, this.position, length);
    this.position += length;
    
    // Shift_JISデコード（簡易版）
    if (this.options.encoding === 'shift_jis') {
      return this.decodeShiftJIS(bytes);
    } else {
      // UTF-8として処理
      return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '');
    }
  }

  private readColorValue(): string {
    const r = this.readUint8();
    const g = this.readUint8();
    const b = this.readUint8();
    this.readUint8(); // alpha channel (unused)
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private skipSection(): void {
    const length = this.readUint32();
    this.position += length;
  }

  // Shift_JISデコード（簡易版）
  private decodeShiftJIS(bytes: Uint8Array): string {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte === 0) break; // null terminator
      
      // 簡易的なShift_JIS処理（ASCII範囲のみ）
      if (byte < 0x80) {
        result += String.fromCharCode(byte);
      } else {
        // 実際のShift_JIS処理は複雑なので、ここでは代替文字を使用
        result += '?';
      }
    }
    return result;
  }
}