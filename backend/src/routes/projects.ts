import express from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { checkProjectAccess } from '../middleware/auth';

const router = express.Router();

// プロジェクト一覧取得
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user?.userId;
  
  const projects = await prisma.project.findMany({
    where: {
      users: {
        some: {
          userId
        }
      }
    },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      _count: {
        select: {
          drawings: true,
          surveyPoints: true,
          boundaryLines: true
        }
      }
    }
  });

  res.json({ projects });
}));

// プロジェクト作成
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, surveyArea, coordinateSystem } = req.body;
  const userId = req.user?.userId;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      surveyArea,
      coordinateSystem: coordinateSystem || 'JGD2000',
      users: {
        create: {
          userId: userId!,
          role: 'owner'
        }
      }
    },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  });

  res.status(201).json({ 
    message: 'プロジェクトを作成しました',
    project 
  });
}));

// プロジェクト詳細取得
router.get('/:projectId', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      users: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      },
      layers: true,
      _count: {
        select: {
          drawings: true,
          surveyPoints: true,
          boundaryLines: true,
          landParcels: true
        }
      }
    }
  });

  res.json({ project });
}));

// その他のエンドポイント（更新、削除、メンバー管理等）
// 実装は必要に応じて拡張

export default router;