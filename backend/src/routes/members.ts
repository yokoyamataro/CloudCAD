import express from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { checkProjectAccess } from '../middleware/auth';

const router = express.Router();

// プロジェクトメンバー一覧取得
router.get('/:projectId/members', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const projectUsers = await prisma.projectUser.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  const members = projectUsers.map(pu => ({
    id: pu.user.id,
    name: pu.user.name,
    email: pu.user.email,
    avatar: null,
    role: pu.role,
    joinedAt: new Date()
  }));

  res.json({ members });
}));

// プロジェクトにメンバー追加
router.post('/:projectId/members', checkProjectAccess('owner'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { email, role = 'viewer' } = req.body;

  // ユーザーが存在するかチェック
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('ユーザーが見つかりません', 404);
  }

  // 既にプロジェクトメンバーかチェック
  const existingMember = await prisma.projectUser.findUnique({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId
      }
    }
  });

  if (existingMember) {
    throw new AppError('既にプロジェクトメンバーです', 400);
  }

  // メンバー追加
  const projectUser = await prisma.projectUser.create({
    data: {
      userId: user.id,
      projectId,
      role
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  const member = {
    id: projectUser.user.id,
    name: projectUser.user.name,
    email: projectUser.user.email,
    avatar: null,
    role: projectUser.role,
    joinedAt: new Date()
  };

  res.status(201).json({
    message: 'メンバーを追加しました',
    member
  });
}));

// メンバーの権限更新
router.put('/:projectId/members/:userId', checkProjectAccess('owner'), asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;

  if (!['owner', 'editor', 'viewer'].includes(role)) {
    throw new AppError('無効な権限です', 400);
  }

  const projectUser = await prisma.projectUser.update({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  const member = {
    id: projectUser.user.id,
    name: projectUser.user.name,
    email: projectUser.user.email,
    avatar: null,
    role: projectUser.role,
    joinedAt: new Date()
  };

  res.json({
    message: 'メンバー権限を更新しました',
    member
  });
}));

// メンバーをプロジェクトから削除
router.delete('/:projectId/members/:userId', checkProjectAccess('owner'), asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;

  // プロジェクトオーナーの削除を防ぐ
  const projectUser = await prisma.projectUser.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  if (!projectUser) {
    throw new AppError('メンバーが見つかりません', 404);
  }

  if (projectUser.role === 'owner') {
    throw new AppError('プロジェクトオーナーは削除できません', 400);
  }

  // タスクの更新は後で実装

  await prisma.projectUser.delete({
    where: {
      userId_projectId: {
        userId,
        projectId
      }
    }
  });

  res.json({ message: 'メンバーを削除しました' });
}));

export default router;