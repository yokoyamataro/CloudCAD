// 測量点管理API サービス

const API_BASE_URL = 'http://localhost:3001/api';

export interface SurveyPoint {
  id: string;
  pointNumber: string;
  pointType: string;
  coordinates: string; // WKT形式
  elevation?: number;
  accuracy?: string;
  measureMethod?: string;
  measureDate?: string;
  surveyorName?: string;
  remarks?: string;
  projectId: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateSurveyPointData {
  pointNumber: string;
  pointType: string;
  coordinates: string;
  elevation?: number;
  accuracy?: string;
  measureMethod?: string;
  measureDate?: string;
  surveyorName?: string;
  remarks?: string;
  projectId: string;
}

export interface UpdateSurveyPointData {
  pointNumber?: string;
  pointType?: string;
  coordinates?: string;
  elevation?: number;
  accuracy?: string;
  measureMethod?: string;
  measureDate?: string;
  surveyorName?: string;
  remarks?: string;
}

class SurveyPointService {
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

  // プロジェクトの測量点一覧取得
  async getSurveyPointsByProject(projectId: string): Promise<SurveyPoint[]> {
    return this.request<SurveyPoint[]>(`/survey-points/project/${projectId}`);
  }

  // 測量点の個別取得
  async getSurveyPoint(id: string): Promise<SurveyPoint> {
    return this.request<SurveyPoint>(`/survey-points/${id}`);
  }

  // 測量点の作成
  async createSurveyPoint(data: CreateSurveyPointData): Promise<SurveyPoint> {
    return this.request<SurveyPoint>('/survey-points', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 測量点の更新
  async updateSurveyPoint(id: string, data: UpdateSurveyPointData): Promise<SurveyPoint> {
    return this.request<SurveyPoint>(`/survey-points/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 測量点の削除
  async deleteSurveyPoint(id: string): Promise<void> {
    await this.request(`/survey-points/${id}`, {
      method: 'DELETE',
    });
  }

  // 測量点の一括作成（CSVインポート用）
  async bulkCreateSurveyPoints(
    projectId: string, 
    surveyPoints: Omit<CreateSurveyPointData, 'projectId'>[]
  ): Promise<{ message: string; createdCount: number; requestedCount: number }> {
    return this.request('/survey-points/bulk', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        surveyPoints,
      }),
    });
  }

  // 座標形式変換ヘルパー
  static coordinatesToWKT(x: number, y: number, z?: number): string {
    if (z !== undefined) {
      return `POINT Z(${x} ${y} ${z})`;
    }
    return `POINT(${x} ${y})`;
  }

  static wktToCoordinates(wkt: string): { x: number; y: number; z?: number } {
    // POINT(x y) または POINT Z(x y z) の形式をパース
    const match = wkt.match(/POINT\s*(?:Z)?\s*\(\s*([0-9.-]+)\s+([0-9.-]+)(?:\s+([0-9.-]+))?\s*\)/i);
    if (!match) {
      throw new Error('Invalid WKT format');
    }

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const z = match[3] ? parseFloat(match[3]) : undefined;

    return { x, y, z };
  }

  // 測量点タイプの日本語ラベル
  static getPointTypeLabel(pointType: string): string {
    const labels: Record<string, string> = {
      'benchmark': '基準点',
      'control_point': '制御点',
      'boundary_point': '境界点',
      'triangulation': '三角点',
      'traverse': 'トラバース点',
      'level_benchmark': '水準点',
      'gps_point': 'GPS点',
    };
    return labels[pointType] || pointType;
  }

  // 精度等級の選択肢
  static getAccuracyOptions(): { value: string; label: string }[] {
    return [
      { value: '±0.01m', label: '±1cm' },
      { value: '±0.02m', label: '±2cm' },
      { value: '±0.05m', label: '±5cm' },
      { value: '±0.10m', label: '±10cm' },
      { value: '±0.20m', label: '±20cm' },
      { value: '±0.50m', label: '±50cm' },
    ];
  }

  // 測量手法の選択肢
  static getMeasureMethodOptions(): { value: string; label: string }[] {
    return [
      { value: 'gps', label: 'GPS測量' },
      { value: 'total_station', label: 'トータルステーション' },
      { value: 'level', label: 'レベル測量' },
      { value: 'triangulation', label: '三角測量' },
      { value: 'traverse', label: 'トラバース測量' },
      { value: 'photogrammetry', label: '写真測量' },
      { value: 'laser_scan', label: 'レーザー測量' },
    ];
  }
}

export const surveyPointService = new SurveyPointService();