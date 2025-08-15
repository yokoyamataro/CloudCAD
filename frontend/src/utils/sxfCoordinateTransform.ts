/**
 * SXF座標から図面座標への変換ユーティリティ
 * SXFファイルのsfig_locate_futureパラメータを使用した座標変換
 */

export interface SXFTransformParams {
  x0: number;   // 図面座標原点X
  y0: number;   // 図面座標原点Y
  a: number;    // 回転角度（度）
  xs: number;   // X方向スケール
  ys: number;   // Y方向スケール
}

export interface SXFPoint {
  x: number;    // SXF座標X
  y: number;    // SXF座標Y
}

export interface DrawingPoint {
  x: number;    // 図面座標X
  y: number;    // 図面座標Y
}

/**
 * SXF座標を図面座標に変換
 * 変換式:
 * theta = a * π / 180   // 角度をラジアンに変換
 * x = x0 + (xs * X) * cos(theta) - (ys * Y) * sin(theta)
 * y = y0 + (xs * X) * sin(theta) + (ys * Y) * cos(theta)
 * 
 * @param sxfPoint SXF座標点 {x: X, y: Y}
 * @param params 変換パラメータ {x0, y0, a, xs, ys}
 * @returns 図面座標点 {x, y}
 */
export function transformSXFToDrawing(sxfPoint: SXFPoint, params: SXFTransformParams): DrawingPoint {
  const { x0, y0, a, xs, ys } = params;
  const { x: X, y: Y } = sxfPoint;
  
  // 角度をラジアンに変換
  const theta = a * Math.PI / 180;
  
  // 三角関数を計算
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  
  // 変換式を適用
  const x = x0 + (xs * X) * cosTheta - (ys * Y) * sinTheta;
  const y = y0 + (xs * X) * sinTheta + (ys * Y) * cosTheta;
  
  return { x, y };
}

/**
 * 複数のSXF座標点を一括変換
 * @param sxfPoints SXF座標点の配列
 * @param params 変換パラメータ
 * @returns 図面座標点の配列
 */
export function transformSXFPointsToDrawing(sxfPoints: SXFPoint[], params: SXFTransformParams): DrawingPoint[] {
  return sxfPoints.map(point => transformSXFToDrawing(point, params));
}

/**
 * SXFLevel情報から変換パラメータを作成
 * @param level SXFLevel情報
 * @returns 変換パラメータ
 */
export function createTransformParamsFromLevel(level: {
  originX: number;
  originY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}): SXFTransformParams {
  return {
    x0: level.originX,
    y0: level.originY,
    a: level.rotation,
    xs: level.scaleX,
    ys: level.scaleY
  };
}

/**
 * 図面座標をSXF座標に逆変換（必要に応じて）
 * @param drawingPoint 図面座標点
 * @param params 変換パラメータ
 * @returns SXF座標点
 */
export function transformDrawingToSXF(drawingPoint: DrawingPoint, params: SXFTransformParams): SXFPoint {
  const { x0, y0, a, xs, ys } = params;
  const { x, y } = drawingPoint;
  
  // 角度をラジアンに変換
  const theta = a * Math.PI / 180;
  
  // 三角関数を計算
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  
  // 平行移動を取り除く
  const dx = x - x0;
  const dy = y - y0;
  
  // 回転・スケールの逆変換
  const X = (dx * cosTheta + dy * sinTheta) / xs;
  const Y = (-dx * sinTheta + dy * cosTheta) / ys;
  
  return { x: X, y: Y };
}

/**
 * 変換パラメータの妥当性をチェック
 * @param params 変換パラメータ
 * @returns パラメータが有効かどうか
 */
export function validateTransformParams(params: SXFTransformParams): boolean {
  const { x0, y0, a, xs, ys } = params;
  
  // 基本的な数値チェック
  if (isNaN(x0) || isNaN(y0) || isNaN(a) || isNaN(xs) || isNaN(ys)) {
    return false;
  }
  
  // スケールがゼロでないことをチェック
  if (xs === 0 || ys === 0) {
    return false;
  }
  
  // 角度が妥当な範囲内かチェック（-360〜360度）
  if (Math.abs(a) > 360) {
    return false;
  }
  
  return true;
}

/**
 * デバッグ用：変換パラメータを文字列として出力
 * @param params 変換パラメータ
 * @returns パラメータの文字列表現
 */
export function formatTransformParams(params: SXFTransformParams): string {
  const { x0, y0, a, xs, ys } = params;
  return `原点(${x0.toFixed(3)}, ${y0.toFixed(3)}) 回転${a.toFixed(1)}° スケール(${xs.toFixed(3)}, ${ys.toFixed(3)})`;
}