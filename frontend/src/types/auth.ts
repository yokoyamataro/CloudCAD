// 認証関連の型定義

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'surveyor' | 'user';
  createdAt: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'surveyor' | 'user';
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ApiError {
  error: string;
  message?: string;
  details?: any;
  timestamp?: string;
  path?: string;
}