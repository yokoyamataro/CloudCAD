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
// プロジェクトメンバー一覧取得
router.get('/:projectId/members', (0, auth_1.checkProjectAccess)('viewer'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const projectUsers = yield index_1.prisma.projectUser.findMany({
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
})));
// プロジェクトにメンバー追加
router.post('/:projectId/members', (0, auth_1.checkProjectAccess)('owner'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const { email, role = 'viewer' } = req.body;
    // ユーザーが存在するかチェック
    const user = yield index_1.prisma.user.findUnique({
        where: { email }
    });
    if (!user) {
        throw new errorHandler_1.AppError('ユーザーが見つかりません', 404);
    }
    // 既にプロジェクトメンバーかチェック
    const existingMember = yield index_1.prisma.projectUser.findUnique({
        where: {
            userId_projectId: {
                userId: user.id,
                projectId
            }
        }
    });
    if (existingMember) {
        throw new errorHandler_1.AppError('既にプロジェクトメンバーです', 400);
    }
    // メンバー追加
    const projectUser = yield index_1.prisma.projectUser.create({
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
})));
// メンバーの権限更新
router.put('/:projectId/members/:userId', (0, auth_1.checkProjectAccess)('owner'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, userId } = req.params;
    const { role } = req.body;
    if (!['owner', 'editor', 'viewer'].includes(role)) {
        throw new errorHandler_1.AppError('無効な権限です', 400);
    }
    const projectUser = yield index_1.prisma.projectUser.update({
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
})));
// メンバーをプロジェクトから削除
router.delete('/:projectId/members/:userId', (0, auth_1.checkProjectAccess)('owner'), (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, userId } = req.params;
    // プロジェクトオーナーの削除を防ぐ
    const projectUser = yield index_1.prisma.projectUser.findUnique({
        where: {
            userId_projectId: {
                userId,
                projectId
            }
        }
    });
    if (!projectUser) {
        throw new errorHandler_1.AppError('メンバーが見つかりません', 404);
    }
    if (projectUser.role === 'owner') {
        throw new errorHandler_1.AppError('プロジェクトオーナーは削除できません', 400);
    }
    // タスクの更新は後で実装
    yield index_1.prisma.projectUser.delete({
        where: {
            userId_projectId: {
                userId,
                projectId
            }
        }
    });
    res.json({ message: 'メンバーを削除しました' });
})));
exports.default = router;
