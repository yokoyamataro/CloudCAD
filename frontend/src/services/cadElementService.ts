// CADEditor で実際に使用されている CADElement の構造を定義
interface CADPoint {
  x: number;
  y: number;
}

interface CADElement {
  id: string;
  type: string;
  layerId?: string;
  points?: CADPoint[];
  position?: CADPoint;
  startPosition?: CADPoint;
  endPosition?: CADPoint;
  width?: number;
  height?: number;
  radius?: number;
  properties?: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    text?: string;
    fontSize?: number;
    [key: string]: any;
  };
  style?: {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
    [key: string]: any;
  };
  sxfAttributes?: {
    layerName?: string;
    lineType?: string;
    lineWidth?: number;
    color?: string;
    [key: string]: any;
  };
  visible?: boolean;
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ElementApiResponse extends CADElement {
  id: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  layer?: {
    id: string;
    name: string;
    color: string;
  };
}

interface BatchUpdateRequest {
  elements: Array<{
    id: string;
    geometry: string;
    properties?: any;
    style?: any;
  }>;
  projectId: string;
}

class CADElementService {
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // 図面の全要素を取得
  async getElementsForDrawing(drawingId: string): Promise<ElementApiResponse[]> {
    return this.request(`/elements/drawing/${drawingId}`);
  }

  // 要素を作成
  async createElement(element: {
    type: string;
    geometry: string;
    properties?: any;
    style?: any;
    layerId?: string;
    drawingId: string;
    projectId: string;
  }): Promise<ElementApiResponse> {
    return this.request('/elements', {
      method: 'POST',
      body: JSON.stringify(element),
    });
  }

  // 要素を更新
  async updateElement(
    id: string,
    updates: {
      type?: string;
      geometry?: string;
      properties?: any;
      style?: any;
      layerId?: string;
      visible?: boolean;
      locked?: boolean;
      projectId?: string;
    }
  ): Promise<ElementApiResponse> {
    return this.request(`/elements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // 要素を削除
  async deleteElement(id: string, projectId: string): Promise<void> {
    return this.request(`/elements/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ projectId }),
    });
  }

  // 複数要素を一括更新（座標変更用）
  async batchUpdateElements(request: BatchUpdateRequest): Promise<ElementApiResponse[]> {
    return this.request('/elements/batch', {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
  }

  // リアルタイム座標更新（一時的、DB保存なし）
  async broadcastCoordinateUpdate(
    elementId: string,
    coordinates: { x: number; y: number },
    projectId: string
  ): Promise<void> {
    return this.request('/elements/coordinate-update', {
      method: 'POST',
      body: JSON.stringify({
        elementId,
        coordinates,
        projectId,
      }),
    });
  }

  // CADElementをAPIResponseに変換
  convertToApiElement(element: CADElement, drawingId: string, projectId: string) {
    return {
      type: element.type,
      geometry: this.convertGeometryToWKT(element),
      properties: element.properties,
      style: element.style,
      layerId: element.layerId,
      drawingId,
      projectId,
    };
  }

  // CADElementの座標をWKT形式に変換
  convertGeometryToWKT(element: CADElement): string {
    // points配列がある場合（線分、ポリゴンなど）
    if (element.points && element.points.length > 0) {
      if (element.points.length === 1) {
        // 1点の場合はPOINT
        const p = element.points[0];
        return `POINT(${p.x} ${p.y})`;
      } else if (element.points.length === 2 || element.type === 'line') {
        // 2点または線分の場合はLINESTRING
        const pointsStr = element.points.map(p => `${p.x} ${p.y}`).join(', ');
        return `LINESTRING(${pointsStr})`;
      } else {
        // 3点以上の場合はPOLYGON
        const pointsStr = element.points.map(p => `${p.x} ${p.y}`).join(', ');
        const firstPoint = element.points[0];
        return `POLYGON((${pointsStr}, ${firstPoint.x} ${firstPoint.y}))`;
      }
    }
    
    // position/startPosition/endPosition がある場合
    if (element.position) {
      if (element.type === 'circle') {
        // 円の場合、centerとradius情報も保存
        return `POINT(${element.position.x} ${element.position.y})`;
      } else if (element.type === 'rectangle' && element.width && element.height) {
        // 四角形の場合
        const x = element.position.x;
        const y = element.position.y;
        const w = element.width;
        const h = element.height;
        return `POLYGON((${x} ${y}, ${x + w} ${y}, ${x + w} ${y + h}, ${x} ${y + h}, ${x} ${y}))`;
      } else {
        // その他の場合は点
        return `POINT(${element.position.x} ${element.position.y})`;
      }
    }
    
    // startPosition/endPosition がある場合
    if (element.startPosition && element.endPosition) {
      const start = element.startPosition;
      const end = element.endPosition;
      return `LINESTRING(${start.x} ${start.y}, ${end.x} ${end.y})`;
    }
    
    // デフォルト（原点）
    return `POINT(0 0)`;
  }

  // WKT形式からCADElementの座標を復元
  convertFromWKT(wkt: string, elementType: string): Partial<CADElement> {
    const result: Partial<CADElement> = {};

    if (wkt.startsWith('POINT')) {
      const match = wkt.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [x, y] = match[1].split(' ').map(Number);
        if (elementType === 'point' || elementType === 'circle' || elementType === 'text') {
          result.position = { x, y };
        } else {
          // 点として保存されているが、元は線やポリゴンの可能性
          result.points = [{ x, y }];
        }
      }
    } else if (wkt.startsWith('LINESTRING')) {
      const match = wkt.match(/LINESTRING\(([^)]+)\)/);
      if (match) {
        const points = match[1].split(', ').map(pointStr => {
          const [x, y] = pointStr.split(' ').map(Number);
          return { x, y };
        });
        result.points = points;
        // 互換性のために startPosition/endPosition も設定
        if (points.length >= 2) {
          result.startPosition = points[0];
          result.endPosition = points[points.length - 1];
          result.position = points[0];
        }
      }
    } else if (wkt.startsWith('POLYGON')) {
      const match = wkt.match(/POLYGON\(\(([^)]+)\)\)/);
      if (match) {
        const points = match[1].split(', ').map(pointStr => {
          const [x, y] = pointStr.split(' ').map(Number);
          return { x, y };
        });
        
        if (elementType === 'rectangle' && points.length >= 4) {
          result.position = points[0];
          result.width = Math.abs(points[1].x - points[0].x);
          result.height = Math.abs(points[2].y - points[0].y);
        } else {
          // 最後の重複点を除いてpointsに設定
          result.points = points.slice(0, -1);
          result.position = points[0];
        }
      }
    }

    return result;
  }
}

// シングルトンインスタンス
export const cadElementService = new CADElementService();
export default cadElementService;