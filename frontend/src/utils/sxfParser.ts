/**
 * SXF (SFC) ファイルパーサー
 * 測量業界で使用されるSXF形式のCADデータを解析
 */

// SXF名前文字列の正規化
const normalizeSXFName = (name: string): string => {
  const trimmed = name.replace(/'/g, '').trim();
  
  console.log(`SXF名前正規化: "${trimmed}"`);
  
  // 特殊なSXF名前パターンの処理
  if (trimmed.startsWith('$$ATRU$$')) {
    console.log('-> 用紙レベル');
    return '用紙レベル';
  }
  
  // 空の名前の場合
  if (!trimmed || trimmed === '0') {
    console.log('-> 無名レベル');
    return '無名レベル';
  }
  
  // Shift-JISでデコードされた名前をそのまま使用
  console.log(`-> "${trimmed}" (Shift-JISデコード済み)`);
  return trimmed;
};

export interface SXFElement {
  id: number;
  type: string;
  parameters: string[];
  properties: Record<string, any>;
  levelId?: string; // 所属レベルID
}

export interface SXFLevel {
  id: string;
  name: string;
  levelNumber: number;  // 読込順の番号
  originX: number;
  originY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface SXFData {
  header: {
    description: string;
    fileName: string;
    createdDate: string;
    creator: string;
    software: string;
    schema: string;
  };
  elements: SXFElement[];
  levels: SXFLevel[];  // 追加
  colors: Record<number, { r: number; g: number; b: number }>;
  fonts: Record<number, string>;
  lineWidths: Record<number, number>;
  paperSize?: {
    width: number;
    height: number;
    title?: string;
  };
  statistics: {
    totalElements: number;
    elementTypes: Record<string, number>;
    coordinateRange: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
  };
}

export class SXFParser {
  private data: SXFData;

  constructor() {
    this.data = {
      header: {
        description: '',
        fileName: '',
        createdDate: '',
        creator: '',
        software: '',
        schema: ''
      },
      elements: [],
      levels: [],
      colors: {},
      fonts: {},
      lineWidths: {},
      statistics: {
        totalElements: 0,
        elementTypes: {},
        coordinateRange: {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity
        }
      }
    };
  }

  /**
   * SXFファイルの内容をパースする（サンプル実装）
   * 実際の実装では、大きなファイルを段階的に処理する必要がある
   */
  async parseSXF(fileContent: string): Promise<SXFData> {
    const lines = fileContent.split('\n');
    let isHeader = false;
    let isData = false;
    
    console.log(`SXF解析開始: ${lines.length}行`);
    
    // ヘッダー解析
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      const line = lines[i].trim();
      
      if (line === 'HEADER;') {
        isHeader = true;
        continue;
      }
      
      if (line === 'ENDSEC;') {
        isHeader = false;
        continue;
      }
      
      if (line === 'DATA;') {
        isData = true;
        break;
      }
      
      if (isHeader) {
        this.parseHeaderLine(line);
      }
    }

    // レベルグループ化とデータ要素の解析
    this.parseDataWithLevelGrouping(lines);
    
    console.log(`SXF解析完了: ${this.data.elements.length}要素を処理`);
    
    // レベル番号を再整理
    this.reassignLevelNumbers();
    
    return this.data;
  }

  /**
   * レベルグループ化を考慮したデータ解析
   * feature系要素からsfig_org_featureまでを1つのレベルグループとして扱う
   */
  private parseDataWithLevelGrouping(lines: string[]): void {
    let currentLevel: SXFLevel | null = null;
    let currentLevelElements: SXFElement[] = [];
    let elementCount = 0;
    const maxElements = 1000; // パフォーマンステスト用の制限
    
    console.log('=== レベルグループ化解析開始 ===');
    
    for (let i = 0; i < lines.length && elementCount < maxElements; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('/*SXF') || line === 'SXF*/') {
        continue;
      }
      
      if (line.startsWith('#') && line.includes('=')) {
        const element = this.parseDataLine(line);
        if (!element) continue;
        
        // sfig_org_featureを検出した場合、新しいレベルの開始
        if (element.type === 'sfig_org_feature') {
          // 前のレベルが完了していれば処理
          if (currentLevel && currentLevelElements.length > 0) {
            this.finalizeLevelGroup(currentLevel, currentLevelElements);
          }
          
          // 新しいレベルグループを開始
          const levelName = normalizeSXFName(element.parameters[0] || '無名レベル');
          const tempLevelNumber = this.data.levels.length;
          
          currentLevel = {
            id: `level_${tempLevelNumber}`,
            name: levelName,
            levelNumber: tempLevelNumber,
            originX: 0,
            originY: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1
          };
          
          currentLevelElements = [];
          console.log(`新しいレベルグループ開始: ${levelName}`);
        }
        // sfig_locate_featureを検出した場合、レベル設定を適用
        else if (element.type === 'sfig_locate_feature' && currentLevel) {
          if (element.properties.cadLevel) {
            const locateLevel = element.properties.cadLevel;
            // 現在のレベルに座標設定を適用
            currentLevel.originX = locateLevel.originX;
            currentLevel.originY = locateLevel.originY;
            currentLevel.rotation = locateLevel.rotation;
            currentLevel.scaleX = locateLevel.scaleX;
            currentLevel.scaleY = locateLevel.scaleY;
            
            console.log(`レベル設定適用: ${currentLevel.name} - 原点(${currentLevel.originX}, ${currentLevel.originY}), 縮尺(${currentLevel.scaleX}, ${currentLevel.scaleY}), 回転${currentLevel.rotation}°`);
          }
        }
        // その他の要素は現在のレベルに追加
        else if (currentLevel) {
          currentLevelElements.push(element);
          elementCount++;
        }
        
        // 全体の要素リストにも追加
        this.data.elements.push(element);
        this.updateStatistics(element);
        
        // 用紙サイズ情報の保存
        if (element.properties.paperSize && !this.data.paperSize) {
          this.data.paperSize = element.properties.paperSize;
        }
      }
    }
    
    // 最後のレベルグループを処理
    if (currentLevel && currentLevelElements.length > 0) {
      this.finalizeLevelGroup(currentLevel, currentLevelElements);
    }
    
    console.log(`=== レベルグループ化解析完了: ${this.data.levels.length}レベル、${elementCount}要素 ===`);
  }

  /**
   * レベルグループを完了させる
   */
  private finalizeLevelGroup(level: SXFLevel, elements: SXFElement[]): void {
    // レベルにIDを設定
    elements.forEach(element => {
      element.levelId = level.id;
    });
    
    // レベルをデータに追加
    this.data.levels.push(level);
    
    console.log(`レベルグループ完了: ${level.name} (${elements.length}要素)`);
  }

  private parseHeaderLine(line: string): void {
    if (line.startsWith('FILE_DESCRIPTION')) {
      const match = line.match(/FILE_DESCRIPTION\(\('([^']+)'\)/);
      if (match) {
        this.data.header.description = match[1];
      }
    } else if (line.startsWith('FILE_NAME')) {
      // ファイル名とメタデータの抽出
      this.data.header.fileName = 'SXF File';
    } else if (line.startsWith('FILE_SCHEMA')) {
      const match = line.match(/FILE_SCHEMA\(\('([^']+)'\)/);
      if (match) {
        this.data.header.schema = match[1];
      }
    }
  }

  private parseDataLine(line: string): SXFElement | null {
    const match = line.match(/#(\d+)\s*=\s*(\w+)\((.*)\)/);
    if (!match) return null;

    const id = parseInt(match[1]);
    const type = match[2];
    const paramString = match[3];
    
    // パラメータを解析（簡単な実装）
    const parameters = this.parseParameters(paramString);
    
    const element: SXFElement = {
      id,
      type,
      parameters,
      properties: this.extractProperties(type, parameters)
    };

    // 統計情報の更新
    this.data.statistics.elementTypes[type] = (this.data.statistics.elementTypes[type] || 0) + 1;

    return element;
  }

  private parseParameters(paramString: string): string[] {
    // 簡単なパラメータ解析（実際の実装ではより複雑）
    const params: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of paramString) {
      if (char === "'" && !inQuotes) {
        inQuotes = true;
        current += char;
      } else if (char === "'" && inQuotes) {
        inQuotes = false;
        current += char;
      } else if (char === ',' && !inQuotes) {
        params.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      params.push(current.trim());
    }
    
    return params;
  }

  private extractProperties(type: string, parameters: string[]): Record<string, any> {
    const props: Record<string, any> = {};

    switch (type) {
      case 'user_defined_colour_feature':
        if (parameters.length >= 3) {
          props.color = {
            r: parseInt(parameters[0].replace(/'/g, '')),
            g: parseInt(parameters[1].replace(/'/g, '')),
            b: parseInt(parameters[2].replace(/'/g, ''))
          };
        }
        break;
        
      case 'arc_feature':
        if (parameters.length >= 6) {
          props.centerX = parseFloat(parameters[4].replace(/'/g, ''));
          props.centerY = parseFloat(parameters[5].replace(/'/g, ''));
          if (parameters.length >= 7) {
            props.radius = parseFloat(parameters[6].replace(/'/g, ''));
          }
        }
        break;
        
      case 'CARTESIAN_POINT':
        // CARTESIAN_POINTの座標を抽出
        if (parameters.length >= 2) {
          const x = parseFloat(parameters[0].replace(/'/g, '').replace('(', '').replace(')', ''));
          const y = parseFloat(parameters[1].replace(/'/g, '').replace('(', '').replace(')', ''));
          if (!isNaN(x) && !isNaN(y)) {
            props.x = x;
            props.y = y;
            props.hasCoordinates = true;
          }
        }
        break;
        
      case 'CIRCLE':
        // 円要素の処理
        if (parameters.length >= 2) {
          props.circleData = true;
          // 参照されたポイントやプレースメントをここで処理
        }
        break;
        
      case 'POLYLINE':
        // ポリライン要素の処理
        props.polylineData = true;
        break;
        
      case 'LINE':
        // 線要素の処理
        props.lineData = true;
        break;
        
      case 'polyline_feature':
        // ポリライン特徴の処理
        if (parameters.length >= 6) {
          const xCoords = parameters[5].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
          const yCoords = parameters[6].replace(/[()]/g, '').split(',').map(s => parseFloat(s.trim()));
          
          // 座標ペアを作成
          const points = [];
          for (let i = 0; i < Math.min(xCoords.length, yCoords.length); i++) {
            if (!isNaN(xCoords[i]) && !isNaN(yCoords[i])) {
              points.push({ x: xCoords[i], y: yCoords[i] });
            }
          }
          
          props.polylinePoints = points;
          props.hasPolylineData = true;
          
          console.log(`polyline_feature解析: ${points.length}個のポイント`, points.slice(0, 3));
        }
        break;
        
      case 'width_feature':
        if (parameters.length >= 1) {
          props.width = parseFloat(parameters[0].replace(/'/g, ''));
        }
        break;
        
      case 'text_font_feature':
        if (parameters.length >= 1) {
          props.fontName = parameters[0].replace(/'/g, '');
        }
        break;
        
      case 'drawing_sheet_feature':
        // 用紙サイズ情報の抽出
        if (parameters.length >= 5) {
          const title = parameters[0].replace(/'/g, '');
          const width = parseFloat(parameters[3].replace(/'/g, ''));
          const height = parseFloat(parameters[4].replace(/'/g, ''));
          
          if (!isNaN(width) && !isNaN(height)) {
            props.paperSize = { width, height, title };
            console.log(`用紙サイズ検出: ${width} x ${height} (${title})`);
          }
        }
        break;
        
      case 'sfig_locate_feature':
        // CADレベル情報の抽出
        if (parameters.length >= 7) {
          const rawName = parameters[1];
          const normalizedName = normalizeSXFName(rawName);
          const originX = parseFloat(parameters[2].replace(/'/g, ''));
          const originY = parseFloat(parameters[3].replace(/'/g, ''));
          const rotation = parseFloat(parameters[4].replace(/'/g, ''));
          const scaleX = parseFloat(parameters[5].replace(/'/g, ''));
          const scaleY = parseFloat(parameters[6].replace(/'/g, ''));
          
          if (!isNaN(originX) && !isNaN(originY) && !isNaN(rotation) && !isNaN(scaleX) && !isNaN(scaleY)) {
            const tempLevelNumber = this.data.levels.length; // 一時的な番号
            const level: SXFLevel = {
              id: `level_${tempLevelNumber}`,
              name: normalizedName,
              levelNumber: tempLevelNumber, // 後で再割り当て
              originX: originX,
              originY: originY,
              rotation: rotation,
              scaleX: scaleX,
              scaleY: scaleY
            };
            
            this.data.levels.push(level);
            props.cadLevel = level;
            
            console.log(`CADレベル検出[一時${tempLevelNumber}]: ${normalizedName} (元: ${rawName}) - 原点(${originX}, ${originY}), 回転${rotation}°, 縮尺(${scaleX}, ${scaleY})`);
          }
        }
        break;
    }

    return props;
  }

  private updateStatistics(element: SXFElement): void {
    this.data.statistics.totalElements++;
    
    // 座標範囲の更新 - 複数のソースから座標を取得
    let coordinates: {x: number, y: number}[] = [];
    
    // arc_featureから座標取得
    if (element.properties.centerX !== undefined && element.properties.centerY !== undefined) {
      coordinates.push({x: element.properties.centerX, y: element.properties.centerY});
    }
    
    // CARTESIAN_POINTから座標取得
    if (element.properties.hasCoordinates && element.properties.x !== undefined && element.properties.y !== undefined) {
      coordinates.push({x: element.properties.x, y: element.properties.y});
    }
    
    // polyline_featureから座標取得
    if (element.properties.hasPolylineData && element.properties.polylinePoints) {
      coordinates.push(...element.properties.polylinePoints);
    }
    
    // 座標範囲を更新
    coordinates.forEach(coord => {
      if (!isNaN(coord.x) && !isNaN(coord.y)) {
        this.data.statistics.coordinateRange.minX = Math.min(this.data.statistics.coordinateRange.minX, coord.x);
        this.data.statistics.coordinateRange.maxX = Math.max(this.data.statistics.coordinateRange.maxX, coord.x);
        this.data.statistics.coordinateRange.minY = Math.min(this.data.statistics.coordinateRange.minY, coord.y);
        this.data.statistics.coordinateRange.maxY = Math.max(this.data.statistics.coordinateRange.maxY, coord.y);
      }
    });
  }

  /**
   * 大きなファイルを段階的に読み込む（実装例）
   */
  async parseProgressively(fileContent: string, progressCallback?: (progress: number) => void): Promise<SXFData> {
    const lines = fileContent.split('\n');
    const totalLines = lines.length;
    const batchSize = 1000; // 1000行ずつ処理
    
    console.log(`段階的SXF解析開始: ${totalLines}行を${batchSize}行ずつ処理`);
    
    for (let start = 0; start < totalLines; start += batchSize) {
      const end = Math.min(start + batchSize, totalLines);
      const batch = lines.slice(start, end);
      
      // バッチ処理
      for (const line of batch) {
        if (line.startsWith('#') && line.includes('=')) {
          const element = this.parseDataLine(line.trim());
          if (element) {
            this.data.elements.push(element);
            this.updateStatistics(element);
            
            // 用紙サイズ情報の保存
            if (element.properties.paperSize && !this.data.paperSize) {
              this.data.paperSize = element.properties.paperSize;
            }
          }
        }
      }
      
      // プログレス通知
      const progress = (end / totalLines) * 100;
      if (progressCallback) {
        progressCallback(progress);
      }
      
      // UIをブロックしないよう少し待機
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // メモリ使用量制限（テスト用）
      if (this.data.elements.length > 5000) {
        console.log('メモリ制限により解析を停止:', this.data.elements.length, '要素');
        break;
      }
    }
    
    console.log(`段階的SXF解析完了: ${this.data.elements.length}要素を処理`);
    
    // レベル番号を再整理
    this.reassignLevelNumbers();
    
    return this.data;
  }

  /**
   * レベル番号を仕様に従って再整理
   * 読込順に1,2...とし、$$ATRU$$（用紙レベル）を0番にする
   */
  private reassignLevelNumbers(): void {
    if (this.data.levels.length === 0) return;
    
    console.log('=== レベル番号再整理開始 ===');
    
    // $$ATRU$$レベル（用紙レベル）を見つける
    let paperLevelIndex = -1;
    for (let i = 0; i < this.data.levels.length; i++) {
      if (this.data.levels[i].name === '用紙レベル') {
        paperLevelIndex = i;
        break;
      }
    }
    
    // レベル番号を再割り当て
    let workingLevelNumber = 1; // 作業レベルは1から開始
    
    for (let i = 0; i < this.data.levels.length; i++) {
      if (i === paperLevelIndex) {
        // 用紙レベルは0番
        this.data.levels[i].levelNumber = 0;
        this.data.levels[i].id = 'level_0';
        console.log(`レベル[${i}] -> レベル0: ${this.data.levels[i].name} (用紙レベル)`);
      } else {
        // その他のレベルは読込順に1,2,3...
        this.data.levels[i].levelNumber = workingLevelNumber;
        this.data.levels[i].id = `level_${workingLevelNumber}`;
        console.log(`レベル[${i}] -> レベル${workingLevelNumber}: ${this.data.levels[i].name}`);
        workingLevelNumber++;
      }
    }
    
    // レベル番号順にソート
    this.data.levels.sort((a, b) => a.levelNumber - b.levelNumber);
    
    console.log('=== レベル番号再整理完了 ===');
    console.log('最終レベル順序:');
    this.data.levels.forEach(level => {
      console.log(`  レベル${level.levelNumber}: ${level.name}`);
    });
  }

  /**
   * 解析結果のサマリーを取得
   */
  getSummary(): string {
    const stats = this.data.statistics;
    const elementTypeSummary = Object.entries(stats.elementTypes)
      .map(([type, count]) => `${type}: ${count}個`)
      .join(', ');
      
    return `
総要素数: ${stats.totalElements}
要素種別: ${elementTypeSummary}
座標範囲: X(${stats.coordinateRange.minX.toFixed(2)} ~ ${stats.coordinateRange.maxX.toFixed(2)}), Y(${stats.coordinateRange.minY.toFixed(2)} ~ ${stats.coordinateRange.maxY.toFixed(2)})
    `.trim();
  }
}

/**
 * ファイル読み込みのユーティリティ
 */
export async function loadSXFFile(filePath: string): Promise<string> {
  // ブラウザ環境では実際のファイル読み込みはFile APIを使用
  // ここではモックデータを返す
  console.log('SXFファイル読み込み:', filePath);
  return 'SXF file content would be loaded here';
}

/**
 * SXFファイルをShift-JISエンコーディングで読み込む
 */
export async function readSXFFileWithEncoding(file: File): Promise<string> {
  try {
    console.log('SXFファイルをShift-JISで読み込み開始:', file.name);
    
    // ArrayBufferとして読み込み
    const buffer = await file.arrayBuffer();
    
    // Shift-JISデコーダーを使用
    let decoder;
    const encodings = ['shift_jis', 'shift-jis', 'windows-31j', 'cp932', 'sjis'];
    
    for (const encoding of encodings) {
      try {
        decoder = new TextDecoder(encoding);
        console.log(`Shift-JISデコーダー取得成功: ${encoding}`);
        break;
      } catch (error) {
        console.log(`${encoding} は利用できません`);
        continue;
      }
    }
    
    if (!decoder) {
      console.warn('Shift-JISデコーダーが利用できません。UTF-8で読み込みます。');
      // フォールバック: UTF-8で読み込み
      const textContent = await file.text();
      return textContent;
    }
    
    // Shift-JISでデコード
    const textContent = decoder.decode(buffer);
    
    console.log('Shift-JISデコード完了');
    console.log('最初の500文字:', textContent.substring(0, 500));
    
    // sfig_locate_feature部分を確認
    const sfigMatches = textContent.match(/sfig_locate_feature[^)]*\)/g);
    if (sfigMatches) {
      console.log('=== Shift-JISデコード後のsfig_locate_feature ===');
      sfigMatches.forEach((match, index) => {
        console.log(`${index}: ${match}`);
      });
    }
    
    return textContent;
  } catch (error) {
    console.error('Shift-JISファイル読み込みエラー:', error);
    console.log('フォールバック: UTF-8で読み込みを試行');
    
    // フォールバック: 標準読み込み
    try {
      const textContent = await file.text();
      return textContent;
    } catch (fallbackError) {
      console.error('UTF-8フォールバックも失敗:', fallbackError);
      throw fallbackError;
    }
  }
}