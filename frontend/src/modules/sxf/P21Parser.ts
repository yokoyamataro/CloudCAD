import type { 
  SXFFile, 
  SXFHeader, 
  SXFLayer, 
  SXFElement,
  P21ParseOptions,
  P21ParseResult,
  P21Entity,
  SXFLine,
  SXFCircle,
  SXFText,
  SXFPoint,
  SXFPolyline
} from '../../types/sxf';

export class P21Parser {
  private options: Required<P21ParseOptions>;
  private errors: string[] = [];
  private warnings: string[] = [];
  private entities: Map<number, P21Entity> = new Map();

  constructor(options: P21ParseOptions = {}) {
    this.options = {
      encoding: options.encoding || 'utf-8',
      strictMode: options.strictMode ?? true,
      ignoreErrors: options.ignoreErrors ?? false,
      coordinateSystem: options.coordinateSystem || 'JGD2000',
      unitScale: options.unitScale ?? 1.0
    };
  }

  // メインのパース関数
  async parseFile(fileContent: string): Promise<P21ParseResult> {
    this.errors = [];
    this.warnings = [];
    this.entities.clear();

    try {
      // P21ファイルの基本構造を解析
      const sections = this.splitIntoSections(fileContent);
      
      // HEADERセクションの解析
      const header = this.parseHeader(sections.header);
      
      // DATAセクションの解析
      this.parseDataSection(sections.data);
      
      // SXFファイル構造の構築
      const sxfFile = this.buildSXFFile(header);

      return {
        success: this.errors.length === 0,
        data: sxfFile,
        errors: this.errors,
        warnings: this.warnings
      };
    } catch (error) {
      this.errors.push(`解析中にエラーが発生しました: ${error.message}`);
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings
      };
    }
  }

  // P21ファイルをセクションに分割
  private splitIntoSections(content: string): { header: string; data: string; end: string } {
    const headerMatch = content.match(/ISO-10303-21;\s*HEADER;\s*(.*?)\s*ENDSEC;/s);
    const dataMatch = content.match(/DATA;\s*(.*?)\s*ENDSEC;/s);
    const endMatch = content.match(/END-ISO-10303-21;\s*$/s);

    if (!headerMatch || !dataMatch || !endMatch) {
      throw new Error('P21ファイルの基本構造が無効です');
    }

    return {
      header: headerMatch[1],
      data: dataMatch[1],
      end: endMatch[0]
    };
  }

  // HEADERセクションの解析
  private parseHeader(headerContent: string): SXFHeader {
    const lines = headerContent.split('\n').map(line => line.trim()).filter(line => line);
    
    const header: SXFHeader = {
      version: 'SXF 3.1',
      createdBy: 'Unknown',
      createdDate: new Date(),
      encoding: this.options.encoding,
      units: 'mm'
    };

    for (const line of lines) {
      if (line.startsWith('FILE_DESCRIPTION')) {
        // ファイル説明の解析
        const match = line.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']+)'/);
        if (match) {
          header.version = match[1];
        }
      } else if (line.startsWith('FILE_NAME')) {
        // ファイル名と作成情報の解析
        const match = line.match(/FILE_NAME\s*\(\s*'[^']*',\s*'([^']*)',\s*\(\s*'([^']*)'/);
        if (match) {
          header.createdDate = this.parseDate(match[1]);
          header.createdBy = match[2];
        }
      } else if (line.startsWith('FILE_SCHEMA')) {
        // スキーマ情報の解析
        const match = line.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/);
        if (match) {
          // SXFバージョンの判定
          if (match[1].includes('SXF')) {
            header.version = match[1];
          }
        }
      }
    }

    return header;
  }

  // DATAセクションの解析
  private parseDataSection(dataContent: string): void {
    // P21エンティティの正規表現パターン
    const entityPattern = /#(\d+)\s*=\s*([A-Z_]+)\s*\((.*?)\)\s*;/g;
    let match;

    while ((match = entityPattern.exec(dataContent)) !== null) {
      const [, idStr, type, paramsStr] = match;
      const id = parseInt(idStr, 10);
      
      try {
        const parameters = this.parseParameters(paramsStr);
        this.entities.set(id, { id, type, parameters });
      } catch (error) {
        this.errors.push(`エンティティ #${id} の解析に失敗しました: ${error.message}`);
      }
    }
  }

  // パラメータの解析
  private parseParameters(paramStr: string): any[] {
    const params: any[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < paramStr.length; i++) {
      const char = paramStr[i];

      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }

      if (char === '\\' && inString) {
        escaped = true;
        current += char;
        continue;
      }

      if (char === "'" && !escaped) {
        inString = !inString;
        current += char;
        continue;
      }

      if (!inString) {
        if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
        } else if (char === ',' && depth === 0) {
          params.push(this.parseValue(current.trim()));
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      params.push(this.parseValue(current.trim()));
    }

    return params;
  }

  // 値の解析（数値、文字列、参照など）
  private parseValue(value: string): any {
    value = value.trim();

    // 空値
    if (value === '$' || value === '') {
      return null;
    }

    // 参照（#123 形式）
    if (value.startsWith('#')) {
      const refId = parseInt(value.substring(1), 10);
      return { ref: refId };
    }

    // 文字列（'...' 形式）
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.substring(1, value.length - 1).replace(/\\'/g, "'");
    }

    // 数値
    if (/^-?\d+\.?\d*$/.test(value)) {
      return parseFloat(value);
    }

    // 論理値
    if (value === '.T.' || value === '.TRUE.') {
      return true;
    }
    if (value === '.F.' || value === '.FALSE.') {
      return false;
    }

    // 列挙値
    if (value.startsWith('.') && value.endsWith('.')) {
      return value.substring(1, value.length - 1);
    }

    // 配列やタプル（(...) 形式）
    if (value.startsWith('(') && value.endsWith(')')) {
      const innerValue = value.substring(1, value.length - 1);
      return this.parseParameters(innerValue);
    }

    // その他の値
    return value;
  }

  // SXFファイル構造の構築
  private buildSXFFile(header: SXFHeader): SXFFile {
    const layers: SXFLayer[] = [];
    const elements: SXFElement[] = [];

    // エンティティからSXF要素を構築
    for (const entity of this.entities.values()) {
      try {
        switch (entity.type) {
          case 'SXF_LAYER':
            layers.push(this.buildLayer(entity));
            break;
          case 'SXF_LINE':
            elements.push(this.buildLine(entity));
            break;
          case 'SXF_CIRCLE':
            elements.push(this.buildCircle(entity));
            break;
          case 'SXF_TEXT':
            elements.push(this.buildText(entity));
            break;
          case 'SXF_POINT':
            elements.push(this.buildPoint(entity));
            break;
          case 'SXF_POLYLINE':
            elements.push(this.buildPolyline(entity));
            break;
          default:
            this.warnings.push(`未対応のエンティティタイプ: ${entity.type}`);
        }
      } catch (error) {
        this.errors.push(`エンティティ #${entity.id} の変換に失敗しました: ${error.message}`);
      }
    }

    return {
      header,
      layers,
      elements,
      metadata: {
        totalEntities: this.entities.size,
        supportedElements: elements.length,
        parseTime: new Date().toISOString()
      }
    };
  }

  // レイヤーの構築
  private buildLayer(entity: P21Entity): SXFLayer {
    return {
      id: entity.id.toString(),
      name: entity.parameters[0] || `Layer${entity.id}`,
      color: entity.parameters[1] || '#000000',
      lineType: entity.parameters[2] || 'CONTINUOUS',
      lineWidth: entity.parameters[3] || 1,
      visible: entity.parameters[4] !== false,
      locked: entity.parameters[5] === true
    };
  }

  // 線分の構築
  private buildLine(entity: P21Entity): SXFLine {
    const startPoint = this.resolvePoint(entity.parameters[0]);
    const endPoint = this.resolvePoint(entity.parameters[1]);
    
    return {
      id: entity.id.toString(),
      type: 'LINE',
      layerId: entity.parameters[2]?.ref?.toString() || '0',
      startPoint,
      endPoint,
      visible: true,
      attributes: {}
    };
  }

  // 円の構築
  private buildCircle(entity: P21Entity): SXFCircle {
    const center = this.resolvePoint(entity.parameters[0]);
    const radius = entity.parameters[1] || 1;

    return {
      id: entity.id.toString(),
      type: 'CIRCLE',
      layerId: entity.parameters[2]?.ref?.toString() || '0',
      center,
      radius,
      visible: true,
      attributes: {}
    };
  }

  // テキストの構築
  private buildText(entity: P21Entity): SXFText {
    const position = this.resolvePoint(entity.parameters[0]);
    const text = entity.parameters[1] || '';
    const height = entity.parameters[2] || 10;
    const rotation = entity.parameters[3] || 0;

    return {
      id: entity.id.toString(),
      type: 'TEXT',
      layerId: entity.parameters[4]?.ref?.toString() || '0',
      text,
      position,
      height,
      rotation,
      visible: true,
      attributes: {}
    };
  }

  // 点の構築
  private buildPoint(entity: P21Entity): SXFPoint {
    const position = this.resolvePoint(entity.parameters[0]);

    return {
      id: entity.id.toString(),
      type: 'POINT',
      layerId: entity.parameters[1]?.ref?.toString() || '0',
      position,
      visible: true,
      attributes: {}
    };
  }

  // ポリラインの構築
  private buildPolyline(entity: P21Entity): SXFPolyline {
    const points = entity.parameters[0]?.map((p: any) => this.resolvePoint(p)) || [];
    const closed = entity.parameters[1] === true;

    return {
      id: entity.id.toString(),
      type: 'POLYLINE',
      layerId: entity.parameters[2]?.ref?.toString() || '0',
      points,
      closed,
      visible: true,
      attributes: {}
    };
  }

  // 点座標の解決
  private resolvePoint(pointRef: any): [number, number, number?] {
    if (Array.isArray(pointRef)) {
      return [
        (pointRef[0] || 0) * this.options.unitScale,
        (pointRef[1] || 0) * this.options.unitScale,
        pointRef[2] ? pointRef[2] * this.options.unitScale : undefined
      ];
    }

    if (pointRef?.ref) {
      const entity = this.entities.get(pointRef.ref);
      if (entity && entity.type === 'CARTESIAN_POINT') {
        return this.resolvePoint(entity.parameters[0]);
      }
    }

    return [0, 0];
  }

  // 日付の解析
  private parseDate(dateString: string): Date {
    try {
      return new Date(dateString);
    } catch {
      return new Date();
    }
  }
}