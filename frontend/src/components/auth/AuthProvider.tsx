import React, { useState, useEffect } from 'react';
import { Modal, Loader, Center, Stack, Text } from '@mantine/core';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user, isTokenExpired, refreshAuth, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // 初期化時にトークンの確認とリフレッシュを行う
  useEffect(() => {
    const initializeAuth = async () => {
      setIsInitializing(true);
      
      try {
        // トークンが存在し、期限切れの場合はリフレッシュを試行
        if (user && isTokenExpired()) {
          await refreshAuth();
        }
      } catch (error) {
        console.warn('Token refresh failed:', error);
        logout(); // リフレッシュに失敗した場合はログアウト
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  // 認証状態に基づいてモーダルの表示を制御
  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [isAuthenticated, isInitializing]);

  // 初期化中の場合はローディング画面を表示
  if (isInitializing) {
    return (
      <Center style={{ height: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>地籍調査CADを起動中...</Text>
        </Stack>
      </Center>
    );
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
  };

  const switchToRegister = () => {
    setAuthMode('register');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  return (
    <>
      {/* 認証が完了している場合はメインアプリケーションを表示 */}
      {isAuthenticated && children}

      {/* 認証モーダル */}
      <Modal
        opened={showAuthModal}
        onClose={() => {}} // 認証が必要なため、ESCで閉じることはできない
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        size="sm"
        centered
        overlayProps={{
          opacity: 0.8,
          blur: 3,
        }}
      >
        {authMode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={switchToRegister}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
      </Modal>
    </>
  );
};