const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('=== データベース構造確認 ===\n');

    // 各テーブルのレコード数を確認
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const layerCount = await prisma.layer.count();
    const drawingCount = await prisma.drawing.count();
    const drawingElementCount = await prisma.drawingElement.count();
    const surveyPointCount = await prisma.surveyPoint.count();
    const boundaryLineCount = await prisma.boundaryLine.count();
    const landParcelCount = await prisma.landParcel.count();
    
    console.log('テーブル別レコード数:');
    console.log('- User:', userCount);
    console.log('- Project:', projectCount);
    console.log('- Layer:', layerCount);
    console.log('- Drawing:', drawingCount);
    console.log('- DrawingElement:', drawingElementCount);
    console.log('- SurveyPoint:', surveyPointCount);
    console.log('- BoundaryLine:', boundaryLineCount);
    console.log('- LandParcel:', landParcelCount);

    // レイヤーデータの詳細
    if (layerCount > 0) {
      console.log('\n=== レイヤーデータ詳細 ===');
      const layers = await prisma.layer.findMany({
        include: {
          project: { select: { name: true } },
          elements: { select: { id: true, type: true } }
        }
      });
      
      layers.forEach(layer => {
        console.log(`レイヤー: ${layer.name}`);
        console.log(`  - 色: ${layer.color}`);
        console.log(`  - 線種: ${layer.lineType}`);
        console.log(`  - 線幅: ${layer.lineWidth}`);
        console.log(`  - 表示: ${layer.visible}`);
        console.log(`  - ロック: ${layer.locked}`);
        console.log(`  - 要素数: ${layer.elements.length}`);
        console.log(`  - プロジェクト: ${layer.project?.name || 'なし'}`);
        console.log('');
      });
    }

    // 描画要素の詳細
    if (drawingElementCount > 0) {
      console.log('=== 描画要素詳細 ===');
      const elements = await prisma.drawingElement.findMany({
        take: 5,
        include: {
          layer: { select: { name: true } }
        }
      });
      
      elements.forEach(element => {
        console.log(`要素: ${element.type}`);
        console.log(`  - ID: ${element.id}`);
        const geomPreview = element.geometry ? element.geometry.substring(0, 100) : 'なし';
        console.log(`  - 幾何情報: ${geomPreview}...`);
        console.log(`  - レイヤー: ${element.layer?.name || 'なし'}`);
        console.log(`  - 表示: ${element.visible}`);
        console.log('');
      });
    }

    // SXFデータの確認
    if (drawingCount > 0) {
      console.log('=== SXFデータ詳細 ===');
      const drawings = await prisma.drawing.findMany({
        select: {
          name: true,
          sxfData: true,
          metadata: true,
          elements: { select: { id: true } }
        }
      });
      
      drawings.forEach(drawing => {
        console.log(`図面: ${drawing.name}`);
        console.log(`  - SXFデータ: ${drawing.sxfData ? `${drawing.sxfData.length}文字` : 'なし'}`);
        console.log(`  - メタデータ: ${drawing.metadata ? 'あり' : 'なし'}`);
        console.log(`  - 要素数: ${drawing.elements.length}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('データベース確認エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();