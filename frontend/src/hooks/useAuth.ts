import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 型定義を直接ここに定義
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'surveyor' | 'user';
  createdAt: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'surveyor' | 'user';
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api';

interface AuthStore extends AuthState {
  // アクション
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  changePassword: (passwordData: { currentPassword: string; newPassword: string }) => Promise<void>;
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ログイン
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ログインに失敗しました');
          }

          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'ログインエラーが発生しました',
          });
          throw error;
        }
      },

      // ユーザー登録
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ユーザー登録に失敗しました');
          }

          const data = await response.json();
          
          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : '登録エラーが発生しました',
          });
          throw error;
        }
      },

      // ログアウト
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // 認証状態の更新
      refreshAuth: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          get().logout();
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            throw new Error('トークンの更新に失敗しました');
          }

          const data = await response.json();
          
          set({
            token: data.token,
            refreshToken: data.refreshToken,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          get().logout();
        }
      },

      // エラークリア
      clearError: () => {
        set({ error: null });
      },

      // パスワード変更
      changePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
        const { token } = get();
        
        if (!token) {
          throw new Error('認証が必要です');
        }

        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(passwordData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'パスワードの変更に失敗しました');
          }

          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'パスワード変更エラーが発生しました',
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);