import React, { useState } from 'react';
import { Box, Button, Group, Text, Select } from '@mantine/core';
import { IconPlus, IconMinus } from '@tabler/icons-react';

interface TestPage {
  id: string;
  name: string;
  color: string;
}

export const MultiPageTest: React.FC = () => {
  const [pages, setPages] = useState<TestPage[]>([
    { id: 'page-1', name: 'ページ 1', color: '#ff6b6b' }
  ]);
  const [currentPageId, setCurrentPageId] = useState<string>('page-1');

  const addNewPage = () => {
    const newPageId = `page-${Date.now()}`;
    const colors = ['#51cf66', '#339af0', '#845ef7', '#ffd43b', '#ff8787'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newPage: TestPage = {
      id: newPageId,
      name: `ページ ${pages.length + 1}`,
      color: randomColor
    };
    
    setPages(prev => [...prev, newPage]);
    setCurrentPageId(newPageId);
  };

  const deletePage = (pageId: string) => {
    if (pages.length <= 1) return;
    
    setPages(prev => prev.filter(page => page.id !== pageId));
    
    if (currentPageId === pageId) {
      const remainingPages = pages.filter(page => page.id !== pageId);
      setCurrentPageId(remainingPages[0]?.id || pages[0]?.id);
    }
  };

  const currentPage = pages.find(page => page.id === currentPageId);

  return (
    <Box p="md">
      <Text size="xl" fw={700} mb="md">マルチページ機能テスト</Text>
      
      {/* ページ管理UI */}
      <Group mb="lg" p="md" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <Button
          leftSection={<IconPlus size={16} />}
          color="green"
          onClick={addNewPage}
        >
          新しいページを追加
        </Button>
        
        <Button
          leftSection={<IconMinus size={16} />}
          color="red"
          onClick={() => deletePage(currentPageId)}
          disabled={pages.length <= 1}
        >
          現在のページを削除
        </Button>
        
        <Select
          data={pages.map(page => ({ value: page.id, label: page.name }))}
          value={currentPageId}
          onChange={(value) => value && setCurrentPageId(value)}
          placeholder="ページ選択"
          w={150}
        />
        
        <Text c="dimmed">
          {pages.findIndex(p => p.id === currentPageId) + 1} / {pages.length}
        </Text>
      </Group>

      {/* ページ表示エリア */}
      <Box style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {pages.map(page => (
          <Box
            key={page.id}
            w={200}
            h={150}
            p="md"
            style={{
              backgroundColor: page.color,
              borderRadius: '8px',
              border: page.id === currentPageId ? '3px solid #228be6' : '1px solid #dee2e6',
              cursor: 'pointer',
              opacity: page.id === currentPageId ? 1 : 0.7
            }}
            onClick={() => setCurrentPageId(page.id)}
          >
            <Text c="white" fw={600} size="lg">
              {page.name}
            </Text>
            <Text c="white" size="sm" mt="xs">
              ID: {page.id}
            </Text>
            {page.id === currentPageId && (
              <Text c="white" size="xs" mt="md" fw={600}>
                ✓ アクティブ
              </Text>
            )}
          </Box>
        ))}
      </Box>

      {/* 現在のページ情報 */}
      {currentPage && (
        <Box mt="lg" p="md" style={{ backgroundColor: currentPage.color, borderRadius: '8px' }}>
          <Text c="white" fw={600} size="lg">
            現在のページ: {currentPage.name}
          </Text>
          <Text c="white" size="sm">
            ID: {currentPage.id}
          </Text>
          <Text c="white" size="sm">
            カラー: {currentPage.color}
          </Text>
        </Box>
      )}
    </Box>
  );
};