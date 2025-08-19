const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showDatabase() {
  try {
    console.log('=== CADデータベース構造 ===');
    
    // テーブル毎のレコード数を取得
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const drawingCount = await prisma.drawing.count();
    const elementCount = await prisma.drawingElement.count();
    const surveyPointCount = await prisma.surveyPoint.count();
    const layerCount = await prisma.layer.count();
    // const boundaryLineCount = await prisma.boundaryLine.count(); // 削除済み
    
    console.log('\n📊 テーブル別レコード数:');
    console.log('Users:', userCount);
    console.log('Projects:', projectCount);
    console.log('Drawings:', drawingCount);
    console.log('DrawingElements:', elementCount);
    console.log('SurveyPoints:', surveyPointCount);
    console.log('Layers:', layerCount);
    // console.log('BoundaryLines:', boundaryLineCount); // 削除済み
    
    // DrawingElementの詳細分析
    if (elementCount > 0) {
      console.log('\n📋 DrawingElement詳細:');
      
      // 型別集計
      const typeAgg = await prisma.drawingElement.groupBy({
        by: ['type'],
        _count: { type: true }
      });
      
      console.log('型別集計:');
      typeAgg.forEach(item => {
        console.log(`  ${item.type}: ${item._count.type}個`);
      });
      
      // サンプルデータ
      console.log('\nサンプルデータ:');
      const elements = await prisma.drawingElement.findMany({ 
        take: 3,
        select: {
          id: true,
          type: true,
          geometry: true,
          properties: true,
          createdAt: true
        }
      });
      
      elements.forEach((el, i) => {
        console.log(`${i+1}. [${el.type}] ${el.geometry.substring(0, 50)}...`);
        if (el.properties) {
          console.log(`   Properties: ${el.properties.substring(0, 100)}...`);
        }
      });
    }
    
    // SurveyPointの詳細分析
    if (surveyPointCount > 0) {
      console.log('\n📍 SurveyPoint詳細:');
      
      // 型別集計
      const pointTypeAgg = await prisma.surveyPoint.groupBy({
        by: ['pointType'],
        _count: { pointType: true }
      });
      
      console.log('点種別集計:');
      pointTypeAgg.forEach(item => {
        console.log(`  ${item.pointType}: ${item._count.pointType}個`);
      });
      
      // 標高精度分析
      const elevationStats = await prisma.surveyPoint.aggregate({
        _min: { elevation: true },
        _max: { elevation: true },
        _avg: { elevation: true }
      });
      
      console.log('標高統計:');
      console.log(`  最小: ${elevationStats._min.elevation}m`);
      console.log(`  最大: ${elevationStats._max.elevation}m`);
      console.log(`  平均: ${elevationStats._avg.elevation?.toFixed(6)}m`);
      
      // サンプルデータ
      console.log('\nサンプルデータ:');
      const points = await prisma.surveyPoint.findMany({ 
        take: 3,
        select: {
          pointNumber: true,
          pointType: true,
          coordinates: true,
          elevation: true
        }
      });
      
      points.forEach((pt, i) => {
        console.log(`${i+1}. ${pt.pointNumber} [${pt.pointType}]`);
        console.log(`   座標: ${pt.coordinates}`);
        console.log(`   標高: ${pt.elevation}m`);
      });
    }
    
    // 精度関連の分析
    console.log('\n🔍 データ精度分析:');
    
    // WKT形式の座標精度チェック
    if (surveyPointCount > 0) {
      const samplePoint = await prisma.surveyPoint.findFirst({
        where: {
          coordinates: {
            contains: 'POINT'
          }
        }
      });
      
      if (samplePoint) {
        console.log('WKT座標例:', samplePoint.coordinates);
        
        // 座標から数値を抽出して精度を分析
        const coordMatch = samplePoint.coordinates.match(/POINT\(([^\)]+)\)/);
        if (coordMatch) {
          const coords = coordMatch[1].split(' ');
          const x = parseFloat(coords[0]);
          const y = parseFloat(coords[1]);
          
          console.log(`  X座標: ${x} (${coords[0].length}桁)`);
          console.log(`  Y座標: ${y} (${coords[1].length}桁)`);
          
          // 小数点以下の桁数
          const xDecimals = coords[0].includes('.') ? coords[0].split('.')[1].length : 0;
          const yDecimals = coords[1].includes('.') ? coords[1].split('.')[1].length : 0;
          
          console.log(`  X精度: 小数点以下${xDecimals}桁`);
          console.log(`  Y精度: 小数点以下${yDecimals}桁`);
        }
      }
    }
    
    // Float型標高の精度チェック
    if (surveyPointCount > 0) {
      const elevationSample = await prisma.surveyPoint.findFirst({
        where: {
          elevation: { not: null }
        }
      });
      
      if (elevationSample && elevationSample.elevation !== null) {
        const elevStr = elevationSample.elevation.toString();
        const decimals = elevStr.includes('.') ? elevStr.split('.')[1].length : 0;
        
        console.log('Float標高例:', elevationSample.elevation);
        console.log(`  精度: 小数点以下${decimals}桁`);
        console.log(`  Float制限: 約7桁有効数字`);
      }
    }
    
  } catch (error) {
    console.error('データベースエラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showDatabase();