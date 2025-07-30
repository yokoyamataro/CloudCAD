import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { generateToken, generateRefreshToken } from '../middleware/auth';

const router = express.Router();

// ユーザー登録
router.post('/register', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, name, password, role = 'user' } = req.body;

  // バリデーション
  if (!email || !name || !password) {
    throw new AppError('メールアドレス、名前、パスワードは必須です', 400);
  }

  if (password.length < 6) {
    throw new AppError('パスワードは6文字以上である必要があります', 400);
  }

  // メールアドレスの重複チェック
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('このメールアドレスは既に使用されています', 409);
  }

  // パスワードのハッシュ化
  const hashedPassword = await bcrypt.hash(password, 10);

  // ユーザー作成
  const user = await prisma.user.create({
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
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = generateRefreshToken(user.id);

  res.status(201).json({
    message: 'ユーザーを正常に作成しました',
    user,
    token,
    refreshToken
  });
}));

// ログイン
router.post('/login', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  // バリデーション
  if (!email || !password) {
    throw new AppError('メールアドレスとパスワードは必須です', 400);
  }

  // ユーザー検索
  const user = await prisma.user.findUnique({
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
    throw new AppError('メールアドレスまたはパスワードが正しくありません', 401);
  }

  // パスワード確認
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('メールアドレスまたはパスワードが正しくありません', 401);
  }

  // JWTトークン生成
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = generateRefreshToken(user.id);

  // パスワードを除外してレスポンス
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'ログインに成功しました',
    user: userWithoutPassword,
    token,
    refreshToken
  });
}));

// トークンリフレッシュ
router.post('/refresh', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('リフレッシュトークンが必要です', 400);
  }

  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      throw new AppError('無効なリフレッシュトークンです', 401);
    }

    // ユーザー存在確認
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    if (!user) {
      throw new AppError('ユーザーが見つかりません', 404);
    }

    // 新しいトークン生成
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      message: 'トークンを更新しました',
      user,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    throw new AppError('リフレッシュトークンが無効です', 401);
  }
}));

// パスワード変更
router.put('/change-password', asyncHandler(async (req: express.Request, res: express.Response) => {
  // 認証ミドルウェアを通すため、authenticateToken後のエンドポイントとして実装
  // 実際の使用時はミドルウェアを適用する必要があります
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('認証が必要です', 401);
  }

  if (!currentPassword || !newPassword) {
    throw new AppError('現在のパスワードと新しいパスワードは必須です', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('新しいパスワードは6文字以上である必要があります', 400);
  }

  // ユーザー検索
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError('ユーザーが見つかりません', 404);
  }

  // 現在のパスワード確認
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AppError('現在のパスワードが正しくありません', 401);
  }

  // 新しいパスワードのハッシュ化
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // パスワード更新
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword }
  });

  res.json({
    message: 'パスワードを正常に変更しました'
  });
}));

// ユーザー情報取得
router.get('/me', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AppError('認証が必要です', 401);
  }

  const user = await prisma.user.findUnique({
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
    throw new AppError('ユーザーが見つかりません', 404);
  }

  res.json({ user });
}));

export default router;