import express from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { checkProjectAccess } from '../middleware/auth';

const router = express.Router();

// 図面一覧取得
router.get('/project/:projectId', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const drawings = await prisma.drawing.findMany({
    where: { projectId },
    include: {
      author: {
        select: { id: true, name: true, email: true }
      },
      _count: {
        select: { elements: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json({ drawings });
}));

// 図面作成
router.post('/', checkProjectAccess('editor'), asyncHandler(async (req, res) => {
  const { name, projectId, sxfData, metadata } = req.body;
  const userId = req.user?.userId;

  const drawing = await prisma.drawing.create({
    data: {
      name,
      projectId,
      authorId: userId!,
      sxfData: sxfData ? JSON.stringify(sxfData) : null,
      metadata: metadata ? JSON.stringify(metadata) : null
    },
    include: {
      author: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(201).json({
    message: '図面を作成しました',
    drawing
  });
}));

// 図面詳細取得
router.get('/:drawingId', asyncHandler(async (req, res) => {
  const { drawingId } = req.params;

  const drawing = await prisma.drawing.findUnique({
    where: { id: drawingId },
    include: {
      author: {
        select: { id: true, name: true, email: true }
      },
      project: {
        select: { id: true, name: true, coordinateSystem: true }
      },
      elements: {
        include: {
          layer: true
        }
      }
    }
  });

  if (!drawing) {
    throw new AppError('図面が見つかりません', 404);
  }

  res.json({ drawing });
}));

// 描画要素の追加
router.post('/:drawingId/elements', checkProjectAccess('editor'), asyncHandler(async (req, res) => {
  const { drawingId } = req.params;
  const { type, geometry, properties, style, layerId } = req.body;
  const userId = req.user?.userId;

  const element = await prisma.drawingElement.create({
    data: {
      type,
      geometry: JSON.stringify(geometry),
      properties: properties ? JSON.stringify(properties) : null,
      style: style ? JSON.stringify(style) : null,
      drawingId,
      layerId,
      createdBy: userId
    }
  });

  res.status(201).json({
    message: '描画要素を追加しました',
    element
  });
}));

export default router;