import React from 'react';
import {
  Box,
  Container,
  Paper,
  Title,
  Button,
  Group,
  ActionIcon
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { AppHeader } from './layout/AppHeader';
import type { Project } from '../types/project';

interface TeamAndTaskManagerProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate: (project: Project) => void;
}

export const TeamAndTaskManagerSimple: React.FC<TeamAndTaskManagerProps> = ({
  project,
  onBack,
  onProjectUpdate
}) => {
  const handleUserMenuClick = (action: 'profile' | 'settings' | 'logout') => {
    console.log(`User menu action: ${action}`);
  };

  return (
    <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader onUserMenuClick={handleUserMenuClick} />
      
      <Container size="xl" style={{ flex: 1 }} py="md">
        <Paper shadow="sm" p="lg" mb="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Group>
              <ActionIcon variant="light" onClick={onBack}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Title order={2}>{project.name}</Title>
            </Group>
          </Group>
        </Paper>

        <Paper shadow="sm" p="lg" withBorder>
          <Title order={3}>チーム・タスク管理画面</Title>
          <p>プロジェクト: {project.name}</p>
          <p>説明: {project.description}</p>
          <p>メンバー数: {project.members?.length || 0}</p>
          
          <Group mt="md">
            <Button onClick={onBack}>
              戻る
            </Button>
          </Group>
        </Paper>
      </Container>
    </Box>
  );
};