import express from 'express';
import { prisma, logger } from '../index';

const router = express.Router();

// プロジェクトの土地区画一覧取得
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const landParcels = await prisma.landParcel.findMany({
      where: { projectId },
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { parcelNumber: 'asc' }
    });
    
    logger.info('Land parcels retrieved', { projectId, count: landParcels.length });
    res.json(landParcels);
  } catch (error) {
    logger.error('Error retrieving land parcels', error);
    res.status(500).json({ error: 'Failed to retrieve land parcels' });
  }
});

// 土地区画の個別取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const landParcel = await prisma.landParcel.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!landParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }
    
    logger.info('Land parcel retrieved', { id });
    res.json(landParcel);
  } catch (error) {
    logger.error('Error retrieving land parcel', error);
    res.status(500).json({ error: 'Failed to retrieve land parcel' });
  }
});

// 土地区画の作成
router.post('/', async (req, res) => {
  try {
    const {
      parcelNumber,
      address,
      area,
      landUse,
      owner,
      geometry,
      registrationDate,
      remarks,
      projectId
    } = req.body;
    
    if (!parcelNumber || !projectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: parcelNumber, projectId' 
      });
    }
    
    // 同一プロジェクト内で地番の重複チェック
    const existingParcel = await prisma.landParcel.findUnique({
      where: { 
        projectId_parcelNumber: { 
          projectId, 
          parcelNumber 
        } 
      }
    });
    
    if (existingParcel) {
      return res.status(400).json({ 
        error: `Parcel number ${parcelNumber} already exists in this project` 
      });
    }
    
    const landParcel = await prisma.landParcel.create({
      data: {
        parcelNumber,
        address,
        area,
        landUse,
        owner,
        geometry,
        coordinatePoints: req.body.coordinatePoints || null,
        registrationDate: registrationDate ? new Date(registrationDate) : null,
        remarks,
        projectId
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    logger.info('Land parcel created', { id: landParcel.id, parcelNumber });
    res.status(201).json(landParcel);
  } catch (error) {
    logger.error('Error creating land parcel', error);
    res.status(500).json({ error: 'Failed to create land parcel' });
  }
});

// 土地区画の更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      parcelNumber,
      address,
      area,
      landUse,
      owner,
      geometry,
      coordinatePoints,
      registrationDate,
      remarks
    } = req.body;
    
    // 存在確認
    const existingParcel = await prisma.landParcel.findUnique({
      where: { id }
    });
    
    if (!existingParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }
    
    // 地番変更時の重複チェック
    if (parcelNumber && parcelNumber !== existingParcel.parcelNumber) {
      const duplicateParcel = await prisma.landParcel.findUnique({
        where: { 
          projectId_parcelNumber: { 
            projectId: existingParcel.projectId, 
            parcelNumber 
          } 
        }
      });
      
      if (duplicateParcel) {
        return res.status(400).json({ 
          error: `Parcel number ${parcelNumber} already exists in this project` 
        });
      }
    }
    
    const landParcel = await prisma.landParcel.update({
      where: { id },
      data: {
        ...(parcelNumber && { parcelNumber }),
        ...(address !== undefined && { address }),
        ...(area !== undefined && { area }),
        ...(landUse && { landUse }),
        ...(owner && { owner }),
        ...(geometry && { geometry }),
        ...(coordinatePoints !== undefined && { coordinatePoints }),
        ...(registrationDate && { registrationDate: new Date(registrationDate) }),
        ...(remarks !== undefined && { remarks })
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    logger.info('Land parcel updated', { id });
    res.json(landParcel);
  } catch (error) {
    logger.error('Error updating land parcel', error);
    res.status(500).json({ error: 'Failed to update land parcel' });
  }
});

// 土地区画の削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingParcel = await prisma.landParcel.findUnique({
      where: { id }
    });
    
    if (!existingParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }
    
    await prisma.landParcel.delete({
      where: { id }
    });
    
    logger.info('Land parcel deleted', { id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting land parcel', error);
    res.status(500).json({ error: 'Failed to delete land parcel' });
  }
});

