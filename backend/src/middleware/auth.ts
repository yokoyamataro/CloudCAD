import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// JWTペイロードの型定義
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Expressのリクエストオブジェクトを拡張
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWTトークンの検証ミドルウェア
export const authenticateToken = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'アクセストークンが必要です' });
    }

    // トークンの検証
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: '無効なトークンです' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(403).json({ error: 'トークンが期限切れです' });
    }
    return res.status(500).json({ error: '認証処理中にエラーが発生しました' });
  }
};

// 管理者権限チェックミドルウェア
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }
  next();
};

// 測量士権限チェックミドルウェア
export const requireSurveyor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !['admin', 'surveyor'].includes(req.user.role)) {
    return res.status(403).json({ error: '測量士権限が必要です' });
  }
  next();
};

// プロジェクトアクセス権チェックミドルウェア
export const checkProjectAccess = (requiredRole: 'owner' | 'editor' | 'viewer' = 'viewer') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user?.userId;

      if (!projectId || !userId) {
        return res.status(400).json({ error: '必要なパラメータが不足しています' });
      }

      // プロジェクトへのアクセス権を確認
      const projectUser = await prisma.projectUser.findUnique({
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
      const userRoleLevel = roleHierarchy[projectUser.role as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ 
          error: `この操作には${requiredRole}権限が必要です` 
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'アクセス権確認中にエラーが発生しました' });
    }
  };
};

// JWTトークンの生成
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
  } as jwt.SignOptions);
};

// リフレッシュトークンの生成
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { 
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' 
  } as jwt.SignOptions);
};