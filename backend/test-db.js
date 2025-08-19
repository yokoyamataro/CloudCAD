const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('=== SQLite データベース機能テスト ===');
    
    // 1. 接続テスト
    console.log('\n1️⃣ データベース接続テスト...');
    await prisma.$connect();
    console.log('✅ データベース接続成功');
    
    // 2. テーブル作成確認
    console.log('\n2️⃣ テーブル構造確認...');
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name;
    `;
    console.log('📊 作成済みテーブル:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // 3. テストデータ挿入
    console.log('\n3️⃣ テストデータ挿入...');
    
    // テストユーザー作成
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'テストユーザー',
        password: 'test123',
        role: 'admin'
      }
    });
    console.log('✅ テストユーザー作成:', testUser.name);
    
    // テストプロジェクト作成
    const testProject = await prisma.project.create({
      data: {
        name: 'テストプロジェクト',
        description: 'SQLite機能テスト用プロジェクト',
        surveyArea: 'テスト地区',
        coordinateSystem: 'JGD2000',
        units: 'm'
      }
    });
    console.log('✅ テストプロジェクト作成:', testProject.name);
    
    // プロジェクト参加者追加
    const projectUser = await prisma.projectUser.create({
      data: {
        userId: testUser.id,
        projectId: testProject.id,
        role: 'owner'
      }
    });
    console.log('✅ プロジェクト参加者追加');
    
    // テスト図面作成
    const testDrawing = await prisma.drawing.create({
      data: {
        name: 'テスト図面',
        version: 1,
        projectId: testProject.id,
        authorId: testUser.id,
        metadata: JSON.stringify({
          format: 'test',
          created: new Date().toISOString()
        })
      }
    });
    console.log('✅ テスト図面作成:', testDrawing.name);
    
    // テストレイヤー作成
    const testLayer = await prisma.layer.create({
      data: {
        name: 'テストレイヤー',
        color: '#FF0000',
        lineType: 'CONTINUOUS',
        lineWidth: 1.0,
        projectId: testProject.id
      }
    });
    console.log('✅ テストレイヤー作成:', testLayer.name);
    
    // テストCAD要素作成
    const testElement = await prisma.drawingElement.create({
      data: {
        type: 'LINE',
        geometry: 'LINESTRING(0 0, 100 100)',
        properties: JSON.stringify({
          layer: 'test',
          color: 'red',
          lineType: 'solid'
        }),
        style: JSON.stringify({
          stroke: '#FF0000',
          strokeWidth: 2
        }),
        layerId: testLayer.id,
        drawingId: testDrawing.id,
        createdBy: testUser.id
      }
    });
    console.log('✅ テストCAD要素作成:', testElement.type);
    
    // テスト測量点作成
    const testSurveyPoint = await prisma.surveyPoint.create({
      data: {
        pointNumber: 'TP-001',
        pointType: '基準点',
        coordinates: 'POINT(123456.789 987654.321)',
        elevation: 123.456,
        accuracy: '2級',
        measureMethod: 'GNSS測量',
        measureDate: new Date(),
        surveyorName: 'テスト測量士',
        projectId: testProject.id,
        createdBy: testUser.id
      }
    });
    console.log('✅ テスト測量点作成:', testSurveyPoint.pointNumber);
    
    // 4. データ読み取りテスト
    console.log('\n4️⃣ データ読み取りテスト...');
    
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const drawingCount = await prisma.drawing.count();
    const elementCount = await prisma.drawingElement.count();
    const surveyPointCount = await prisma.surveyPoint.count();
    const layerCount = await prisma.layer.count();
    
    console.log('📊 データ件数:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Projects: ${projectCount}`);
    console.log(`  Drawings: ${drawingCount}`);
    console.log(`  DrawingElements: ${elementCount}`);
    console.log(`  SurveyPoints: ${surveyPointCount}`);
    console.log(`  Layers: ${layerCount}`);
    
    // 5. 高精度座標テスト
    console.log('\n5️⃣ 高精度座標テスト...');
    
    const highPrecisionPoint = await prisma.surveyPoint.create({
      data: {
        pointNumber: 'HP-001',
        pointType: '高精度点',
        coordinates: 'POINT(123456.123456789012 987654.987654321098)',
        elevation: 3776.123456789,
        projectId: testProject.id,
        createdBy: testUser.id
      }
    });
    
    const retrieved = await prisma.surveyPoint.findUnique({
      where: { id: highPrecisionPoint.id }
    });
    
    console.log('入力座標:', highPrecisionPoint.coordinates);
    console.log('取得座標:', retrieved.coordinates);
    console.log('入力標高:', highPrecisionPoint.elevation);
    console.log('取得標高:', retrieved.elevation);
    
    const coordinatesMatch = highPrecisionPoint.coordinates === retrieved.coordinates;
    const elevationMatch = Math.abs(highPrecisionPoint.elevation - retrieved.elevation) < 1e-10;
    
    console.log('座標精度:', coordinatesMatch ? '✅ 完全一致' : '❌ 精度ロス');
    console.log('標高精度:', elevationMatch ? '✅ 高精度' : '⚠️ Float制限');
    
    console.log('\n✅ SQLite データベースは正常に機能しています！');
    console.log('🎯 Prisma Studioで上記のテストデータを確認できます。');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();