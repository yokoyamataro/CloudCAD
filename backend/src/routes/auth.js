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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ユーザー登録
router.post('/register', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, name, password, role = 'user' } = req.body;
    // バリデーション
    if (!email || !name || !password) {
        throw new errorHandler_1.AppError('メールアドレス、名前、パスワードは必須です', 400);
    }
    if (password.length < 6) {
        throw new errorHandler_1.AppError('パスワードは6文字以上である必要があります', 400);
    }
    // メールアドレスの重複チェック
    const existingUser = yield index_1.prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
        throw new errorHandler_1.AppError('このメールアドレスは既に使用されています', 409);
    }
    // パスワードのハッシュ化
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    // ユーザー作成
    const user = yield index_1.prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: ['admin', 'surveyor', 'user'].includes(role) ? role : 'user'
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
    // JWTトークン生成
    const token = (0, auth_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    const refreshToken = (0, auth_1.generateRefreshToken)(user.id);
    res.status(201).json({
        message: 'ユーザーを正常に作成しました',
        user,
        token,
        refreshToken
    });
})));
// ログイン
router.post('/login', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    // バリデーション
    if (!email || !password) {
        throw new errorHandler_1.AppError('メールアドレスとパスワードは必須です', 400);
    }
    // ユーザー検索
    const user = yield index_1.prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            createdAt: true
        }
    });
    if (!user) {
        throw new errorHandler_1.AppError('メールアドレスまたはパスワードが正しくありません', 401);
    }
    // パスワード確認
    const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new errorHandler_1.AppError('メールアドレスまたはパスワードが正しくありません', 401);
    }
    // JWTトークン生成
    const token = (0, auth_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role
    });
    const refreshToken = (0, auth_1.generateRefreshToken)(user.id);
    // パスワードを除外してレスポンス
    const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
    res.json({
        message: 'ログインに成功しました',
        user: userWithoutPassword,
        token,
        refreshToken
    });
})));
// トークンリフレッシュ
router.post('/refresh', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new errorHandler_1.AppError('リフレッシュトークンが必要です', 400);
    }
    try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        if (decoded.type !== 'refresh') {
            throw new errorHandler_1.AppError('無効なリフレッシュトークンです', 401);
        }
        // ユーザー存在確認
        const user = yield index_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });
        if (!user) {
            throw new errorHandler_1.AppError('ユーザーが見つかりません', 404);
        }
        // 新しいトークン生成
        const newToken = (0, auth_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role
        });
        const newRefreshToken = (0, auth_1.generateRefreshToken)(user.id);
        res.json({
            message: 'トークンを更新しました',
            user,
            token: newToken,
            refreshToken: newRefreshToken
        });
    }
    catch (error) {
        throw new errorHandler_1.AppError('リフレッシュトークンが無効です', 401);
    }
})));
// パスワード変更
router.put('/change-password', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // 認証ミドルウェアを通すため、authenticateToken後のエンドポイントとして実装
    // 実際の使用時はミドルウェアを適用する必要があります
    const { currentPassword, newPassword } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new errorHandler_1.AppError('認証が必要です', 401);
    }
    if (!currentPassword || !newPassword) {
        throw new errorHandler_1.AppError('現在のパスワードと新しいパスワードは必須です', 400);
    }
    if (newPassword.length < 6) {
        throw new errorHandler_1.AppError('新しいパスワードは6文字以上である必要があります', 400);
    }
    // ユーザー検索
    const user = yield index_1.prisma.user.findUnique({
        where: { id: userId }
    });
    if (!user) {
        throw new errorHandler_1.AppError('ユーザーが見つかりません', 404);
    }
    // 現在のパスワード確認
    const isCurrentPasswordValid = yield bcryptjs_1.default.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new errorHandler_1.AppError('現在のパスワードが正しくありません', 401);
    }
    // 新しいパスワードのハッシュ化
    const hashedNewPassword = yield bcryptjs_1.default.hash(newPassword, 10);
    // パスワード更新
    yield index_1.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
    });
    res.json({
        message: 'パスワードを正常に変更しました'
    });
})));
// ユーザー情報取得
router.get('/me', (0, errorHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        throw new errorHandler_1.AppError('認証が必要です', 401);
    }
    const user = yield index_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true
        }
    });
    if (!user) {
        throw new errorHandler_1.AppError('ユーザーが見つかりません', 404);
    }
    res.json({ user });
})));
exports.default = router;
