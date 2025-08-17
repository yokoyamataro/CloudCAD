const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function insertSampleCoordinates() {
  try {
    console.log('サンプル座標点データを挿入しています...');

    // まずプロジェクトを確認/作成
    let project = await prisma.project.findFirst({
      where: { name: 'サンプルプロジェクト' }
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'サンプルプロジェクト',
          description: '座標点管理のサンプルプロジェクト',
          surveyArea: '東京都',
          coordinateSystem: 'JGD2000',
          units: 'm'
        }
      });
      console.log('サンプルプロジェクトを作成しました:', project.name);
    }

    // サンプル座標点データ
    const samplePoints = [
      // 基準点 2点
      {
        pointNumber: 'BM-001',
        pointType: 'benchmark',
        coordinates: 'POINT(35.6812 139.7671 10.500)', // 東京駅付近の座標系
        elevation: 10.5,
        measureDate: new Date('2024-01-15'),
        surveyorName: '田中技師',
        remarks: '1級基準点 - 東京湾平均海面基準',
        projectId: project.id
      },
      {
        pointNumber: 'BM-002',
        pointType: 'benchmark',
        coordinates: 'POINT(35.6815 139.7680 11.250)',
        elevation: 11.25,
        measureDate: new Date('2024-01-15'),
        surveyorName: '田中技師',
        remarks: '2級基準点 - GPS測量により設置',
        projectId: project.id
      },
      // 境界点 4点
      {
        pointNumber: 'BP-001',
        pointType: 'boundary_point',
        coordinates: 'POINT(35.6810 139.7665 9.850)',
        elevation: 9.85,
        measureDate: new Date('2024-01-20'),
        surveyorName: '佐藤技師',
        remarks: '敷地北西角境界点',
        projectId: project.id
      },
      {
        pointNumber: 'BP-002',
        pointType: 'boundary_point',
        coordinates: 'POINT(35.6810 139.7675 9.920)',
        elevation: 9.92,
        measureDate: new Date('2024-01-20'),
        surveyorName: '佐藤技師',
        remarks: '敷地北東角境界点',
        projectId: project.id
      },
      {
        pointNumber: 'BP-003',
        pointType: 'boundary_point',
        coordinates: 'POINT(35.6805 139.7675 9.780)',
        elevation: 9.78,
        measureDate: new Date('2024-01-21'),
        surveyorName: '鈴木技師',
        remarks: '敷地南東角境界点',
        projectId: project.id
      },
      {
        pointNumber: 'BP-004',
        pointType: 'boundary_point',
        coordinates: 'POINT(35.6805 139.7665 9.650)',
        elevation: 9.65,
        measureDate: new Date('2024-01-21'),
        surveyorName: '鈴木技師',
        remarks: '敷地南西角境界点',
        projectId: project.id
      }
    ];

    // 既存の座標点をチェック
    const existingPoints = await prisma.surveyPoint.findMany({
      where: { projectId: project.id }
    });

    if (existingPoints.length > 0) {
      console.log(`既に${existingPoints.length}件の座標点が存在します。削除してから再作成しますか？`);
      // 既存データを削除
      await prisma.surveyPoint.deleteMany({
        where: { projectId: project.id }
      });
      console.log('既存の座標点を削除しました。');
    }

    // 新しい座標点を挿入
    for (const point of samplePoints) {
      const created = await prisma.surveyPoint.create({
        data: point
      });
      console.log(`作成: ${created.pointNumber} (${created.pointType})`);
    }

    console.log('\nサンプル座標点データの挿入が完了しました！');
    console.log(`プロジェクトID: ${project.id}`);
    console.log(`基準点: 2点 (BM-001, BM-002)`);
    console.log(`境界点: 4点 (BP-001 ~ BP-004)`);

  } catch (error) {
    console.error('サンプルデータの挿入に失敗しました:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertSampleCoordinates();