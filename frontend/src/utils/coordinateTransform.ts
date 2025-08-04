import proj4 from 'proj4';

// 日本の平面直角座標系の定義
// 系番号1～19に対応（東京都周辺は系番号9）
const PLANE_COORDINATE_SYSTEMS = {
  1: '+proj=tmerc +lat_0=33 +lon_0=129.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  2: '+proj=tmerc +lat_0=33 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  3: '+proj=tmerc +lat_0=36 +lon_0=132.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  4: '+proj=tmerc +lat_0=33 +lon_0=133.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  5: '+proj=tmerc +lat_0=36 +lon_0=134.3333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  6: '+proj=tmerc +lat_0=36 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  7: '+proj=tmerc +lat_0=36 +lon_0=137.1666666666667 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  8: '+proj=tmerc +lat_0=36 +lon_0=138.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  9: '+proj=tmerc +lat_0=36 +lon_0=139.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', // 東京都周辺
  10: '+proj=tmerc +lat_0=40 +lon_0=140.8333333333333 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  11: '+proj=tmerc +lat_0=44 +lon_0=140.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  12: '+proj=tmerc +lat_0=44 +lon_0=142.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  13: '+proj=tmerc +lat_0=44 +lon_0=144.25 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  14: '+proj=tmerc +lat_0=26 +lon_0=142 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  15: '+proj=tmerc +lat_0=26 +lon_0=127.5 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  16: '+proj=tmerc +lat_0=26 +lon_0=124 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  17: '+proj=tmerc +lat_0=26 +lon_0=131 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  18: '+proj=tmerc +lat_0=20 +lon_0=136 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  19: '+proj=tmerc +lat_0=26 +lon_0=154 +k=0.9999 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
};

// WGS84緯度経度座標系
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

export interface CoordinatePoint {
  x: number;  // 測量座標系X（北方向）
  y: number;  // 測量座標系Y（東方向）
}

export interface LatLng {
  lat: number;  // 緯度
  lng: number;  // 経度
}

/**
 * 平面直角座標系から緯度経度に変換
 * @param point 測量座標点 {x: 北方向, y: 東方向}
 * @param zoneNumber 平面直角座標系の系番号 (1-19)
 * @returns 緯度経度座標 {lat: 緯度, lng: 経度}
 */
export function transformToLatLng(point: CoordinatePoint, zoneNumber: number = 13): LatLng {
  console.log(`transformToLatLng called with: x=${point.x}, y=${point.y}, zone=${zoneNumber}`);
  
  const planeCoordDef = PLANE_COORDINATE_SYSTEMS[zoneNumber as keyof typeof PLANE_COORDINATE_SYSTEMS];
  
  if (!planeCoordDef) {
    throw new Error(`Invalid zone number: ${zoneNumber}. Must be between 1 and 19.`);
  }

  try {
    // proj4での座標変換（平面直角座標系 → WGS84）
    const [lng, lat] = proj4(planeCoordDef, WGS84, [point.y, point.x]);
    console.log(`Transformation result: x=${point.x}, y=${point.y} -> lat=${lat}, lng=${lng}`);
    
    // 妥当性チェック
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      console.warn('Invalid transformation result, using fallback');
      return { lat: 43.0642, lng: 144.2737 };
    }
    
    return { lat, lng };
  } catch (error) {
    console.error('Coordinate transformation error:', error);
    // フォールバック: 北海道東部（釧路市周辺）の座標を返す
    return { lat: 43.0642, lng: 144.2737 };
  }
}

/**
 * 緯度経度から平面直角座標系に変換
 * @param latLng 緯度経度座標
 * @param zoneNumber 平面直角座標系の系番号 (1-19)
 * @returns 測量座標点
 */
export function transformFromLatLng(latLng: LatLng, zoneNumber: number = 13): CoordinatePoint {
  const planeCoordDef = PLANE_COORDINATE_SYSTEMS[zoneNumber as keyof typeof PLANE_COORDINATE_SYSTEMS];
  
  if (!planeCoordDef) {
    throw new Error(`Invalid zone number: ${zoneNumber}. Must be between 1 and 19.`);
  }

  try {
    // proj4での座標変換（WGS84 → 平面直角座標系）
    const [y, x] = proj4(WGS84, planeCoordDef, [latLng.lng, latLng.lat]);
    
    return { x, y };
  } catch (error) {
    console.error('Coordinate transformation error:', error);
    // フォールバック座標を返す
    return { x: 0, y: 0 };
  }
}

/**
 * 座標配列の範囲から適切な地図の中心点とズームレベルを計算
 * @param coordinates 座標点の配列
 * @param zoneNumber 平面直角座標系の系番号
 * @returns 地図の中心点とズームレベル
 */
export function calculateMapBounds(coordinates: CoordinatePoint[], zoneNumber: number = 13) {
  if (coordinates.length === 0) {
    // デフォルト: 北海道東部（釧路市周辺）
    return {
      center: { lat: 43.0642, lng: 144.2737 } as LatLng,
      zoom: 15
    };
  }

  // 全ての座標を緯度経度に変換
  const latLngs = coordinates.map(coord => transformToLatLng(coord, zoneNumber));
  
  // 境界を計算
  const lats = latLngs.map(ll => ll.lat);
  const lngs = latLngs.map(ll => ll.lng);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  
  // 中心点を計算
  const center: LatLng = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2
  };
  
  // 範囲に基づいてズームレベルを推定
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const maxRange = Math.max(latRange, lngRange);
  
  let zoom = 15; // デフォルト
  if (maxRange > 0.1) zoom = 10;      // 広範囲
  else if (maxRange > 0.01) zoom = 13; // 中範囲
  else if (maxRange > 0.001) zoom = 16; // 狭範囲
  else zoom = 18; // 非常に狭い範囲
  
  return { center, zoom };
}

/**
 * 地域に基づいて適切な平面直角座標系の系番号を推定
 * @param lat 緯度
 * @param lng 経度
 * @returns 推定される系番号
 */
export function estimateZoneNumber(lat: number, lng: number): number {
  // 簡易的な系番号推定（主要地域）
  if (lng < 130) return 1;   // 長崎・佐賀周辺
  if (lng < 131.5) return 2; // 福岡・大分周辺
  if (lng < 133) return 3;   // 山口・島根周辺
  if (lng < 134.5) return 4; // 広島・岡山周辺
  if (lng < 136.5) return 5; // 兵庫・京都周辺
  if (lng < 138) return 6;   // 大阪・奈良周辺
  if (lng < 139) return 7;   // 石川・福井周辺
  if (lng < 140) return 8;   // 新潟・長野周辺
  if (lng < 141) return 9;   // 東京・神奈川周辺
  if (lng < 142) return 10;  // 福島・栃木周辺
  if (lng < 143) return 11;  // 秋田・岩手周辺
  if (lng < 144) return 12;  // 北海道南部
  return 13; // 北海道北部・その他
}