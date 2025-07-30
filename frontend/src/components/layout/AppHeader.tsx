import React from 'react';
import {
  AppShell,
  Group,
  Text,
  Menu,
  Avatar,
  ActionIcon,
  Button,
  Indicator
} from '@mantine/core';
import {
  IconUser,
  IconSettings,
  IconLogout,
  IconFileText,
  IconUsers,
  IconBell
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';

interface AppHeaderProps {
  onOpenProjects?: () => void;
  onOpenSettings?: () => void;
  hasUnsavedChanges?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenProjects,
  onOpenSettings,
  hasUnsavedChanges = false
}) => {
  const { user, logout, hasRole } = useAuth();

  const handleLogout = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('未保存の変更があります。ログアウトしますか？')) {
        logout();
      }
    } else {
      logout();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'surveyor': return 'blue';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'surveyor': return '測量士';
      default: return '一般ユーザー';
    }
  };

  return (
    <div style={{ height: 60, padding: '0 16px', borderBottom: '1px solid #e0e0e0', backgroundColor: 'white' }}>
      <Group justify="space-between" h="100%">
        {/* ロゴ・タイトル */}
        <Group>
          <Text 
            size="xl" 
            fw={700} 
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
          >
            地籍調査CAD
          </Text>
          {hasUnsavedChanges && (
            <Indicator color="orange" size={8}>
              <IconFileText size={16} />
            </Indicator>
          )}
        </Group>

        {/* ナビゲーション・ユーザーメニュー */}
        <Group>
          {/* プロジェクト管理ボタン */}
          {hasRole('surveyor') && (
            <Button
              variant="light"
              leftSection={<IconUsers size={16} />}
              onClick={onOpenProjects}
            >
              プロジェクト管理
            </Button>
          )}

          {/* 通知ボタン（将来の拡張用） */}
          <ActionIcon variant="light" size="lg">
            <IconBell size={16} />
          </ActionIcon>

          {/* ユーザーメニュー */}
          <Menu width={200} position="bottom-end">
            <Menu.Target>
              <Group style={{ cursor: 'pointer' }}>
                <Avatar
                  color={getRoleColor(user?.role || 'user')}
                  radius="xl"
                  size="sm"
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    {user?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {getRoleLabel(user?.role || 'user')}
                  </Text>
                </div>
              </Group>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>アカウント</Menu.Label>
              
              <Menu.Item leftSection={<IconUser size={16} />}>
                <div>
                  <Text size="sm">{user?.name}</Text>
                  <Text size="xs" c="dimmed">{user?.email}</Text>
                </div>
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item 
                leftSection={<IconSettings size={16} />}
                onClick={onOpenSettings}
              >
                設定
              </Menu.Item>

              <Menu.Divider />

              <Menu.Item
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={handleLogout}
              >
                ログアウト
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </div>
  );
};