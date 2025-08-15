/**
 * SXFパーサーのテスト
 */

import { SXFParser } from './sxfParser';

/**
 * LINE3.sfcの読み込みテスト
 */
export function testLINE3SXFParsing(): void {
  console.log('=== LINE3.sfc パーサーテスト開始 ===');
  
  // 実際のLINE3.sfcの内容（ShiftJISでデコード済みの状態をシミュレート）
  const line3Content = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('SCADEC level2 feature_mode'),
        '2;1');
FILE_NAME('LINE3.sfc',
        '2025-8-14T15:16:47',
        (''),
        (''),
        'SCADEC_API_Ver3.30$$3.0',
        'TREND-ONE Ver.7',
        '');
FILE_SCHEMA(('ASSOCIATIVE_DRAUGHTING'));
ENDSEC;
DATA;

/*SXF
#120 = sfig_org_feature('$$ATRU$$1$$背景色$$色$$255_255_255','3')
SXF*/

/*SXF
#130 = line_feature('2','3','2','2','25.713457','162.929926','114.765576','194.808505')
SXF*/

/*SXF
#140 = sfig_org_feature('もうひとつの用紙系','2')
SXF*/

/*SXF
#150 = line_feature('2','5','2','2','5000807.548646','5075654.291657','5062263.833894','5111234.953988')
SXF*/

/*SXF
#160 = line_feature('1','3','2','2','4989338.714578','5096042.389974','5040755.877773','5124049.056762')
SXF*/

/*SXF
#180 = sfig_org_feature('傾きあり','2')
SXF*/

/*SXF
#190 = line_feature('1','1','1','5','30030198.062162','-9926674.751479','30180000.000000','-9870000.000000')
SXF*/

/*SXF
#200 = line_feature('1','2','1','5','30033623.883226','-9907946.929659','30173397.382660','-9853133.792626')
SXF*/

/*SXF
#210 = line_feature('2','2','1','2','30033623.883226','-9885793.286775','30166774.128602','-9836004.687303')
SXF*/

/*SXF
#220 = sfig_org_feature('名称未定','2')
SXF*/

/*SXF
#230 = line_feature('1','1','1','5','30.000000','60.000000','193.267145','109.638952')
SXF*/

/*SXF
#240 = sfig_locate_feature('0','名称未定','-30000.000000','10000.000000','0.00000000000000','0.00100000000000','0.00100000000000')
SXF*/

/*SXF
#250 = sfig_locate_feature('0','傾きあり','-11938.248233','-7581.439779','347.417777777778','0.00200000000000','0.00200000000000')
SXF*/

/*SXF
#260 = sfig_locate_feature('0','もうひとつの用紙系','0.000000','0.000000','0.00000000000000','1.00000000000000','1.00000000000000')
SXF*/

ENDSEC;
END-ISO-10303-21;`;

  // SXFパーサーのテスト
  const parser = new SXFParser();
  const result = parser.parseWithLevelGrouping(line3Content);
  
  console.log('\n=== パース結果 ===');
  console.log(`総要素数: ${result.elements.length}`);
  console.log(`レベル数: ${result.levels.length}`);
  
  // レベル情報の表示
  console.log('\n=== レベル情報 ===');
  result.levels.forEach((level, index) => {
    console.log(`レベル${index + 1}: ${level.name}`);
    console.log(`  変換パラメータ: 原点(${level.originX}, ${level.originY}), 回転${level.rotation}°, スケール(${level.scaleX}, ${level.scaleY})`);
  });
  
  // line_feature要素の表示
  console.log('\n=== line_feature要素と変換結果 ===');
  const lineFeatures = result.elements.filter(element => element.type === 'line_feature');
  
  lineFeatures.forEach((element, index) => {
    if (element.properties.hasLineData) {
      console.log(`\nline_feature #${index + 1}:`);
      console.log(`  レイヤ: ${element.properties.layer}, 色: ${element.properties.color}`);
      console.log(`  SXF座標: (${element.properties.startX}, ${element.properties.startY}) → (${element.properties.endX}, ${element.properties.endY})`);
      console.log(`  所属レベル: ${element.levelId}`);
    }
  });
  
  // #190の具体的な確認
  console.log('\n=== #190 line_feature の詳細確認 ===');
  const line190 = lineFeatures.find(element => 
    element.properties.startX === 30.198 || // 変換後の値で検索
    Math.abs(element.properties.startX - 30030198.062162) < 0.001 // 変換前の値で検索
  );
  
  if (line190) {
    console.log('line190が見つかりました:');
    console.log(`  開始点: (${line190.properties.startX}, ${line190.properties.startY})`);
    console.log(`  終了点: (${line190.properties.endX}, ${line190.properties.endY})`);
    console.log(`  所属レベル: ${line190.levelId}`);
  } else {
    console.log('line190が見つかりませんでした');
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * ブラウザ環境での実行用
 */
if (typeof window !== 'undefined') {
  (window as any).testLINE3SXFParsing = testLINE3SXFParsing;
}