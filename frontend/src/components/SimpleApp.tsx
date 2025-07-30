import React from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Box,
  Alert
} from '@mantine/core';
import { IconCheck, IconMap } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth';

export const SimpleApp: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Title ta="center" mb={20}>
            地籍調査CADシステム
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            ログインが必要です
          </Text>
          {/* AuthProviderが自動的にログインモーダルを表示 */}
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="lg" py={40}>
      {/* ヘッダー */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Group justify="space-between">
          <Group>
            <IconMap size={32} color="blue" />
            <div>
              <Title order={2}>地籍調査CADシステム</Title>
              <Text size="sm" c="dimmed">測量・地籍管理システム</Text>
            </div>
          </Group>
          <Group>
            <Text size="sm">ようこそ、{user?.name}さん</Text>
            <Button variant="light" onClick={logout}>
              ログアウト
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* メイン内容 */}
      <Box>
        <Alert icon={<IconCheck size={16} />} title="システム稼働中" color="green" mb={20}>
          地籍調査CADシステムにログインしました。
        </Alert>

        <Paper shadow="sm" p={30} radius="md" withBorder>
          <Title order={3} mb={20}>ダッシュボード</Title>
          
          <Text mb={20}>
            現在のユーザー情報：
          </Text>
          
          <Box mb={20}>
            <Text><strong>名前:</strong> {user?.name}</Text>
            <Text><strong>メール:</strong> {user?.email}</Text>
            <Text><strong>役割:</strong> {user?.role === 'surveyor' ? '測量士' : user?.role === 'admin' ? '管理者' : '一般ユーザー'}</Text>
          </Box>

          <Group>
            <Button variant="filled" disabled>
              プロジェクト管理 (準備中)
            </Button>
            <Button variant="filled" disabled>
              CAD編集 (準備中)
            </Button>
            <Button variant="filled" disabled>
              データ管理 (準備中)
            </Button>
          </Group>
        </Paper>
      </Box>
    </Container>
  );
};