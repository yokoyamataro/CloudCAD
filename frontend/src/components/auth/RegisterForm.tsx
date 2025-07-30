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
  Anchor,
  Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
// RegisterRequest型を直接定義
interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'surveyor' | 'user';
}

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin
}) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterRequest>({
    initialValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
    validate: {
      name: (value) => {
        if (!value) return '名前を入力してください';
        if (value.length < 2) return '名前は2文字以上で入力してください';
        return null;
      },
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

  const handleSubmit = async (values: RegisterRequest) => {
    clearError();
    
    try {
      await register(values);
      onSuccess?.();
    } catch (error) {
      // エラーは useAuth で管理されているため、ここでは何もしない
    }
  };

  const roleOptions = [
    { value: 'user', label: '一般ユーザー' },
    { value: 'surveyor', label: '測量士' },
    { value: 'admin', label: '管理者' },
  ];

  return (
    <Paper withBorder shadow="md" p={30} radius="md" style={{ maxWidth: 400, margin: '0 auto' }}>
      <Title order={2} ta="center" mb="md">
        新規アカウント作成
      </Title>
      
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        地籍調査CADのアカウントを作成
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
            label="名前"
            placeholder="田中 太郎"
            {...form.getInputProps('name')}
            disabled={isLoading}
          />

          <TextInput
            label="メールアドレス"
            placeholder="your@email.com"
            {...form.getInputProps('email')}
            disabled={isLoading}
          />

          <PasswordInput
            label="パスワード"
            placeholder="6文字以上のパスワード"
            visible={showPassword}
            onVisibilityChange={setShowPassword}
            {...form.getInputProps('password')}
            disabled={isLoading}
          />

          <Select
            label="役割"
            placeholder="役割を選択"
            data={roleOptions}
            {...form.getInputProps('role')}
            disabled={isLoading}
          />

          <Text size="xs" c="dimmed">
            測量士: プロジェクト作成・編集・SXFファイル処理が可能<br/>
            一般ユーザー: プロジェクトの閲覧・基本編集が可能
          </Text>

          <Button 
            type="submit" 
            fullWidth 
            loading={isLoading}
            disabled={isLoading}
          >
            アカウント作成
          </Button>
        </Stack>
      </form>

      <Group justify="center" mt="xl">
        <Text size="sm" c="dimmed">
          既にアカウントをお持ちの方は{' '}
          <Anchor 
            size="sm" 
            onClick={onSwitchToLogin}
            style={{ cursor: 'pointer' }}
          >
            ログイン
          </Anchor>
        </Text>
      </Group>
    </Paper>
  );
};