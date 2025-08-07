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
  Tabs,
  Divider,
  ActionIcon,
  Avatar
} from '@mantine/core';
import {
  IconPlus,
  IconFolder,
  IconMap,
  IconCalendar,
  IconEdit,
  IconTrash,
  IconEye,
  IconUsers,
  IconMapPin,
  IconX,
  IconBell,
  IconHistory,
  IconFileText
} from '@tabler/icons-react';
import { ProjectTemplateSelector } from './ProjectTemplateSelector';
import { ProjectCreateForm } from './ProjectCreateForm';
import { ProjectDetail } from './ProjectDetail';
import { ProjectMapViewer } from './ProjectMapViewer';
import { AppHeader } from '../layout/AppHeader';
import type { Project } from '../../types/project';

interface ProjectManagerProps {
  onProjectSelect: (project: Project) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [showAllProjects, setShowAllProjects] = useState(false);

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
          planeRectangularZone: '9',
          scale: '1:500',
          units: 'メートル'
        }
      },
      location: {
        address: '東京都渋谷区神宮前',
        prefecture: '東京都',
        city: '渋谷区',
        coordinates: {
          lat: 35.6698,
          lng: 139.7081
        }
      },
      settings: {
        coordinateSystem: 'JGD2011',
        planeRectangularZone: '9',
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
    },
    {
      id: '2',
      name: '山梨県富士吉田市農地調査',
      description: '農地・林地が混在する山間部地域の地籍調査',
      templateId: 'rural-agricultural',
      template: {
        id: 'rural-agricultural',
        name: '農地・山林調査',
        description: '農地・林地の地籍調査プロジェクト',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=300&fit=crop',
        category: 'rural',
        features: ['農地管理', '山林境界'],
        defaultSettings: {
          coordinateSystem: 'JGD2011',
          planeRectangularZone: '8',
          scale: '1:1000',
          units: 'メートル'
        }
      },
      location: {
        address: '山梨県富士吉田市上吉田',
        prefecture: '山梨県',
        city: '富士吉田市',
        coordinates: {
          lat: 35.4889,
          lng: 138.8057
        }
      },
      settings: {
        coordinateSystem: 'JGD2011',
        planeRectangularZone: '8',
        scale: '1:1000',
        units: 'メートル'
      },
      cadData: [],
      coordinateData: [],
      status: 'completed',
      createdAt: '2023-11-20T08:30:00Z',
      createdBy: '1',
      members: [
        {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          role: 'admin'
        },
        {
          id: '4',
          name: '鈴木一郎',
          email: 'suzuki@example.com',
          role: 'editor'
        }
      ]
    },
    {
      id: '3',
      name: '大阪府大阪市中央区商業地区調査',
      description: '商業施設・オフィスビルが立地する都市商業地域の地籍調査',
      templateId: 'commercial-district',
      template: {
        id: 'commercial-district',
        name: '商業地区調査',
        description: '商業・業務地域の地籍調査プロジェクト',
        image: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=400&h=300&fit=crop',
        category: 'commercial',
        features: ['商業施設', '高層建築'],
        defaultSettings: {
          coordinateSystem: 'JGD2011',
          planeRectangularZone: '9',
          scale: '1:500',
          units: 'メートル'
        }
      },
      location: {
        address: '大阪府大阪市中央区心斎橋',
        prefecture: '大阪府',
        city: '大阪市',
        coordinates: {
          lat: 34.6719,
          lng: 135.5025
        }
      },
      settings: {
        coordinateSystem: 'JGD2011',
        planeRectangularZone: '9',
        scale: '1:500',
        units: 'メートル'
      },
      cadData: [],
      coordinateData: [],
      status: 'review',
      createdAt: '2024-02-10T14:15:00Z',
      createdBy: '1',
      members: [
        {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          role: 'admin'
        },
        {
          id: '5',
          name: '高橋美恵',
          email: 'takahashi@example.com',
          role: 'editor'
        },
        {
          id: '6',
          name: '伊藤健二',
          email: 'ito@example.com',
          role: 'viewer'
        }
      ]
    },
    {
      id: '4',
      name: '北海道札幌市郊外住宅団地調査',
      description: '新興住宅団地エリアの地籍調査プロジェクト',
      templateId: 'suburban-residential',
      template: {
        id: 'suburban-residential',
        name: '郊外住宅地調査',
        description: '住宅団地・郊外住宅地の地籍調査プロジェクト',
        image: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=400&h=300&fit=crop',
        category: 'suburban',
        features: ['新興住宅地', '区画整理'],
        defaultSettings: {
          coordinateSystem: 'JGD2011',
          planeRectangularZone: '9',
          scale: '1:500',
          units: 'メートル'
        }
      },
      location: {
        address: '北海道札幌市清田区平岡',
        prefecture: '北海道',
        city: '札幌市',
        coordinates: {
          lat: 43.0115,
          lng: 141.4415
        }
      },
      settings: {
        coordinateSystem: 'JGD2011',
        planeRectangularZone: '9',
        scale: '1:500',
        units: 'メートル'
      },
      cadData: [],
      coordinateData: [],
      status: 'planning',
      createdAt: '2024-03-05T10:45:00Z',
      createdBy: '1',
      members: [
        {
          id: '1',
          name: '田中太郎',
          email: 'tanaka@example.com',
          role: 'admin'
        },
        {
          id: '7',
          name: '渡辺雅子',
          email: 'watanabe@example.com',
          role: 'editor'
        }
      ]
    }
  ];

  const allProjects = [...projects, ...sampleProjects];
  
  // 表示するプロジェクトを制限
  const displayedProjects = showAllProjects ? allProjects : allProjects.slice(0, 3);

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

  const handleUserMenuClick = (action: 'profile' | 'settings' | 'logout') => {
    switch (action) {
      case 'profile':
        console.log('プロフィール画面を開く');
        break;
      case 'settings':
        console.log('設定画面を開く');
        break;
      case 'logout':
        if (window.confirm('ログアウトしますか？')) {
          console.log('ログアウト処理');
        }
        break;
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
    <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* アプリヘッダー */}
      <AppHeader onUserMenuClick={handleUserMenuClick} />
      
      {/* メインコンテンツ */}
      <Box style={{ display: 'flex', flex: 1 }}>
        {/* 左側：プロジェクト一覧 */}
        <Box style={{ flex: '0 0 60%', overflow: 'auto' }}>
          <Container size="xl" py={20}>

      {/* タブナビゲーション */}
      <Group justify="space-between" align="flex-end" mb={20}>
        <Tabs value={activeTab} onChange={setActiveTab}>
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
        
        <Button 
          leftSection={<IconPlus size={16} />}
          onClick={() => setShowCreateModal(true)}
        >
          新規プロジェクト作成
        </Button>
      </Group>

      {/* プロジェクト一覧 */}
      <Grid>
        {displayedProjects.map((project) => (
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

      {/* すべて表示ボタン */}
      {!showAllProjects && allProjects.length > 3 && (
        <Group justify="center" mt={20}>
          <Button
            variant="light"
            size="sm"
            onClick={() => setShowAllProjects(true)}
            leftSection={<IconEye size={16} />}
          >
            すべてのプロジェクトを表示 ({allProjects.length}件)
          </Button>
        </Group>
      )}

      {/* 折りたたむボタン */}
      {showAllProjects && (
        <Group justify="center" mt={20}>
          <Button
            variant="light"
            size="sm"
            onClick={() => setShowAllProjects(false)}
          >
            表示を折りたたむ
          </Button>
        </Group>
      )}

      {allProjects.length === 0 && (
        <Paper shadow="sm" p={40} withBorder ta="center" mt={20}>
          <IconFolder size={48} color="gray" style={{ margin: '0 auto 16px' }} />
          <Title order={3} c="dimmed" mb="sm">
            プロジェクトがありません
          </Title>
          <Text c="dimmed" mb="lg">
            新しいプロジェクトを作成して地籍調査を開始しましょう
          </Text>
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
          {/* お知らせと作業ログ */}
          <Group gap="lg" grow align="flex-start" mt={30}>
            {/* お知らせ */}
            <Paper shadow="sm" p={20} withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <IconBell size={20} color="#fd7e14" />
                  <Title order={4}>お知らせ</Title>
                </Group>
              </Group>
              <Stack gap="md">
                <Paper p="sm" withBorder bg="yellow.0">
                  <Group gap="sm" align="flex-start">
                    <IconBell size={16} color="#fab005" />
                    <div>
                      <Text size="sm" fw={500} mb={4}>システムメンテナンスのお知らせ</Text>
                      <Text size="xs" c="dimmed" mb="xs">2024/03/15 10:00-12:00</Text>
                      <Text size="sm">定期メンテナンスを実施いたします。作業への影響を最小限に抑えるよう努めます。</Text>
                    </div>
                  </Group>
                </Paper>
                
                <Paper p="sm" withBorder bg="blue.0">
                  <Group gap="sm" align="flex-start">
                    <IconUsers size={16} color="#4c6ef5" />
                    <div>
                      <Text size="sm" fw={500} mb={4}>新機能追加のお知らせ</Text>
                      <Text size="xs" c="dimmed" mb="xs">2024/03/10</Text>
                      <Text size="sm">地図上でのプロジェクト状況表示機能が追加されました。</Text>
                    </div>
                  </Group>
                </Paper>
                
                <Paper p="sm" withBorder>
                  <Group gap="sm" align="flex-start">
                    <IconFileText size={16} color="#6c757d" />
                    <div>
                      <Text size="sm" fw={500} mb={4}>操作マニュアル更新</Text>
                      <Text size="xs" c="dimmed" mb="xs">2024/03/05</Text>
                      <Text size="sm">CADエディタの操作マニュアルを更新いたしました。</Text>
                    </div>
                  </Group>
                </Paper>
              </Stack>
            </Paper>

            {/* 作業ログ */}
            <Paper shadow="sm" p={20} withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <IconHistory size={20} color="#51cf66" />
                  <Title order={4}>最近の作業ログ</Title>
                </Group>
              </Group>
              <Stack gap="sm">
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" color="blue">田</Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb={2}>
                      <Text component="span" fw={500}>田中太郎</Text> さんが 
                      <Text component="span" fw={500} c="blue">渋谷区神宮前地区調査</Text> の
                      <Text component="span" fw={500}>CAD図面</Text> を編集しました
                    </Text>
                    <Text size="xs" c="dimmed">15分前</Text>
                  </div>
                </Group>
                
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" color="teal">佐</Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb={2}>
                      <Text component="span" fw={500}>佐藤花子</Text> さんが 
                      <Text component="span" fw={500} c="blue">大阪府大阪市中央区商業地区調査</Text> の
                      <Text component="span" fw={500}>座標データ</Text> を更新しました
                    </Text>
                    <Text size="xs" c="dimmed">1時間前</Text>
                  </div>
                </Group>
                
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" color="orange">鈴</Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb={2}>
                      <Text component="span" fw={500}>鈴木一郎</Text> さんが 
                      <Text component="span" fw={500} c="blue">山梨県富士吉田市農地調査</Text> の
                      <Text component="span" fw={500}>レビュー</Text> を完了しました
                    </Text>
                    <Text size="xs" c="dimmed">2時間前</Text>
                  </div>
                </Group>
                
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" color="grape">高</Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb={2}>
                      <Text component="span" fw={500}>高橋美恵</Text> さんが 
                      <Text component="span" fw={500} c="blue">北海道札幌市郊外住宅団地調査</Text> を
                      <Text component="span" fw={500}>新規作成</Text> しました
                    </Text>
                    <Text size="xs" c="dimmed">3時間前</Text>
                  </div>
                </Group>
                
                <Group gap="sm" align="flex-start">
                  <Avatar size="sm" color="cyan">山</Avatar>
                  <div style={{ flex: 1 }}>
                    <Text size="sm" mb={2}>
                      <Text component="span" fw={500}>山田次郎</Text> さんが 
                      <Text component="span" fw={500} c="blue">渋谷区神宮前地区調査</Text> の
                      <Text component="span" fw={500}>プロジェクト設定</Text> を変更しました
                    </Text>
                    <Text size="xs" c="dimmed">4時間前</Text>
                  </div>
                </Group>
              </Stack>
            </Paper>
          </Group>
          
          </Container>
        </Box>

        {/* 右側：地図パネル */}
        <Box style={{ flex: '0 0 40%', borderLeft: '1px solid #e0e0e0' }}>
          <Paper shadow="sm" p={16} withBorder style={{ height: showAllProjects ? 'auto' : '600px' }}>
            <Group justify="space-between" mb="md">
              <Group>
                <IconMap size={20} color="blue" />
                <Title order={4}>プロジェクト地図</Title>
              </Group>
            </Group>

            <Box style={{ height: showAllProjects ? '600px' : 'calc(100% - 60px)' }}>
              <ProjectMapViewer 
                projects={allProjects} 
                onProjectSelect={onProjectSelect}
              />
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};