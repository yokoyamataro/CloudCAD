import React from 'react';
import {
  Paper,
  Group,
  Title,
  Text,
  Avatar,
  Menu,
  ActionIcon,
  Badge,
  Divider
} from '@mantine/core';
import {
  IconMap,
  IconUser,
  IconSettings,
  IconLogout,
  IconChevronDown
} from '@tabler/icons-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
}

interface AppHeaderProps {
  user?: User;
  onUserMenuClick?: (action: 'profile' | 'settings' | 'logout') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  user = {
    id: '1',
    name: '田中太郎',
    email: 'tanaka@example.com',
    role: 'admin'
  },
  onUserMenuClick 
}) => {

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'editor': return '編集者';
      case 'viewer': return '閲覧者';
      default: return '不明';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'editor': return 'blue';
      case 'viewer': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <Paper 
      shadow="sm" 
      p="xs" 
      withBorder 
      style={{ 
        borderRadius: 0,
        borderBottom: '1px solid #495057',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#343a40',
        color: 'white'
      }}
    >
      <Group justify="space-between">
        {/* 左側：アプリ名とロゴ */}
        <Group gap="sm">
          <Group gap="xs">
            <IconMap size={24} color="#17a2b8" />
            <div>
              <Title order={3} size="h4" c="white">
                CloudCAD
              </Title>
              <Text size="xs" c="gray.4">
                地籍調査支援システム
              </Text>
            </div>
          </Group>
        </Group>

        {/* 右側：ユーザー情報とメニュー */}
        <Group gap="sm">
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <Group 
                gap="sm" 
                style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '6px' }}
                className="hover:bg-gray-700"
              >
                <Avatar 
                  src={user.avatar} 
                  alt={user.name}
                  size="sm"
                  color="teal"
                >
                  {user.name.charAt(0)}
                </Avatar>
                <div style={{ textAlign: 'right' }}>
                  <Text size="sm" fw={500} c="white">
                    {user.name}
                  </Text>
                  <Badge 
                    size="xs" 
                    color={getRoleColor(user.role)}
                    variant="filled"
                  >
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
                <ActionIcon variant="subtle" color="gray.3" size="sm">
                  <IconChevronDown size={14} />
                </ActionIcon>
              </Group>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>アカウント情報</Menu.Label>
              <Menu.Item>
                <Group gap="xs">
                  <Avatar size="xs" color="blue">{user.name.charAt(0)}</Avatar>
                  <div>
                    <Text size="sm">{user.name}</Text>
                    <Text size="xs" c="dimmed">{user.email}</Text>
                  </div>
                </Group>
              </Menu.Item>
              
              <Divider my="xs" />
              
              <Menu.Item
                leftSection={<IconUser size={16} />}
                onClick={() => onUserMenuClick?.('profile')}
              >
                プロフィール
              </Menu.Item>
              
              <Menu.Item
                leftSection={<IconSettings size={16} />}
                onClick={() => onUserMenuClick?.('settings')}
              >
                設定
              </Menu.Item>
              
              <Divider my="xs" />
              
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                onClick={() => onUserMenuClick?.('logout')}
                color="red"
              >
                ログアウト
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
};