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
exports.logger = exports.io = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const winston_1 = __importDefault(require("winston"));
// ルートのインポート
const auth_1 = __importDefault(require("./routes/auth"));
const projects_1 = __importDefault(require("./routes/projects"));
const drawings_1 = __importDefault(require("./routes/drawings"));
const sxf_1 = __importDefault(require("./routes/sxf"));
const members_1 = __importDefault(require("./routes/members"));
// import taskRoutes from './routes/tasks';
// ミドルウェアのインポート
const auth_2 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
// Prismaクライアントの初期化
exports.prisma = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});
// ロガーの設定
const logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'cadastral-cad-backend' },
    transports: [
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
});
exports.logger = logger;
// 開発環境ではコンソールにもログを出力
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple()
    }));
}
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// CORS設定
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
// ミドルウェアの設定
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '50mb' })); // SXFファイル用に制限を緩和
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// ログ出力ミドルウェア
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});
// Socket.IO設定
const io = new socket_io_1.Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
});
exports.io = io;
// Socket.IOの接続処理
io.on('connection', (socket) => {
    logger.info('User connected', { socketId: socket.id });
    // プロジェクト参加
    socket.on('join-project', (projectId) => {
        socket.join(`project:${projectId}`);
        logger.info('User joined project', { socketId: socket.id, projectId });
    });
    // プロジェクト離脱
    socket.on('leave-project', (projectId) => {
        socket.leave(`project:${projectId}`);
        logger.info('User left project', { socketId: socket.id, projectId });
    });
    // リアルタイム描画更新
    socket.on('drawing-update', (data) => {
        socket.to(`project:${data.projectId}`).emit('drawing-update', data);
    });
    // カーソル位置更新
    socket.on('cursor-update', (data) => {
        socket.to(`project:${data.projectId}`).emit('cursor-update', Object.assign(Object.assign({}, data), { socketId: socket.id }));
    });
    // 切断処理
    socket.on('disconnect', () => {
        logger.info('User disconnected', { socketId: socket.id });
    });
});
// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});
// API ルートの設定
app.use('/api/auth', auth_1.default);
app.use('/api/projects', auth_2.authenticateToken, projects_1.default);
app.use('/api/drawings', auth_2.authenticateToken, drawings_1.default);
app.use('/api/sxf', auth_2.authenticateToken, sxf_1.default);
app.use('/api', auth_2.authenticateToken, members_1.default);
// app.use('/api', authenticateToken, taskRoutes);
// エラーハンドリングミドルウェア
app.use(errorHandler_1.errorHandler);
// 404ハンドラー
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});
const PORT = process.env.PORT || 3001;
// グレースフルシャットダウン
process.on('SIGTERM', () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        exports.prisma.$disconnect().then(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
}));
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('HTTP server closed');
        exports.prisma.$disconnect().then(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
}));
// サーバー起動
server.listen(PORT, () => {
    logger.info(`地籍調査CADサーバーが起動しました`, { port: PORT });
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`📊 Socket.IO ready for real-time collaboration`);
});
