/**
 * SXF座標変換のテスト
 */

import { 
  transformSXFToDrawing, 
  createTransformParamsFromLevel,
  validateTransformParams,
  formatTransformParams,
  type SXFTransformParams,
  type SXFPoint 
} from './sxfCoordinateTransform';

/**
 * テスト実行関数
 */
export function runSXFCoordinateTransformTests(): void {
  console.log('=== SXF座標変換テスト開始 ===');
  
  // テスト1: 基本的な変換（平行移動のみ）
  testBasicTranslation();
  
  // テスト2: スケール変換
  testScaleTransformation();
  
  // テスト3: 回転変換
  testRotationTransformation();
  
  // テスト4: 複合変換（平行移動 + スケール + 回転）
  testComplexTransformation();
  
  // テスト5: パラメータ検証
  testParameterValidation();
  
  console.log('=== SXF座標変換テスト完了 ===');
}

function testBasicTranslation(): void {
  console.log('\n--- テスト1: 基本的な変換（平行移動のみ） ---');
  
  const params: SXFTransformParams = {
    x0: 100,   // 原点X
    y0: 200,   // 原点Y
    a: 0,      // 回転なし
    xs: 1,     // Xスケール
    ys: 1      // Yスケール
  };
  
  const sxfPoint: SXFPoint = { x: 10, y: 20 };
  const result = transformSXFToDrawing(sxfPoint, params);
  
  // 期待値: x = 100 + 1*10*cos(0) - 1*20*sin(0) = 100 + 10 = 110
  //        y = 200 + 1*10*sin(0) + 1*20*cos(0) = 200 + 20 = 220
  const expected = { x: 110, y: 220 };
  
  console.log(`入力: (${sxfPoint.x}, ${sxfPoint.y})`);
  console.log(`パラメータ: ${formatTransformParams(params)}`);
  console.log(`結果: (${result.x}, ${result.y})`);
  console.log(`期待値: (${expected.x}, ${expected.y})`);
  console.log(`テスト結果: ${Math.abs(result.x - expected.x) < 0.001 && Math.abs(result.y - expected.y) < 0.001 ? 'PASS' : 'FAIL'}`);
}

function testScaleTransformation(): void {
  console.log('\n--- テスト2: スケール変換 ---');
  
  const params: SXFTransformParams = {
    x0: 0,     // 原点
    y0: 0,     // 原点
    a: 0,      // 回転なし
    xs: 2,     // X方向2倍
    ys: 3      // Y方向3倍
  };
  
  const sxfPoint: SXFPoint = { x: 10, y: 20 };
  const result = transformSXFToDrawing(sxfPoint, params);
  
  // 期待値: x = 0 + 2*10*cos(0) - 3*20*sin(0) = 20
  //        y = 0 + 2*10*sin(0) + 3*20*cos(0) = 60
  const expected = { x: 20, y: 60 };
  
  console.log(`入力: (${sxfPoint.x}, ${sxfPoint.y})`);
  console.log(`パラメータ: ${formatTransformParams(params)}`);
  console.log(`結果: (${result.x}, ${result.y})`);
  console.log(`期待値: (${expected.x}, ${expected.y})`);
  console.log(`テスト結果: ${Math.abs(result.x - expected.x) < 0.001 && Math.abs(result.y - expected.y) < 0.001 ? 'PASS' : 'FAIL'}`);
}

