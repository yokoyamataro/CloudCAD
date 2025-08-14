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
exports.generateRefreshToken = exports.generateToken = exports.checkProjectAccess = exports.requireSurveyor = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// JWTトークンの検証ミドルウェア
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({ error: 'アクセストークンが必要です' });
        }
        // トークンの検証
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // ユーザーの存在確認
        const user = yield index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'ユーザーが見つかりません' });
        }
        // リクエストオブジェクトにユーザー情報を追加
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(403).json({ error: '無効なトークンです' });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(403).json({ error: 'トークンが期限切れです' });
        }
        return res.status(500).json({ error: '認証処理中にエラーが発生しました' });
    }
});
exports.authenticateToken = authenticateToken;
// 管理者権限チェックミドルウェア
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '管理者権限が必要です' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
// 測量士権限チェックミドルウェア
const requireSurveyor = (req, res, next) => {
    if (!req.user || !['admin', 'surveyor'].includes(req.user.role)) {
        return res.status(403).json({ error: '測量士権限が必要です' });
    }
    next();
};
exports.requireSurveyor = requireSurveyor;
// プロジェクトアクセス権チェックミドルウェア
const checkProjectAccess = (requiredRole = 'viewer') => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const projectId = req.params.projectId;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (!projectId || !userId) {
                return res.status(400).json({ error: '必要なパラメータが不足しています' });
            }
            // プロジェクトへのアクセス権を確認
            const projectUser = yield index_1.prisma.projectUser.findUnique({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                }
            });
            if (!projectUser) {
                return res.status(403).json({ error: 'このプロジェクトへのアクセス権がありません' });
            }
            // 権限レベルをチェック
            const roleHierarchy = { viewer: 1, editor: 2, owner: 3 };
            const userRoleLevel = roleHierarchy[projectUser.role] || 0;
            const requiredRoleLevel = roleHierarchy[requiredRole];
            if (userRoleLevel < requiredRoleLevel) {
                return res.status(403).json({
                    error: `この操作には${requiredRole}権限が必要です`
                });
            }
            next();
        }
        catch (error) {
            return res.status(500).json({ error: 'アクセス権確認中にエラーが発生しました' });
        }
    });
};
exports.checkProjectAccess = checkProjectAccess;
// JWTトークンの生成
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};
exports.generateToken = generateToken;
// リフレッシュトークンの生成
const generateRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, JWT_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
    });
};
exports.generateRefreshToken = generateRefreshToken;
