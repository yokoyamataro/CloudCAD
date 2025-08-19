import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';

// ルートのインポート
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import drawingRoutes from './routes/drawings';
import sxfRoutes from './routes/sxf';
import memberRoutes from './routes/members';
import elementRoutes from './routes/elements';
import projectOptionRoutes from './routes/project-options';
// import taskRoutes from './routes/tasks';

// ミドルウェアのインポート
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Prismaクライアントの初期化
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// ロガーの設定
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cadastral-cad-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 開発環境ではコンソールにもログを出力
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const app = express();
const server = createServer(app);

// CORS設定
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// ミドルウェアの設定
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // SXFファイル用に制限を緩和
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
});

// Socket.IOの接続処理
io.on('connection', (socket) => {
  logger.info('User connected', { socketId: socket.id });

  // プロジェクト参加
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.info('User joined project', { socketId: socket.id, projectId });
  });

  // プロジェクト離脱
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    logger.info('User left project', { socketId: socket.id, projectId });
  });

  // リアルタイム描画更新
  socket.on('drawing-update', (data) => {
    socket.to(`project:${data.projectId}`).emit('drawing-update', data);
  });

  // カーソル位置更新
  socket.on('cursor-update', (data) => {
    socket.to(`project:${data.projectId}`).emit('cursor-update', {
      ...data,
      socketId: socket.id
    });
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
app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticateToken, projectRoutes);
app.use('/api/drawings', authenticateToken, drawingRoutes);
app.use('/api/sxf', authenticateToken, sxfRoutes);
app.use('/api/elements', authenticateToken, elementRoutes);
// テスト用: 認証なしでアクセス可能なエンドポイント
app.use('/api/elements-test', elementRoutes);
app.use('/api', authenticateToken, memberRoutes);
app.use('/api/project-options', authenticateToken, projectOptionRoutes);
// app.use('/api', authenticateToken, taskRoutes);

// エラーハンドリングミドルウェア
app.use(errorHandler);

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    prisma.$disconnect().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});

// サーバー起動
server.listen(PORT, () => {
  logger.info(`地籍調査CADサーバーが起動しました`, { port: PORT });
  console.log(`🚀 Server ready at http://localhost:${PORT}`);
  console.log(`📊 Socket.IO ready for real-time collaboration`);
});

export { io, logger };