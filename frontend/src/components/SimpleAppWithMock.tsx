import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Box,
  Alert,
  TextInput,
  PasswordInput,
  Stack
} from '@mantine/core';
import { IconCheck, IconMap, IconLogin } from '@tabler/icons-react';
import { ProjectManager } from './projects/ProjectManager';

export const SimpleAppWithMock: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'projects'>('dashboard');

  const handleLogin = () => {
    if (email && password) {
      setUser({
        name: 'デモユーザー',
        email: email,
        role: 'surveyor'
      });
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setEmail('');
    setPassword('');
    setCurrentView('dashboard');
  };

  if (!isLoggedIn) {
    return (
      <Container size="sm" py={80}>
        <Paper shadow="md" p={30} radius="md" withBorder>
          <Title ta="center" mb={20}>
            地籍調査CADシステム
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb={30}>
            ログインしてください
          </Text>
          
          <Stack>
            <TextInput
              label="メールアドレス"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="パスワード"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
            <Button 
              fullWidth 
              leftSection={<IconLogin size={16} />}
              onClick={handleLogin}
              disabled={!email || !password}
            >
              ログイン
            </Button>
          </Stack>
          
          <Text size="xs" c="dimmed" ta="center" mt={20}>
            任意のメールアドレスとパスワードを入力してください
          </Text>
        </Paper>
      </Container>
    );
  }

  if (currentView === 'projects') {
    return (
      <ProjectManager
        onBack={() => setCurrentView('dashboard')}
        user={user}
      />
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
            <Button variant="light" onClick={handleLogout}>
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
            <Button 
              variant="filled"
              onClick={() => setCurrentView('projects')}
            >
              プロジェクト管理
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