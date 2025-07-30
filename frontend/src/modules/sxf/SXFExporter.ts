import type { CADElement } from '../../types/cad';
import type { SXFLayer } from '../../types/sxf';

export interface SXFExportOptions {
  version?: string;
  encoding?: string;
  author?: string;
  organization?: string;
  coordinateSystem?: string;
  units?: string;
  unitScale?: number;
}

export interface SXFExportResult {
  success: boolean;
  buffer?: ArrayBuffer;
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

export class SXFExporter {
  private options: Required<SXFExportOptions>;
  private errors: string[] = [];
  private warnings: string[] = [];
  private buffer: ArrayBuffer;
  private dataView: DataView;
  private position: number = 0;

  constructor(options: SXFExportOptions = {}) {
    this.options = {
      version: options.version || 'SXF 3.1',
      encoding: options.encoding || 'shift_jis',
      author: options.author || 'CloudCAD',
      organization: options.organization || 'Unknown',
      coordinateSystem: options.coordinateSystem || 'JGD2000',
      units: options.units || 'mm',
      unitScale: options.unitScale ?? 1.0
    };
  }

  // CAD要素をSXFファイルにエクスポート
  async exportElements(elements: CADElement[], layers: SXFLayer[] = []): Promise<SXFExportResult> {
    this.errors = [];
    this.warnings = [];

    try {
      // 必要なバッファサイズを推定
      const estimatedSize = this.estimateBufferSize(elements, layers);
      this.buffer = new ArrayBuffer(estimatedSize);
      this.dataView = new DataView(this.buffer);
      this.position = 0;

      // SXFファイルを構築
      this.writeHeader();
      this.writeLayers(layers.length > 0 ? layers : this.extractLayers(elements));
      this.writeElements(elements);

      // 実際に使用したサイズに合わせてバッファを調整
      const actualBuffer = this.buffer.slice(0, this.position);

      return {
        success: this.errors.length === 0,
        buffer: actualBuffer,
        errors: this.errors,
        warnings: this.warnings
      };
    } catch (error) {
      this.errors.push(`SXFエクスポート中にエラーが発生しました: ${error.message}`);
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  // バッファサイズの推定
  private estimateBufferSize(elements: CADElement[], layers: SXFLayer[]): number {
    // ヘッダー部分: 512バイト
    let size = 512;
    
    // レイヤー部分: 各レイヤーあたり128バイト
    size += (layers.length || 10) * 128;
    
    // 要素部分: 各要素あたり平均256バイト
    size += elements.length * 256;
    
    // 余裕を持って2倍にする
    return size * 2;
  }

  // ヘッダーの書き込み
  private writeHeader(): void {
    // SXFファイル識別子
    this.writeString('SXF3.1  ', 8);
    
    // バージョン情報
    this.writeString(this.options.version.padEnd(16, '\0'), 16);
    
    // 作成者情報
    this.writeString(this.options.author.padEnd(32, '\0'), 32);
    
    // 作成日時（UNIX timestamp）
    this.writeUint32(Math.floor(Date.now() / 1000));
    
    // 単位
    this.writeString(this.options.units.padEnd(8, '\0'), 8);
    
    // エンコーディング
    this.writeString(this.options.encoding.padEnd(16, '\0'), 16);
    
    // 座標系
    this.writeString(this.options.coordinateSystem.padEnd(32, '\0'), 32);
    
    // 予約領域
    for (let i = 0; i < 96; i++) {
      this.writeUint8(0);
    }
  }

  // レイヤー情報の書き込み
  private writeLayers(layers: SXFLayer[]): void {
    for (const layer of layers) {
      this.writeUint8(SXF_SECTIONS.LAYER);
      
      const startPos = this.position;
      this.writeUint32(0); // length placeholder
      
      // レイヤー情報
      this.writeString(layer.id.padEnd(16, '\0'), 16);
      this.writeString(layer.name.padEnd(32, '\0'), 32);
      this.writeColorValue(layer.color);
      this.writeString(layer.lineType.padEnd(16, '\0'), 16);
      this.writeFloat32(layer.lineWidth);
      this.writeUint8(layer.visible ? 1 : 0);
      this.writeUint8(layer.locked ? 1 : 0);
      
      // パディング
      this.writeUint16(0);
      
      // 実際の長さを書き込み
      const endPos = this.position;
      const length = endPos - startPos - 4;
      this.dataView.setUint32(startPos, length, true);
    }
  }

  // 要素の書き込み
  private writeElements(elements: CADElement[]): void {
    for (const element of elements) {
      try {
        this.writeElement(element);
      } catch (error) {
        this.errors.push(`要素 ${element.id} の書き込みに失敗: ${error.message}`);
      }
    }
  }

  // 要素の書き込み
  private writeElement(element: CADElement): void {
    switch (element.type) {
      case 'line':
        this.writeLineElement(element);
        break;
      case 'point':
        this.writePointElement(element);
        break;
      case 'circle':
        this.writeCircleElement(element);
        break;
      case 'text':
        this.writeTextElement(element);
        break;
      case 'polygon':
        this.writePolygonElement(element);
        break;
      default:
        this.warnings.push(`未対応の要素タイプ: ${element.type}`);
    }
  }

  // 線分要素の書き込み
  private writeLineElement(element: CADElement): void {
    this.writeUint8(SXF_SECTIONS.LINE);
    
    const startPos = this.position;
    this.writeUint32(0); // length placeholder
    
    // 要素情報
    this.writeString((element.id || '').padEnd(16, '\0'), 16);
    this.writeString((element.layerId || '0').padEnd(16, '\0'), 16);
    
    // 座標情報
    this.writeFloat64((element.startX || 0) / this.options.unitScale);
    this.writeFloat64((element.startY || 0) / this.options.unitScale);
    this.writeFloat64((element.endX || 0) / this.options.unitScale);
    this.writeFloat64((element.endY || 0) / this.options.unitScale);
    
    // 実際の長さを書き込み
    const endPos = this.position;
    const length = endPos - startPos - 4;
    this.dataView.setUint32(startPos, length, true);
  }

  // 点要素の書き込み
  private writePointElement(element: CADElement): void {
    this.writeUint8(SXF_SECTIONS.POINT);
    
    const startPos = this.position;
    this.writeUint32(0); // length placeholder
    
    // 要素情報
    this.writeString((element.id || '').padEnd(16, '\0'), 16);
    this.writeString((element.layerId || '0').padEnd(16, '\0'), 16);
    
    // 座標情報
    this.writeFloat64((element.startX || 0) / this.options.unitScale);
    this.writeFloat64((element.startY || 0) / this.options.unitScale);
    this.writeFloat64(0); // Z座標
    
    // 実際の長さを書き込み
    const endPos = this.position;
    const length = endPos - startPos - 4;
    this.dataView.setUint32(startPos, length, true);
  }

  // 円要素の書き込み
  private writeCircleElement(element: CADElement): void {
    this.writeUint8(SXF_SECTIONS.CIRCLE);
    
    const startPos = this.position;
    this.writeUint32(0); // length placeholder
    
    // 要素情報
    this.writeString((element.id || '').padEnd(16, '\0'), 16);
    this.writeString((element.layerId || '0').padEnd(16, '\0'), 16);
    
    // 円情報
    this.writeFloat64((element.centerX || 0) / this.options.unitScale);
    this.writeFloat64((element.centerY || 0) / this.options.unitScale);
    this.writeFloat64((element.radius || 1) / this.options.unitScale);
    
    // 実際の長さを書き込み
    const endPos = this.position;
    const length = endPos - startPos - 4;
    this.dataView.setUint32(startPos, length, true);
  }

  // テキスト要素の書き込み
  private writeTextElement(element: CADElement): void {
    this.writeUint8(SXF_SECTIONS.TEXT);
    
    const startPos = this.position;
    this.writeUint32(0); // length placeholder
    
    // 要素情報
    this.writeString((element.id || '').padEnd(16, '\0'), 16);
    this.writeString((element.layerId || '0').padEnd(16, '\0'), 16);
    
    // テキスト情報
    this.writeFloat64((element.startX || 0) / this.options.unitScale);
    this.writeFloat64((element.startY || 0) / this.options.unitScale);
    this.writeFloat64((element.fontSize || 10) / this.options.unitScale);
    this.writeFloat64(element.rotation || 0);
    
    const text = element.text || '';
    this.writeUint16(text.length);
    this.writeString(text, text.length);
    
    // 実際の長さを書き込み
    const endPos = this.position;
    const length = endPos - startPos - 4;
    this.dataView.setUint32(startPos, length, true);
  }

  // ポリゴン要素の書き込み（ポリラインとして）
  private writePolygonElement(element: CADElement): void {
    this.writeUint8(SXF_SECTIONS.POLYLINE);
    
    const startPos = this.position;
    this.writeUint32(0); // length placeholder
    
    // 要素情報
    this.writeString((element.id || '').padEnd(16, '\0'), 16);
    this.writeString((element.layerId || '0').padEnd(16, '\0'), 16);
    
    // ポイント数
    const points = element.points || [];
    this.writeUint32(points.length);
    
    // 各ポイントの書き込み
    for (const point of points) {
      this.writeFloat64(point.x / this.options.unitScale);
      this.writeFloat64(point.y / this.options.unitScale);
      this.writeFloat64((point.z || 0) / this.options.unitScale);
    }
    
    // 閉じた図形かどうか
    this.writeUint8(1); // closed
    
    // 実際の長さを書き込み
    const endPos = this.position;
    const length = endPos - startPos - 4;
    this.dataView.setUint32(startPos, length, true);
  }

  // レイヤー情報の抽出
  private extractLayers(elements: CADElement[]): SXFLayer[] {
    const layerMap = new Map<string, SXFLayer>();
    
    for (const element of elements) {
      const layerId = element.layerId || 'default';
      if (!layerMap.has(layerId)) {
        layerMap.set(layerId, {
          id: layerId,
          name: layerId,
          color: element.color || '#000000',
          lineType: 'CONTINUOUS',
          lineWidth: element.lineWidth || 1.0,
          visible: true,
          locked: false
        });
      }
    }
    
    return Array.from(layerMap.values());
  }

  // データ書き込みヘルパー関数群
  private writeUint8(value: number): void {
    this.dataView.setUint8(this.position, value);
    this.position += 1;
  }

  private writeUint16(value: number): void {
    this.dataView.setUint16(this.position, value, true); // little endian
    this.position += 2;
  }

  private writeUint32(value: number): void {
    this.dataView.setUint32(this.position, value, true); // little endian
    this.position += 4;
  }

  private writeFloat32(value: number): void {
    this.dataView.setFloat32(this.position, value, true); // little endian
    this.position += 4;
  }

  private writeFloat64(value: number): void {
    this.dataView.setFloat64(this.position, value, true); // little endian
    this.position += 8;
  }

  private writeString(str: string, length: number): void {
    // Shift_JISエンコード（簡易版）
    if (this.options.encoding === 'shift_jis') {
      this.writeShiftJIS(str, length);
    } else {
      // UTF-8として処理
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);
      const maxLength = Math.min(bytes.length, length);
      
      for (let i = 0; i < maxLength; i++) {
        this.writeUint8(bytes[i]);
      }
      
      // 残りをゼロで埋める
      for (let i = maxLength; i < length; i++) {
        this.writeUint8(0);
      }
    }
  }

  private writeColorValue(color: string): void {
    // #RRGGBB形式の色をRGBA形式に変換
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    
    this.writeUint8(r);
    this.writeUint8(g);
    this.writeUint8(b);
    this.writeUint8(255); // alpha
  }

  // Shift_JISエンコード（簡易版）
  private writeShiftJIS(str: string, length: number): void {
    let byteCount = 0;
    
    for (let i = 0; i < str.length && byteCount < length; i++) {
      const char = str.charCodeAt(i);
      
      // ASCII範囲の場合はそのまま
      if (char < 0x80) {
        this.writeUint8(char);
        byteCount++;
      } else {
        // 非ASCII文字は '?' で代替（実際のShift_JIS変換は複雑）
        this.writeUint8(0x3F); // '?'
        byteCount++;
      }
    }
    
    // 残りをゼロで埋める
    for (let i = byteCount; i < length; i++) {
      this.writeUint8(0);
    }
  }
}