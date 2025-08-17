import express from 'express';
import { prisma, logger, io } from '../index';

const router = express.Router();

// CAD要素の取得（図面別）
router.get('/drawing/:drawingId', async (req, res) => {
  try {
    const { drawingId } = req.params;
    
    const elements = await prisma.drawingElement.findMany({
      where: { drawingId },
      include: {
        layer: true,
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    logger.info('Elements retrieved', { drawingId, count: elements.length });
    res.json(elements);
  } catch (error) {
    logger.error('Error retrieving elements', error);
    res.status(500).json({ error: 'Failed to retrieve elements' });
  }
});

// CAD要素の作成
router.post('/', async (req, res) => {
  try {
    const { type, geometry, properties, style, layerId, drawingId } = req.body;
    const userId = (req as any).user?.id;
    
    if (!type || !geometry || !drawingId) {
      return res.status(400).json({ error: 'Missing required fields: type, geometry, drawingId' });
    }
    
    const element = await prisma.drawingElement.create({
      data: {
        type,
        geometry,
        properties: properties ? JSON.stringify(properties) : null,
        style: style ? JSON.stringify(style) : null,
        layerId,
        drawingId,
        createdBy: userId
      },
      include: {
        layer: true,
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // 変更履歴を記録
    if (userId) {
      await prisma.changeHistory.create({
        data: {
          type: 'CREATE',
          objectType: 'DrawingElement',
          objectId: element.id,
          newData: JSON.stringify(element),
          userId,
          projectId: req.body.projectId || ''
        }
      });
    }
    
    // リアルタイム更新を送信
    io.to(`project:${req.body.projectId}`).emit('element-created', element);
    
    logger.info('Element created', { elementId: element.id, type, drawingId });
    res.status(201).json(element);
  } catch (error) {
    logger.error('Error creating element', error);
    res.status(500).json({ error: 'Failed to create element' });
  }
});

// CAD要素の更新
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, geometry, properties, style, layerId, visible, locked } = req.body;
    const userId = (req as any).user?.id;
    
    // 既存要素を取得（変更履歴用）
    const existingElement = await prisma.drawingElement.findUnique({
      where: { id }
    });
    
    if (!existingElement) {
      return res.status(404).json({ error: 'Element not found' });
    }
    
    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (geometry !== undefined) updateData.geometry = geometry;
    if (properties !== undefined) updateData.properties = JSON.stringify(properties);
    if (style !== undefined) updateData.style = JSON.stringify(style);
    if (layerId !== undefined) updateData.layerId = layerId;
    if (visible !== undefined) updateData.visible = visible;
    if (locked !== undefined) updateData.locked = locked;
    
    const element = await prisma.drawingElement.update({
      where: { id },
      data: updateData,
      include: {
        layer: true,
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    // 変更履歴を記録
    if (userId) {
      await prisma.changeHistory.create({
        data: {
          type: 'UPDATE',
          objectType: 'DrawingElement',
          objectId: element.id,
          oldData: JSON.stringify(existingElement),
          newData: JSON.stringify(element),
          userId,
          projectId: req.body.projectId || ''
        }
      });
    }
    
    // リアルタイム更新を送信
    io.to(`project:${req.body.projectId}`).emit('element-updated', element);
    
    logger.info('Element updated', { elementId: element.id });
    res.json(element);
  } catch (error) {
    logger.error('Error updating element', error);
    res.status(500).json({ error: 'Failed to update element' });
  }
});

// CAD要素の削除
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId } = req.body;
    const userId = (req as any).user?.id;
    
    // 既存要素を取得（変更履歴用）
    const existingElement = await prisma.drawingElement.findUnique({
      where: { id }
    });
    
    if (!existingElement) {
      return res.status(404).json({ error: 'Element not found' });
    }
    
    await prisma.drawingElement.delete({
      where: { id }
    });
    
    // 変更履歴を記録
    if (userId) {
      await prisma.changeHistory.create({
        data: {
          type: 'DELETE',
          objectType: 'DrawingElement',
          objectId: id,
          oldData: JSON.stringify(existingElement),
          userId,
          projectId: projectId || ''
        }
      });
    }
    
    // リアルタイム更新を送信
    io.to(`project:${projectId}`).emit('element-deleted', { id });
    
    logger.info('Element deleted', { elementId: id });
    res.json({ message: 'Element deleted successfully' });
  } catch (error) {
    logger.error('Error deleting element', error);
    res.status(500).json({ error: 'Failed to delete element' });
  }
});

// 複数CAD要素の一括更新（座標入力用）
router.patch('/batch', async (req, res) => {
  try {
    const { elements, projectId } = req.body;
    const userId = (req as any).user?.id;
    
    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ error: 'Elements array is required' });
    }
    
    const updatedElements: any[] = [];
    
    // トランザクション内で複数要素を更新
    await prisma.$transaction(async (prisma) => {
      for (const elementData of elements) {
        const { id, geometry, properties, style } = elementData;
        
        if (!id || !geometry) continue;
        
        // 既存要素を取得
        const existingElement = await prisma.drawingElement.findUnique({
          where: { id }
        });
        
        if (!existingElement) continue;
        
        const updateData: any = { geometry };
        if (properties !== undefined) updateData.properties = JSON.stringify(properties);
        if (style !== undefined) updateData.style = JSON.stringify(style);
        
        const element = await prisma.drawingElement.update({
          where: { id },
          data: updateData,
          include: {
            layer: true,
            creator: {
              select: { id: true, name: true, email: true }
            }
          }
        });
        
        updatedElements.push(element);
        
        // 変更履歴を記録
        if (userId) {
          await prisma.changeHistory.create({
            data: {
              type: 'UPDATE',
              objectType: 'DrawingElement',
              objectId: element.id,
              oldData: JSON.stringify(existingElement),
              newData: JSON.stringify(element),
              userId,
              projectId: projectId || ''
            }
          });
        }
      }
    });
    
    // リアルタイム更新を送信
    io.to(`project:${projectId}`).emit('elements-batch-updated', updatedElements);
    
    logger.info('Elements batch updated', { count: updatedElements.length, projectId });
    res.json(updatedElements);
  } catch (error) {
    logger.error('Error batch updating elements', error);
    res.status(500).json({ error: 'Failed to batch update elements' });
  }
});

// リアルタイム座標更新（一時的な位置更新、DBには保存しない）
router.post('/coordinate-update', async (req, res) => {
  try {
    const { elementId, coordinates, projectId } = req.body;
    const userId = (req as any).user?.id;
    
    if (!elementId || !coordinates || !projectId) {
      return res.status(400).json({ error: 'Missing required fields: elementId, coordinates, projectId' });
    }
    
    // リアルタイムで座標位置を他のユーザーに送信（DB保存なし）
    io.to(`project:${projectId}`).emit('coordinate-update', {
      elementId,
      coordinates,
      userId,
      timestamp: new Date().toISOString()
    });
    
    res.json({ message: 'Coordinate update broadcasted' });
  } catch (error) {
    logger.error('Error broadcasting coordinate update', error);
    res.status(500).json({ error: 'Failed to broadcast coordinate update' });
  }
});

export default router;