// 土地区画の一括作成（CSVインポート用）
router.post('/bulk', async (req, res) => {
  try {
    const { landParcels, projectId } = req.body;
    
    if (!Array.isArray(landParcels) || !projectId) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected array of land parcels and projectId' 
      });
    }
    
    // データ準備
    const parcelsData = landParcels.map(parcel => ({
      ...parcel,
      projectId,
      registrationDate: parcel.registrationDate ? new Date(parcel.registrationDate) : null
    }));
    
    const result = await prisma.landParcel.createMany({
      data: parcelsData
    });
    
    logger.info('Land parcels bulk created', { 
      projectId, 
      requestedCount: landParcels.length,
      createdCount: result.count 
    });
    
    res.status(201).json({ 
      message: `${result.count} land parcels created successfully`,
      createdCount: result.count,
      requestedCount: landParcels.length
    });
  } catch (error) {
    logger.error('Error bulk creating land parcels', error);
    res.status(500).json({ error: 'Failed to create land parcels' });
  }
});

// 面積計算（ジオメトリベース）
router.post('/:id/calculate-area', async (req, res) => {
  try {
    const { id } = req.params;
    
    const landParcel = await prisma.landParcel.findUnique({
      where: { id }
    });
    
    if (!landParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }
    
    if (!landParcel.geometry) {
      return res.status(400).json({ error: 'No geometry data available for area calculation' });
    }
    
    // TODO: 実際のジオメトリ計算ライブラリを使用
    // 現在は仮の計算
    const calculatedArea = landParcel.area || 0;
    
    const updatedParcel = await prisma.landParcel.update({
      where: { id },
      data: { area: calculatedArea }
    });
    
    logger.info('Land parcel area calculated', { id, area: calculatedArea });
    res.json({ 
      id,
      calculatedArea,
      parcel: updatedParcel
    });
  } catch (error) {
    logger.error('Error calculating land parcel area', error);
    res.status(500).json({ error: 'Failed to calculate area' });
  }
});

// 構成点の設定・更新
router.put('/:id/coordinate-points', async (req, res) => {
  try {
    const { id } = req.params;
    const { coordinatePoints, geometry } = req.body;

    // 存在確認
    const existingParcel = await prisma.landParcel.findUnique({
      where: { id }
    });

    if (!existingParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }

    // 構成点とジオメトリを更新
    const updatedParcel = await prisma.landParcel.update({
      where: { id },
      data: {
        coordinatePoints,
        geometry
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info('Land parcel coordinate points updated', { id, pointCount: JSON.parse(coordinatePoints || '[]').length });
    res.json(updatedParcel);
  } catch (error) {
    logger.error('Error updating land parcel coordinate points', error);
    res.status(500).json({ error: 'Failed to update coordinate points' });
  }
});

// 構成点の取得
router.get('/:id/coordinate-points', async (req, res) => {
  try {
    const { id } = req.params;

    const landParcel = await prisma.landParcel.findUnique({
      where: { id },
      select: {
        id: true,
        parcelNumber: true,
        coordinatePoints: true,
        geometry: true
      }
    });

    if (!landParcel) {
      return res.status(404).json({ error: 'Land parcel not found' });
    }

    const coordinateIds = landParcel.coordinatePoints ? JSON.parse(landParcel.coordinatePoints) : [];

    // 構成座標点の詳細情報も取得
    const coordinateDetails = await prisma.surveyPoint.findMany({
      where: {
        id: { in: coordinateIds },
        projectId: req.body.projectId // セキュリティのためプロジェクトIDも確認
      },
      select: {
        id: true,
        pointNumber: true,
        pointType: true,
        x: true,
        y: true,
        elevation: true
      }
    });

    res.json({
      parcelId: landParcel.id,
      parcelNumber: landParcel.parcelNumber,
      coordinateIds,
      coordinateDetails,
      geometry: landParcel.geometry
    });
  } catch (error) {
    logger.error('Error retrieving land parcel coordinate points', error);
    res.status(500).json({ error: 'Failed to retrieve coordinate points' });
  }
});

export default router;