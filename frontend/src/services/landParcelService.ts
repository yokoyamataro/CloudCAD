// 土地区画（地番）管理API サービス

const API_BASE_URL = 'http://localhost:3001/api';

export interface LandParcel {
  id: string;
  parcelNumber: string;
  address?: string;
  area?: number;
  landUse?: string;
  owner?: string;
  geometry?: string; // WKT形式のPolygon
  coordinatePoints?: string; // 構成座標点のIDリスト（JSON配列）
  registrationDate?: string;
  remarks?: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
  };
}

export interface CreateLandParcelData {
  parcelNumber: string;
  address?: string;
  area?: number;
  landUse?: string;
  owner?: string;
  geometry?: string;
  registrationDate?: string;
  remarks?: string;
  projectId: string;
}

export interface UpdateLandParcelData {
  parcelNumber?: string;
  address?: string;
  area?: number;
  landUse?: string;
  owner?: string;
  geometry?: string;
  registrationDate?: string;
  remarks?: string;
}

class LandParcelService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  // プロジェクトの土地区画一覧取得
  async getLandParcelsByProject(projectId: string): Promise<LandParcel[]> {
    return this.request<LandParcel[]>(`/land-parcels/project/${projectId}`);
  }

  // 土地区画の個別取得
  async getLandParcel(id: string): Promise<LandParcel> {
    return this.request<LandParcel>(`/land-parcels/${id}`);
  }

  // 土地区画の作成
  async createLandParcel(data: CreateLandParcelData): Promise<LandParcel> {
    return this.request<LandParcel>('/land-parcels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 土地区画の更新
  async updateLandParcel(id: string, data: UpdateLandParcelData): Promise<LandParcel> {
    return this.request<LandParcel>(`/land-parcels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 土地区画の削除
  async deleteLandParcel(id: string): Promise<void> {
    await this.request(`/land-parcels/${id}`, {
      method: 'DELETE',
    });
  }

  // 土地区画の一括作成（CSVインポート用）
  async bulkCreateLandParcels(
    projectId: string, 
    landParcels: Omit<CreateLandParcelData, 'projectId'>[]
  ): Promise<{ message: string; createdCount: number; requestedCount: number }> {
    return this.request('/land-parcels/bulk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        landParcels,
      }),
    });
  }

  // 面積計算（ジオメトリベース）
  async calculateArea(id: string): Promise<{ id: string; calculatedArea: number; parcel: LandParcel }> {
    return this.request(`/land-parcels/${id}/calculate-area`, {
      method: 'POST',
    });
  }

  // 地目の選択肢
  static getLandUseOptions(): { value: string; label: string }[] {
    return [
      { value: '宅地', label: '宅地' },
      { value: '田', label: '田' },
      { value: '畑', label: '畑' },
      { value: '山林', label: '山林' },
      { value: '原野', label: '原野' },
      { value: '牧場', label: '牧場' },
      { value: '池沼', label: '池沼' },
      { value: '鉱泉地', label: '鉱泉地' },
      { value: '塩田', label: '塩田' },
      { value: '雑種地', label: '雑種地' },
      { value: '墓地', label: '墓地' },
      { value: '境内地', label: '境内地' },
      { value: '運河用地', label: '運河用地' },
      { value: '水道用地', label: '水道用地' },
      { value: '用悪水路', label: '用悪水路' },
      { value: 'ため池', label: 'ため池' },
      { value: '堤', label: '堤' },
      { value: '井溝', label: '井溝' },
      { value: '保安林', label: '保安林' },
      { value: '公衆用道路', label: '公衆用道路' },
      { value: '公園', label: '公園' },
    ];
  }

  // 地目の色分け
  static getLandUseColor(landUse?: string): string {
    const colors: Record<string, string> = {
      '宅地': '#3b82f6', // blue
      '田': '#10b981', // green
      '畑': '#f59e0b', // yellow
      '山林': '#059669', // emerald
      '原野': '#84cc16', // lime
      '牧場': '#65a30d', // green
      '池沼': '#0891b2', // cyan
      '雑種地': '#6b7280', // gray
      '墓地': '#374151', // gray-dark
      '境内地': '#7c3aed', // purple
      '公衆用道路': '#ef4444', // red
      '公園': '#22c55e', // green-light
    };
    return colors[landUse || ''] || '#6b7280';
  }

  // 座標配列からPolygon WKTを生成
  static coordinatesToPolygonWKT(coordinates: { x: number; y: number }[]): string {
    if (coordinates.length < 3) {
      throw new Error('Polygon requires at least 3 coordinates');
    }

    // 最初の点と最後の点が同じでなければ閉じる
    const coords = [...coordinates];
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      coords.push(first);
    }

    const coordString = coords.map(c => `${c.x} ${c.y}`).join(', ');
    return `POLYGON((${coordString}))`;
  }

  // Polygon WKTから座標配列を取得
  static polygonWKTToCoordinates(wkt: string): { x: number; y: number }[] {
    const match = wkt.match(/POLYGON\s*\(\s*\(\s*([^)]+)\s*\)\s*\)/i);
    if (!match) {
      throw new Error('Invalid Polygon WKT format');
    }

    const coordString = match[1];
    return coordString.split(',').map(pair => {
      const [x, y] = pair.trim().split(/\s+/).map(parseFloat);
      return { x, y };
    });
  }

  // 面積の単位変換ヘルパー
  static formatArea(area: number, unit: 'm²' | 'ha' | 'a' = 'm²'): string {
    switch (unit) {
      case 'ha':
        return `${(area / 10000).toFixed(4)} ha`;
      case 'a':
        return `${(area / 100).toFixed(2)} a`;
      default:
        return `${area.toFixed(2)} m²`;
    }
  }

  // 地番の並び順比較関数
  static compareParcelNumbers(a: string, b: string): number {
    // 数字部分を抽出して比較
    const extractNumber = (str: string): number => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const numA = extractNumber(a);
    const numB = extractNumber(b);
    
    if (numA !== numB) {
      return numA - numB;
    }
    
    // 数字が同じ場合は文字列として比較
    return a.localeCompare(b, 'ja');
  }

  // 構成座標点ID配列 ⇔ JSON文字列変換
  static coordinatePointsToJson(coordinateIds: string[]): string {
    return JSON.stringify(coordinateIds);
  }

  static coordinatePointsFromJson(jsonString?: string): string[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // 座標点配列からWKT Polygonを生成（座標データ必要）
  static coordinatePointsToPolygonWKT(
    coordinatePoints: { x: number; y: number }[]
  ): string {
    if (coordinatePoints.length < 3) {
      throw new Error('Polygon requires at least 3 coordinate points');
    }

    // 最初の点と最後の点が同じでなければ閉じる
    const coords = [...coordinatePoints];
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      coords.push(first);
    }

    const coordString = coords.map(c => `${c.x} ${c.y}`).join(', ');
    return `POLYGON((${coordString}))`;
  }

  // WKT PolygonからIDでソートされた座標点IDリストを生成
  static polygonWKTToCoordinateIds(
    wkt: string,
    availableCoordinates: { id: string; x: number; y: number }[]
  ): string[] {
    const coordinates = this.polygonWKTToCoordinates(wkt);
    const coordinateIds: string[] = [];

    coordinates.forEach(coord => {
      // 最も近い座標点を見つける（許容誤差内）
      const tolerance = 0.01; // 1cm以内
      const nearestPoint = availableCoordinates.find(available => {
        const distance = Math.sqrt(
          Math.pow(available.x - coord.x, 2) + Math.pow(available.y - coord.y, 2)
        );
        return distance <= tolerance;
      });

      if (nearestPoint) {
        coordinateIds.push(nearestPoint.id);
      }
    });

    return coordinateIds;
  }

  // 座標点IDリストと座標データからWKT Polygonを生成
  static coordinateIdsToPolygonWKT(
    coordinateIds: string[],
    availableCoordinates: { id: string; x: number; y: number }[]
  ): string {
    const coordinates = coordinateIds
      .map(id => availableCoordinates.find(coord => coord.id === id))
      .filter((coord): coord is { id: string; x: number; y: number } => coord !== undefined)
      .map(coord => ({ x: coord.x, y: coord.y }));

    if (coordinates.length < 3) {
      throw new Error('Need at least 3 valid coordinate points to form a polygon');
    }

    return this.coordinatePointsToPolygonWKT(coordinates);
  }
}

export const landParcelService = new LandParcelService();