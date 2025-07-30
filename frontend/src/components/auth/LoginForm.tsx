import React, { useState } from 'react';
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Group,
  Anchor
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
// LoginRequest型を直接定義
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginRequest>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'メールアドレスを入力してください';
        if (!/^\S+@\S+$/.test(value)) return '有効なメールアドレスを入力してください';
        return null;
      },
      password: (value) => {
        if (!value) return 'パスワードを入力してください';
        if (value.length < 6) return 'パスワードは6文字以上で入力してください';
        return null;
      },
    },
  });

  const handleSubmit = async (values: LoginRequest) => {
    clearError();
    
    try {
      await login(values);
      onSuccess?.();
    } catch (error) {
      // エラーは useAuth で管理されているため、ここでは何もしない
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md" style={{ maxWidth: 400, margin: '0 auto' }}>
      <Title order={2} ta="center" mb="md">
        地籍調査CAD
      </Title>
      
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        ログインしてプロジェクトを開始
      </Text>

      {error && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          color="red" 
          mb="md"
          onClose={clearError}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="md">
          <TextInput
            label="メールアドレス"
            placeholder="your@email.com"
            {...form.getInputProps('email')}
            disabled={isLoading}
          />

          <PasswordInput
            label="パスワード"
            placeholder="パスワードを入力"
            visible={showPassword}
            onVisibilityChange={setShowPassword}
            {...form.getInputProps('password')}
            disabled={isLoading}
          />

          <Button 
            type="submit" 
            fullWidth 
            loading={isLoading}
            disabled={isLoading}
          >
            ログイン
          </Button>
        </Stack>
      </form>

      <Group justify="center" mt="xl">
        <Text size="sm" c="dimmed">
          アカウントをお持ちでない方は{' '}
          <Anchor 
            size="sm" 
            onClick={onSwitchToRegister}
            style={{ cursor: 'pointer' }}
          >
            新規登録
          </Anchor>
        </Text>
      </Group>

      <Text size="xs" c="dimmed" ta="center" mt="xl">
        デモ用アカウント:<br/>
        surveyor@example.com / password (測量士)<br/>
        user@example.com / password (一般ユーザー)
      </Text>
    </Paper>
  );
};