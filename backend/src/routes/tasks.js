"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// タスク一覧取得
router.get('/:projectId/tasks', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const { status, assigneeId, priority, dueDateFrom, dueDateTo } = req.query;
    const where = { projectId };
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
        if (dueDateFrom)
            where.dueDate.gte = new Date(dueDateFrom);
        if (dueDateTo)
            where.dueDate.lte = new Date(dueDateTo);
    }
    const tasks = yield index_1.prisma.task.findMany({
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
})));
// タスク作成
router.post('/:projectId/tasks', (0, auth_1.checkProjectAccess)('editor'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { projectId } = req.params;
    const { title, description, status = 'todo', priority = 'medium', assigneeId, dueDate, estimatedHours, labels } = req.body;
    const createdBy = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!title) {
        throw new errorHandler_1.AppError(400, 'タスク名は必須です');
    }
    // 担当者が存在し、プロジェクトメンバーかチェック
    if (assigneeId) {
        const member = yield index_1.prisma.projectUser.findUnique({
            where: {
                userId_projectId: {
                    userId: assigneeId,
                    projectId
                }
            }
        });
        if (!member) {
            throw new errorHandler_1.AppError(400, '担当者がプロジェクトメンバーではありません');
        }
    }
    const task = yield index_1.prisma.task.create({
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
        task: Object.assign(Object.assign({}, task), { labels: task.labels ? JSON.parse(task.labels) : [] })
    });
})));
// タスク更新
router.put('/:projectId/tasks/:taskId', (0, auth_1.checkProjectAccess)('editor'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, taskId } = req.params;
    const { title, description, status, priority, assigneeId, dueDate, estimatedHours, actualHours, labels } = req.body;
    // タスクが存在し、プロジェクトに属しているかチェック
    const existingTask = yield index_1.prisma.task.findFirst({
        where: { id: taskId, projectId }
    });
    if (!existingTask) {
        throw new errorHandler_1.AppError(404, 'タスクが見つかりません');
    }
    // 担当者が存在し、プロジェクトメンバーかチェック
    if (assigneeId) {
        const member = yield index_1.prisma.projectUser.findUnique({
            where: {
                userId_projectId: {
                    userId: assigneeId,
                    projectId
                }
            }
        });
        if (!member) {
            throw new errorHandler_1.AppError(400, '担当者がプロジェクトメンバーではありません');
        }
    }
    const task = yield index_1.prisma.task.update({
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
        task: Object.assign(Object.assign({}, task), { labels: task.labels ? JSON.parse(task.labels) : [] })
    });
})));
// タスク削除
router.delete('/:projectId/tasks/:taskId', (0, auth_1.checkProjectAccess)('editor'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, taskId } = req.params;
    // タスクが存在し、プロジェクトに属しているかチェック
    const task = yield index_1.prisma.task.findFirst({
        where: { id: taskId, projectId }
    });
    if (!task) {
        throw new errorHandler_1.AppError(404, 'タスクが見つかりません');
    }
    // 関連するコメントも削除
    yield index_1.prisma.taskComment.deleteMany({
        where: { taskId }
    });
    yield index_1.prisma.task.delete({
        where: { id: taskId }
    });
    res.json({ message: 'タスクを削除しました' });
})));
// タスクコメント追加
router.post('/:projectId/tasks/:taskId/comments', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { projectId, taskId } = req.params;
    const { content } = req.body;
    const authorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!content) {
        throw new errorHandler_1.AppError(400, 'コメント内容は必須です');
    }
    // タスクが存在し、プロジェクトに属しているかチェック
    const task = yield index_1.prisma.task.findFirst({
        where: { id: taskId, projectId }
    });
    if (!task) {
        throw new errorHandler_1.AppError(404, 'タスクが見つかりません');
    }
    const comment = yield index_1.prisma.taskComment.create({
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
})));
// タスク統計情報取得
router.get('/:projectId/tasks/stats', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const { projectId } = req.params;
    const [total, todo, inProgress, review, completed, overdueTasks, priorityStats, assigneeStats] = yield Promise.all([
        // 総タスク数
        index_1.prisma.task.count({ where: { projectId } }),
        // ステータス別
        index_1.prisma.task.count({ where: { projectId, status: 'todo' } }),
        index_1.prisma.task.count({ where: { projectId, status: 'in_progress' } }),
        index_1.prisma.task.count({ where: { projectId, status: 'review' } }),
        index_1.prisma.task.count({ where: { projectId, status: 'completed' } }),
        // 期限切れ
        index_1.prisma.task.count({
            where: {
                projectId,
                dueDate: { lt: new Date() },
                status: { not: 'completed' }
            }
        }),
        // 優先度別
        index_1.prisma.task.groupBy({
            by: ['priority'],
            where: { projectId },
            _count: true
        }),
        // 担当者別
        index_1.prisma.task.groupBy({
            by: ['assigneeId'],
            where: { projectId },
            _count: true
        })
    ]);
    const byPriority = {
        low: ((_a = priorityStats.find(p => p.priority === 'low')) === null || _a === void 0 ? void 0 : _a._count) || 0,
        medium: ((_b = priorityStats.find(p => p.priority === 'medium')) === null || _b === void 0 ? void 0 : _b._count) || 0,
        high: ((_c = priorityStats.find(p => p.priority === 'high')) === null || _c === void 0 ? void 0 : _c._count) || 0,
        urgent: ((_d = priorityStats.find(p => p.priority === 'urgent')) === null || _d === void 0 ? void 0 : _d._count) || 0
    };
    // 担当者別統計を取得
    const assigneeData = yield Promise.all(assigneeStats
        .filter(stat => stat.assigneeId)
        .map((stat) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield index_1.prisma.user.findUnique({
            where: { id: stat.assigneeId },
            select: { id: true, name: true }
        });
        const completed = yield index_1.prisma.task.count({
            where: {
                projectId,
                assigneeId: stat.assigneeId,
                status: 'completed'
            }
        });
        return {
            userId: stat.assigneeId,
            name: (user === null || user === void 0 ? void 0 : user.name) || '不明',
            total: stat._count,
            completed
        };
    })));
    const byAssignee = assigneeData.reduce((acc, data) => {
        acc[data.userId] = {
            name: data.name,
            total: data.total,
            completed: data.completed
        };
        return acc;
    }, {});
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
})));
exports.default = router;
