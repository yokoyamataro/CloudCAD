import express from 'express';
import { prisma, logger } from '../index';

const router = express.Router();

// プロジェクトの測量点一覧取得（ページネーション対応）
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50; // デフォルト50件
    const offset = (page - 1) * limit;
    
    // 総数取得
    const totalCount = await prisma.surveyPoint.count({
      where: { projectId }
    });
    
    const surveyPoints = await prisma.surveyPoint.findMany({
      where: { projectId },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { pointNumber: 'asc' },
      skip: offset,
      take: limit
    });
    
    const totalPages = Math.ceil(totalCount / limit);
    
    logger.info('Survey points retrieved', { 
      projectId, 
      count: surveyPoints.length, 
      page, 
      totalCount, 
      totalPages 
    });
    
    // 日付フォーマット処理
    const formattedSurveyPoints = surveyPoints.map(point => ({
      ...point,
      measureDate: point.measureDate ? point.measureDate.toISOString().split('T')[0] : null
    }));
    
    res.json({
      data: formattedSurveyPoints,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error retrieving survey points', error);
    res.status(500).json({ error: 'Failed to retrieve survey points' });
  }
});

// 測量点の個別取得
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const surveyPoint = await prisma.surveyPoint.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!surveyPoint) {
      return res.status(404).json({ error: 'Survey point not found' });
    }
    
    // 日付フォーマット処理
    const formattedSurveyPoint = {
      ...surveyPoint,
      measureDate: surveyPoint.measureDate ? surveyPoint.measureDate.toISOString().split('T')[0] : null
    };
    
    logger.info('Survey point retrieved', { id });
    res.json(formattedSurveyPoint);
  } catch (error) {
    logger.error('Error retrieving survey point', error);
    res.status(500).json({ error: 'Failed to retrieve survey point' });
  }
});

// 測量点の作成
router.post('/', async (req, res) => {
  try {
    const {
      pointNumber,
      pointType,
      x,
      y,
      elevation,
      accuracy,
      measureMethod,
      measureDate,
      surveyorName,
      remarks,
      projectId
    } = req.body;
    const userId = (req as any).user?.id;
    
    if (!pointNumber || !pointType || x === undefined || y === undefined || !projectId) {
      return res.status(400).json({ 
        error: 'Missing required fields: pointNumber, pointType, x, y, projectId' 
      });
    }
    
    // 同一プロジェクト内で点番号の重複チェック
    const existingPoint = await prisma.surveyPoint.findUnique({
      where: { 
        projectId_pointNumber: { 
          projectId, 
          pointNumber 
        } 
      }
    });
    
    if (existingPoint) {
      return res.status(400).json({ 
        error: `Point number ${pointNumber} already exists in this project` 
      });
    }
    
    const surveyPoint = await prisma.surveyPoint.create({
      data: {
        pointNumber,
        pointType,
        x,
        y,
        elevation,
        accuracy,
        measureMethod,
        measureDate: measureDate ? new Date(measureDate) : null,
        surveyorName,
        remarks,
        projectId,
        createdBy: userId
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // 日付フォーマット処理
    const formattedSurveyPoint = {
      ...surveyPoint,
      measureDate: surveyPoint.measureDate ? surveyPoint.measureDate.toISOString().split('T')[0] : null
    };
    
    logger.info('Survey point created', { id: surveyPoint.id, pointNumber });
    res.status(201).json(formattedSurveyPoint);
  } catch (error) {
    logger.error('Error creating survey point', error);
    res.status(500).json({ error: 'Failed to create survey point' });
  }
});

// 測量点の更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      pointNumber,
      pointType,
      x,
      y,
      elevation,
      accuracy,
      measureMethod,
      measureDate,
      surveyorName,
      remarks
    } = req.body;
    
    // 存在確認
    const existingPoint = await prisma.surveyPoint.findUnique({
      where: { id }
    });
    
    if (!existingPoint) {
      return res.status(404).json({ error: 'Survey point not found' });
    }
    
    // 点番号変更時の重複チェック
    if (pointNumber && pointNumber !== existingPoint.pointNumber) {
      const duplicatePoint = await prisma.surveyPoint.findUnique({
        where: { 
          projectId_pointNumber: { 
            projectId: existingPoint.projectId, 
            pointNumber 
          } 
        }
      });
      
      if (duplicatePoint) {
        return res.status(400).json({ 
          error: `Point number ${pointNumber} already exists in this project` 
        });
      }
    }
    
    const surveyPoint = await prisma.surveyPoint.update({
      where: { id },
      data: {
        ...(pointNumber && { pointNumber }),
        ...(pointType && { pointType }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(elevation !== undefined && { elevation }),
        ...(accuracy && { accuracy }),
        ...(measureMethod && { measureMethod }),
        ...(measureDate && { measureDate: new Date(measureDate) }),
        ...(surveyorName && { surveyorName }),
        ...(remarks !== undefined && { remarks })
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // 日付フォーマット処理
    const formattedSurveyPoint = {
      ...surveyPoint,
      measureDate: surveyPoint.measureDate ? surveyPoint.measureDate.toISOString().split('T')[0] : null
    };
    
    logger.info('Survey point updated', { id });
    res.json(formattedSurveyPoint);
  } catch (error) {
    logger.error('Error updating survey point', error);
    res.status(500).json({ error: 'Failed to update survey point' });
  }
});

// 測量点の削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingPoint = await prisma.surveyPoint.findUnique({
      where: { id }
    });
    
    if (!existingPoint) {
      return res.status(404).json({ error: 'Survey point not found' });
    }
    
    await prisma.surveyPoint.delete({
      where: { id }
    });
    
    logger.info('Survey point deleted', { id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting survey point', error);
    res.status(500).json({ error: 'Failed to delete survey point' });
  }
});

// 測量点の一括作成（CSVインポート用）
router.post('/bulk', async (req, res) => {
  try {
    const { surveyPoints, projectId } = req.body;
    const userId = (req as any).user?.id;
    
    if (!Array.isArray(surveyPoints) || !projectId) {
      return res.status(400).json({ 
        error: 'Invalid data format. Expected array of survey points and projectId' 
      });
    }
    
    // データ準備
    const pointsData = surveyPoints.map(point => ({
      ...point,
      projectId,
      createdBy: userId,
      measureDate: point.measureDate ? new Date(point.measureDate) : null
    }));
    
    const result = await prisma.surveyPoint.createMany({
      data: pointsData
    });
    
    logger.info('Survey points bulk created', { 
      projectId, 
      requestedCount: surveyPoints.length,
      createdCount: result.count 
    });
    
    res.status(201).json({ 
      message: `${result.count} survey points created successfully`,
      createdCount: result.count,
      requestedCount: surveyPoints.length
    });
  } catch (error) {
    logger.error('Error bulk creating survey points', error);
    res.status(500).json({ error: 'Failed to create survey points' });
  }
});

export default router;