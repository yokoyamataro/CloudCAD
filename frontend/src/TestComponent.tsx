import React, { useState } from 'react';
import { Button, Container, Title, Text, Alert, Group, Stack, Paper } from '@mantine/core';
import { IconCheck, IconPencil, IconArrowLeft } from '@tabler/icons-react';

// エラーバウンダリコンポーネント
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CADEditor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="lg" py={40}>
          <Alert color="red" title="エラーが発生しました">
            <Text size="sm" mb="md">
              CADエディタの読み込み中にエラーが発生しました。
            </Text>
            <Paper p="md" bg="gray.1">
              <Text size="xs" family="monospace">
                {this.state.error?.message || 'Unknown error'}
              </Text>
              <Text size="xs" family="monospace" c="dimmed">
                {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
              </Text>
            </Paper>
            <Button
              mt="md"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              リロードして再試行
            </Button>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export const TestComponent: React.FC = () => {
  const [showCADEditor, setShowCADEditor] = useState(false);

  if (showCADEditor) {
    // CADEditorを動的にインポートして表示
    const CADEditor = React.lazy(() => 
      import('./components/cad/CADEditor').then(module => ({ default: module.CADEditor }))
    );

    return (
      <ErrorBoundary>
        <React.Suspense fallback={
          <Container size="lg" py={40}>
            <Alert color="blue" title="読み込み中">
              CADエディタを読み込んでいます...
            </Alert>
          </Container>
        }>
          <CADEditor
            projectId="test-multipage"
            onClose={() => setShowCADEditor(false)}
            onSave={(data) => {
              console.log('CADデータが保存されました:', data);
              alert('CADデータを保存しました');
            }}
          />
        </React.Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <Container size="lg" py={40}>
      <Title order={1} mb="md">CloudCAD テスト画面 - ポート5184</Title>
      
      <Alert icon={<IconCheck size={16} />} title="システム稼働中" color="green" mb="lg">
        アプリケーションが正常に動作しています。現在のポート: 5184
        <br />
        <strong>マルチページ機能が実装されました！</strong>
      </Alert>
      
      <Stack gap="md">
        <Text size="lg">
          マルチページ機能のテスト環境です。
        </Text>
        
        <Group>
          <Button
            size="lg"
            onClick={() => alert('ボタンが正常に動作しています！')}
          >
            動作テスト
          </Button>
          
          <Button
            size="lg"
            leftSection={<IconPencil size={16} />}
            color="blue"
            onClick={() => setShowCADEditor(true)}
          >
            CAD編集（マルチページ機能テスト）
          </Button>
        </Group>
        
        <Alert color="blue" title="マルチページ機能について">
          <Text size="sm">
            CAD編集画面で以下の機能が利用できます：
            <br />• ツールバーの黄色い「+」ボタンで新しいページを追加
            <br />• 「-」ボタンでページを削除（最低1ページは保持）
            <br />• ドロップダウンでページを切り替え
            <br />• Canva風のマルチページレイアウト表示
          </Text>
        </Alert>
      </Stack>
      
      <Text size="sm" c="dimmed" mt="xl">
        最終更新: {new Date().toLocaleString()}
      </Text>
    </Container>
  );
};