function testRotationTransformation(): void {
  console.log('\n--- テスト3: 回転変換 ---');
  
  const params: SXFTransformParams = {
    x0: 0,     // 原点
    y0: 0,     // 原点
    a: 90,     // 90度回転
    xs: 1,     // スケールなし
    ys: 1      // スケールなし
  };
  
  const sxfPoint: SXFPoint = { x: 10, y: 0 };
  const result = transformSXFToDrawing(sxfPoint, params);
  
  // 期待値: 90度回転なので (10, 0) -> (0, 10)
  // x = 0 + 1*10*cos(90°) - 1*0*sin(90°) = 0 + 0 - 0 = 0
  // y = 0 + 1*10*sin(90°) + 1*0*cos(90°) = 0 + 10 + 0 = 10
  const expected = { x: 0, y: 10 };
  
  console.log(`入力: (${sxfPoint.x}, ${sxfPoint.y})`);
  console.log(`パラメータ: ${formatTransformParams(params)}`);
  console.log(`結果: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`期待値: (${expected.x}, ${expected.y})`);
  console.log(`テスト結果: ${Math.abs(result.x - expected.x) < 0.001 && Math.abs(result.y - expected.y) < 0.001 ? 'PASS' : 'FAIL'}`);
}

function testComplexTransformation(): void {
  console.log('\n--- テスト4: 複合変換（平行移動 + スケール + 回転） ---');
  
  const params: SXFTransformParams = {
    x0: 100,   // 原点X
    y0: 200,   // 原点Y
    a: 45,     // 45度回転
    xs: 2,     // X方向2倍
    ys: 1.5    // Y方向1.5倍
  };
  
  const sxfPoint: SXFPoint = { x: 10, y: 10 };
  const result = transformSXFToDrawing(sxfPoint, params);
  
  // 複雑な計算になるので、主に変換が実行されることを確認
  console.log(`入力: (${sxfPoint.x}, ${sxfPoint.y})`);
  console.log(`パラメータ: ${formatTransformParams(params)}`);
  console.log(`結果: (${result.x.toFixed(3)}, ${result.y.toFixed(3)})`);
  console.log(`テスト結果: ${!isNaN(result.x) && !isNaN(result.y) ? 'PASS (値が有効)' : 'FAIL'}`);
}

function testParameterValidation(): void {
  console.log('\n--- テスト5: パラメータ検証 ---');
  
  // 有効なパラメータ
  const validParams: SXFTransformParams = {
    x0: 100, y0: 200, a: 45, xs: 1, ys: 1
  };
  console.log(`有効なパラメータ: ${validateTransformParams(validParams) ? 'PASS' : 'FAIL'}`);
  
  // 無効なパラメータ（スケールがゼロ）
  const invalidParams1: SXFTransformParams = {
    x0: 100, y0: 200, a: 45, xs: 0, ys: 1
  };
  console.log(`無効なパラメータ(xs=0): ${!validateTransformParams(invalidParams1) ? 'PASS' : 'FAIL'}`);
  
  // 無効なパラメータ（NaN）
  const invalidParams2: SXFTransformParams = {
    x0: NaN, y0: 200, a: 45, xs: 1, ys: 1
  };
  console.log(`無効なパラメータ(NaN): ${!validateTransformParams(invalidParams2) ? 'PASS' : 'FAIL'}`);
}

/**
 * SXFLevelからの変換パラメータ作成をテスト
 */
export function testLevelToParamsConversion(): void {
  console.log('\n--- SXFLevel -> 変換パラメータテスト ---');
  
  const level = {
    originX: 1000,
    originY: 2000,
    rotation: 30,
    scaleX: 1.5,
    scaleY: 2.0
  };
  
  const params = createTransformParamsFromLevel(level);
  
  console.log(`レベル: 原点(${level.originX}, ${level.originY}), 回転${level.rotation}°, スケール(${level.scaleX}, ${level.scaleY})`);
  console.log(`変換パラメータ: ${formatTransformParams(params)}`);
  console.log(`変換テスト: ${params.x0 === level.originX && params.y0 === level.originY && params.a === level.rotation && params.xs === level.scaleX && params.ys === level.scaleY ? 'PASS' : 'FAIL'}`);
}

// ブラウザのコンソールで実行する場合
if (typeof window !== 'undefined') {
  (window as any).runSXFCoordinateTransformTests = runSXFCoordinateTransformTests;
  (window as any).testLevelToParamsConversion = testLevelToParamsConversion;
}