import express from 'express';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { checkProjectAccess } from '../middleware/auth';

const router = express.Router();

// タスク一覧取得
router.get('/:projectId/tasks', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, assigneeId, priority, dueDateFrom, dueDateTo } = req.query;

  const where: any = { projectId };

  // フィルター条件
  if (status) {
    where.status = { in: Array.isArray(status) ? status : [status] };
  }
  if (assigneeId) {
    where.assigneeId = { in: Array.isArray(assigneeId) ? assigneeId : [assigneeId] };
  }
  if (priority) {
    where.priority = { in: Array.isArray(priority) ? priority : [priority] };
  }
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom as string);
    if (dueDateTo) where.dueDate.lte = new Date(dueDateTo as string);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      comments: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    },
    orderBy: [
      { status: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  res.json({ tasks });
}));

// タスク作成
router.post('/:projectId/tasks', checkProjectAccess('editor'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    status = 'todo',
    priority = 'medium',
    assigneeId,
    dueDate,
    estimatedHours,
    labels
  } = req.body;
  const createdBy = req.user?.userId;

  if (!title) {
    throw new AppError(400, 'タスク名は必須です');
  }

  // 担当者が存在し、プロジェクトメンバーかチェック
  if (assigneeId) {
    const member = await prisma.projectUser.findUnique({
      where: {
        userId_projectId: {
          userId: assigneeId,
          projectId
        }
      }
    });

    if (!member) {
      throw new AppError(400, '担当者がプロジェクトメンバーではありません');
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status,
      priority,
      projectId,
      assigneeId,
      createdBy,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      labels: labels ? JSON.stringify(labels) : null
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'タスクを作成しました',
    task: {
      ...task,
      labels: task.labels ? JSON.parse(task.labels) : []
    }
  });
}));

// タスク更新
router.put('/:projectId/tasks/:taskId', checkProjectAccess('editor'), asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const {
    title,
    description,
    status,
    priority,
    assigneeId,
    dueDate,
    estimatedHours,
    actualHours,
    labels
  } = req.body;

  // タスクが存在し、プロジェクトに属しているかチェック
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, projectId }
  });

  if (!existingTask) {
    throw new AppError(404, 'タスクが見つかりません');
  }

  // 担当者が存在し、プロジェクトメンバーかチェック
  if (assigneeId) {
    const member = await prisma.projectUser.findUnique({
      where: {
        userId_projectId: {
          userId: assigneeId,
          projectId
        }
      }
    });

    if (!member) {
      throw new AppError(400, '担当者がプロジェクトメンバーではありません');
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId === '' ? null : assigneeId,
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours,
      actualHours,
      labels: labels ? JSON.stringify(labels) : null
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  res.json({
    message: 'タスクを更新しました',
    task: {
      ...task,
      labels: task.labels ? JSON.parse(task.labels) : []
    }
  });
}));

// タスク削除
router.delete('/:projectId/tasks/:taskId', checkProjectAccess('editor'), asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;

  // タスクが存在し、プロジェクトに属しているかチェック
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId }
  });

  if (!task) {
    throw new AppError(404, 'タスクが見つかりません');
  }

  // 関連するコメントも削除
  await prisma.taskComment.deleteMany({
    where: { taskId }
  });

  await prisma.task.delete({
    where: { id: taskId }
  });

  res.json({ message: 'タスクを削除しました' });
}));

// タスクコメント追加
router.post('/:projectId/tasks/:taskId/comments', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId, taskId } = req.params;
  const { content } = req.body;
  const authorId = req.user?.userId;

  if (!content) {
    throw new AppError(400, 'コメント内容は必須です');
  }

  // タスクが存在し、プロジェクトに属しているかチェック
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId }
  });

  if (!task) {
    throw new AppError(404, 'タスクが見つかりません');
  }

  const comment = await prisma.taskComment.create({
    data: {
      content,
      taskId,
      authorId
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    }
  });

  res.status(201).json({
    message: 'コメントを追加しました',
    comment
  });
}));

// タスク統計情報取得
router.get('/:projectId/tasks/stats', checkProjectAccess('viewer'), asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const [
    total,
    todo,
    inProgress,
    review,
    completed,
    overdueTasks,
    priorityStats,
    assigneeStats
  ] = await Promise.all([
    // 総タスク数
    prisma.task.count({ where: { projectId } }),
    
    // ステータス別
    prisma.task.count({ where: { projectId, status: 'todo' } }),
    prisma.task.count({ where: { projectId, status: 'in_progress' } }),
    prisma.task.count({ where: { projectId, status: 'review' } }),
    prisma.task.count({ where: { projectId, status: 'completed' } }),
    
    // 期限切れ
    prisma.task.count({
      where: {
        projectId,
        dueDate: { lt: new Date() },
        status: { not: 'completed' }
      }
    }),
    
    // 優先度別
    prisma.task.groupBy({
      by: ['priority'],
      where: { projectId },
      _count: true
    }),
    
    // 担当者別
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { projectId },
      _count: true
    })
  ]);

  const byPriority = {
    low: priorityStats.find(p => p.priority === 'low')?._count || 0,
    medium: priorityStats.find(p => p.priority === 'medium')?._count || 0,
    high: priorityStats.find(p => p.priority === 'high')?._count || 0,
    urgent: priorityStats.find(p => p.priority === 'urgent')?._count || 0
  };

  // 担当者別統計を取得
  const assigneeData = await Promise.all(
    assigneeStats
      .filter(stat => stat.assigneeId)
      .map(async (stat) => {
        const user = await prisma.user.findUnique({
          where: { id: stat.assigneeId! },
          select: { id: true, name: true }
        });
        
        const completed = await prisma.task.count({
          where: {
            projectId,
            assigneeId: stat.assigneeId,
            status: 'completed'
          }
        });

        return {
          userId: stat.assigneeId!,
          name: user?.name || '不明',
          total: stat._count,
          completed
        };
      })
  );

  const byAssignee = assigneeData.reduce((acc, data) => {
    acc[data.userId] = {
      name: data.name,
      total: data.total,
      completed: data.completed
    };
    return acc;
  }, {} as any);

  const stats = {
    total,
    todo,
    in_progress: inProgress,
    review,
    completed,
    overdue: overdueTasks,
    byPriority,
    byAssignee
  };

  res.json({ stats });
}));

export default router;