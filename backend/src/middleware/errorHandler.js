"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitHandler = exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
// カスタムエラークラス
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Prismaエラーハンドラー
const handlePrismaError = (error) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                return {
                    statusCode: 409,
                    message: '重複したデータが存在します'
                };
            case 'P2014':
                return {
                    statusCode: 400,
                    message: '関連するデータとの制約違反です'
                };
            case 'P2003':
                return {
                    statusCode: 400,
                    message: '外部キー制約違反です'
                };
            case 'P2025':
                return {
                    statusCode: 404,
                    message: '指定されたレコードが見つかりません'
                };
            default:
                return {
                    statusCode: 400,
                    message: 'データベース操作でエラーが発生しました'
                };
        }
    }
    if (error instanceof client_1.Prisma.PrismaClientUnknownRequestError) {
        return {
            statusCode: 500,
            message: 'データベースで未知のエラーが発生しました'
        };
    }
    if (error instanceof client_1.Prisma.PrismaClientRustPanicError) {
        return {
            statusCode: 500,
            message: 'データベースエンジンでエラーが発生しました'
        };
    }
    if (error instanceof client_1.Prisma.PrismaClientInitializationError) {
        return {
            statusCode: 500,
            message: 'データベース接続の初期化に失敗しました'
        };
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return {
            statusCode: 400,
            message: 'データの検証に失敗しました'
        };
    }
    return {
        statusCode: 500,
        message: 'データベース処理中に予期しないエラーが発生しました'
    };
};
// メインのエラーハンドリングミドルウェア
const errorHandler = (error, req, res, next) => {
    var _a, _b;
    let statusCode = 500;
    let message = '内部サーバーエラーが発生しました';
    let details = undefined;
    // AppErrorの場合
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    // Prismaエラーの場合
    else if (((_a = error.name) === null || _a === void 0 ? void 0 : _a.includes('Prisma')) || error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        const prismaError = handlePrismaError(error);
        statusCode = prismaError.statusCode;
        message = prismaError.message;
    }
    // バリデーションエラーの場合
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'バリデーションエラー';
        details = error.details;
    }
    // JWTエラーの場合
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = '認証トークンが無効です';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = '認証トークンが期限切れです';
    }
    // マルチパートエラーの場合
    else if (error.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'ファイルサイズが制限を超えています';
    }
    // その他のHTTPエラー
    else if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message || message;
    }
    // エラーレスポンスの作成
    const errorResponse = {
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path
    };
    // 開発環境では詳細を含める
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.message = error.message;
        errorResponse.details = details || error.stack;
    }
    // エラーログの出力
    index_1.logger.error('Error occurred', {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        },
        request: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.method !== 'GET' ? req.body : undefined,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        },
        user: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) || 'anonymous',
        timestamp: new Date().toISOString()
    });
    // クライアントに応答
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 非同期ハンドラーのラッパー（try-catchを自動化）
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404ハンドラー
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`${req.path} が見つかりません`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// レート制限エラーハンドラー
const rateLimitHandler = (req, res) => {
    index_1.logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    res.status(429).json({
        error: 'リクエスト制限に達しました。しばらく時間をおいてから再試行してください。',
        timestamp: new Date().toISOString(),
        path: req.path
    });
};
exports.rateLimitHandler = rateLimitHandler;
