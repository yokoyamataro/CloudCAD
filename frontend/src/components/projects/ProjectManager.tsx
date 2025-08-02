import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Box,
  Grid,
  Card,
  Image,
  Badge,
  Stack,
  Modal,
  Tabs
} from '@mantine/core';
import {
  IconPlus,
  IconFolder,
  IconMap,
  IconCalendar,
  IconEdit,
  IconTrash,
  IconEye,
  IconUsers
} from '@tabler/icons-react';
import { ProjectTemplateSelector } from './ProjectTemplateSelector';
import { ProjectCreateForm } from './ProjectCreateForm';
import { ProjectDetail } from './ProjectDetail';
import type { Project } from '../../types/project';

interface ProjectManagerProps {
  onProjectSelect: (project: Project) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');

  // サンプルプロジェクトデータ
  const sampleProjects: Project[] = [
    {
      id: '1',
      name: '渋谷区神宮前地区調査',
      description: '都市部住宅密集地域の地籍調査',
      templateId: 'urban-residential',
      template: {
        id: 'urban-residential',
        name: '都市部住宅地調査',
        description: '住宅密集地域の地籍調査プロジェクト',
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop',
        category: 'urban',
        features: ['高密度住宅', '狭小敷地'],
        defaultSettings: {
          coordinateSystem: 'JGD2011',
          scale: '1:500',
          units: 'メートル'
        }
      },
      location: {
        address: '東京都渋谷区神宮前',
        prefecture: '東京都',
        city: '渋谷区'
      },
      settings: {
        coordinateSystem: 'JGD2011',
        scale: '1:500',
        units: 'メートル'
      },
      cadData: [],
      coordinateData: [],
      status: 'in_progress',
      createdAt: '2024-01-15T09:00:00Z',
      createdBy: '1',
      members: [
        {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          role: 'admin'
        },
        {
          id: '2',
          name: '佐藤花子',
          email: 'sato@example.com',
          role: 'editor'
        },
        {
          id: '3',
          name: '山田次郎',
          email: 'yamada@example.com',
          role: 'viewer'
        }
      ]
    }
  ];

  const allProjects = [...projects, ...sampleProjects];

  const handleCreateProject = (projectData: Partial<Project>) => {
    const newProject: Project = {
      id: Date.now().toString(),
      ...projectData,
      cadData: [],
      coordinateData: [],
      status: 'planning',
      createdAt: new Date().toISOString(),
      createdBy: '1',
      members: [
        {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          role: 'admin'
        }
      ]
    } as Project;

    setProjects([...projects, newProject]);
    setShowCreateModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'blue';
      case 'in_progress': return 'yellow';
      case 'review': return 'orange';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '計画中';
      case 'in_progress': return '実施中';
      case 'review': return 'レビュー中';
      case 'completed': return '完了';
      default: return '不明';
    }
  };

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onUpdate={(updatedProject) => {
          setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
          setSelectedProject(updatedProject);
        }}
      />
    );
  }

  return (
    <Container size="xl" py={20}>
      {/* ヘッダー */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Group justify="space-between">
          <Group>
            <IconFolder size={32} color="blue" />
            <div>
              <Title order={2}>プロジェクト管理</Title>
              <Text size="sm" c="dimmed">地籍調査プロジェクトの作成・管理</Text>
            </div>
          </Group>
          <Group>
            <Button 
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              新規プロジェクト作成
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* タブナビゲーション */}
      <Tabs value={activeTab} onChange={setActiveTab} mb={20}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconFolder size={16} />}>
            すべて ({allProjects.length})
          </Tabs.Tab>
          <Tabs.Tab value="in_progress" leftSection={<IconMap size={16} />}>
            実施中 ({allProjects.filter(p => p.status === 'in_progress').length})
          </Tabs.Tab>
          <Tabs.Tab value="completed" leftSection={<IconCalendar size={16} />}>
            完了 ({allProjects.filter(p => p.status === 'completed').length})
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* プロジェクト一覧 */}
      <Grid>
        {allProjects.map((project) => (
          <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={project.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                <Image
                  src={project.template.image}
                  height={160}
                  alt={project.name}
                />
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500} size="lg" truncate>
                  {project.name}
                </Text>
                <Badge color={getStatusColor(project.status)} variant="light">
                  {getStatusLabel(project.status)}
                </Badge>
              </Group>

              <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                {project.description}
              </Text>

              <Stack gap="xs" mb="md">
                <Group gap="xs">
                  <Text size="xs" c="dimmed">場所:</Text>
                  <Text size="xs">{project.location.address}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">テンプレート:</Text>
                  <Text size="xs">{project.template.name}</Text>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">作成日:</Text>
                  <Text size="xs">
                    {new Date(project.createdAt).toLocaleDateString('ja-JP')}
                  </Text>
                </Group>
              </Stack>

              <Stack gap="xs">
                <Button
                  variant="filled"
                  size="sm"
                  leftSection={<IconEye size={16} />}
                  onClick={() => onProjectSelect(project)}
                  fullWidth
                >
                  編集
                </Button>
                <Group gap="xs" grow>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                    color="red"
                  >
                    削除
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {allProjects.length === 0 && (
        <Paper shadow="sm" p={40} withBorder ta="center">
          <IconFolder size={48} color="gray" style={{ margin: '0 auto 16px' }} />
          <Title order={3} c="dimmed" mb="sm">
            プロジェクトがありません
          </Title>
          <Text c="dimmed" mb="lg">
            新しいプロジェクトを作成して地籍調査を開始しましょう
          </Text>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowCreateModal(true)}
          >
            最初のプロジェクトを作成
          </Button>
        </Paper>
      )}

      {/* プロジェクト作成モーダル */}
      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規プロジェクト作成"
        size="lg"
      >
        <ProjectCreateForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </Container>
  );
};