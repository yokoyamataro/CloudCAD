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
  Badge,
  Stack,
  Tabs,
  Table,
  ActionIcon,
  Modal,
  FileInput,
  Select,
  TextInput,
  Textarea,
  NumberInput,
  Progress,
  Tooltip
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconPlus,
  IconFile,
  IconMap,
  IconUpload,
  IconDownload,
  IconEye,
  IconSettings,
  IconMapPins,
  IconNumbers,
  IconUsers,
  IconMap2,
  IconPhotoSquareRounded,
  IconList,
  IconSettings2,
  IconChecklist,
  IconClock,
  IconCalendar,
  IconAlertCircle,
  IconCheck,
  IconHome
} from '@tabler/icons-react';
import type { Project, CADData, CoordinateData } from '../../types/project';
import { CoordinateLotViewer } from '../viewer/CoordinateLotViewer';
import { 
  generateSimpleCoordinateData, 
  generateLotData, 
  type CoordinatePoint as MockCoordinatePoint,
  type LotData as MockLotData
} from '../../utils/mockDataGenerator';
import { ProjectEditForm } from './ProjectEditForm';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
  onEditMode?: (mode: 'cad' | 'coordinate' | 'lot') => void;
  onTeamManagement?: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onUpdate,
  onEditMode,
  onTeamManagement
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'cad' | 'coordinate'>('cad');
  const [showEditModal, setShowEditModal] = useState(false);
  const [cadViewMode, setCADViewMode] = useState<'thumbnail' | 'list'>('thumbnail');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [members, setMembers] = useState(project.members);
  
  // インライン編集状態管理
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // アクティブビュー状態
  const [activeView, setActiveView] = useState<'overview' | 'members' | 'tasks' | 'settings'>('overview');
  
  // 座標・地番データ（CoordinateEditorと同じデータを使用）
  const [coordinateData, setCoordinateData] = useState(() => {
    const data = generateSimpleCoordinateData();
    console.log('Generated coordinate data:', data);
    return data;
  });
  const [lotData] = useState(() => {
    const data = generateLotData();
    console.log('Generated lot data:', data);
    return data;
  });
  
  // サンプルタスクデータ
  const sampleTasks = [
    {
      id: '1',
      title: '測量現地作業（A地区）',
      description: '基準点測量および境界点確認',
      status: 'pending',
      priority: 'high',
      assignee: '田中太郎',
      dueDate: '2024-02-15',
      category: 'survey',
      progress: 0
    },
    {
      id: '2', 
      title: 'CAD図面作成（区画1-3）',
      description: '測量成果をもとに地形図作成',
      status: 'in_progress',
      priority: 'medium',
      assignee: '佐藤花子',
      dueDate: '2024-02-20',
      category: 'cad',
      progress: 60
    },
    {
      id: '3',
      title: '座標計算点検',
      description: '測量座標データの精度確認',
      status: 'completed',
      priority: 'high',
      assignee: '山田一郎',
      dueDate: '2024-02-10',
      category: 'calculation',
      progress: 100
    },
    {
      id: '4',
      title: '成果品提出準備',
      description: '図面・計算書・報告書の最終確認',
      status: 'pending',
      priority: 'medium',
      assignee: '鈴木美子',
      dueDate: '2024-02-25',
      category: 'delivery',
      progress: 0
    }
  ];

  const [tasks, setTasks] = useState(sampleTasks);

  // タスク編集関数
  const handleTaskEdit = (task: any) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleTaskAdd = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleTaskSave = (taskData: any) => {
    if (editingTask) {
      // 編集の場合
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? { ...task, ...taskData } : task
      ));
    } else {
      // 新規追加の場合
      const newTask = {
        id: Date.now().toString(),
        ...taskData
      };
      setTasks(prev => [...prev, newTask]);
    }
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  // インライン編集関数
  const startInlineEdit = (taskId: string, field: string, currentValue: string) => {
    setEditingTaskId(taskId);
    setEditingField(field);
    setEditingValue(currentValue);
  };

  const saveInlineEdit = () => {
    if (editingTaskId && editingField) {
      setTasks(prev => prev.map(task => 
        task.id === editingTaskId 
          ? { ...task, [editingField]: editingValue }
          : task
      ));
    }
    cancelInlineEdit();
  };

  const cancelInlineEdit = () => {
    setEditingTaskId(null);
    setEditingField(null);
    setEditingValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveInlineEdit();
    } else if (e.key === 'Escape') {
      cancelInlineEdit();
    }
  };

  // メンバー管理関数
  const handleMemberEdit = (member: any) => {
    setEditingMember(member);
    setShowMemberModal(true);
  };

  const handleMemberAdd = () => {
    setEditingMember(null);
    setShowMemberModal(true);
  };

  const handleMemberSave = (memberData: any) => {
    if (editingMember) {
      // 編集の場合
      setMembers(prev => prev.map(member => 
        member.id === editingMember.id ? { ...member, ...memberData } : member
      ));
    } else {
      // 新規追加の場合
      const newMember = {
        id: Date.now().toString(),
        ...memberData
      };
      setMembers(prev => [...prev, newMember]);
    }
    setShowMemberModal(false);
    setEditingMember(null);
  };

  const handleMemberDelete = (memberId: string) => {
    setMembers(prev => prev.filter(member => member.id !== memberId));
  };

  // 新しい座標点を追加する関数
  const handleAddCoordinate = (newCoord: { x: number; y: number; lat: number; lng: number }) => {
    const newId = (coordinateData.length + 1).toString();
    const newPointName = `NEW-${String(coordinateData.length + 1).padStart(3, '0')}`;
    
    const newCoordinatePoint = {
      id: newId,
      pointName: newPointName,
      type: 'boundary_point' as const,
      x: newCoord.x,
      y: newCoord.y,
      z: 50.0, // デフォルト標高
      description: `新規追加点${coordinateData.length + 1}号`,
      surveyDate: new Date().toISOString().split('T')[0],
      assignee: '未割当',
      status: '測量中'
    };

    console.log('Adding new coordinate point:', newCoordinatePoint);
    setCoordinateData(prev => [...prev, newCoordinatePoint]);
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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'gray';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  };

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '未着手';
      case 'in_progress': return '作業中';
      case 'completed': return '完了';
      case 'overdue': return '遅延';
      default: return '不明';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'survey': return <IconMapPins size={16} />;
      case 'cad': return <IconSettings size={16} />;
      case 'calculation': return <IconNumbers size={16} />;
      case 'delivery': return <IconFile size={16} />;
      default: return <IconChecklist size={16} />;
    }
  };

  const handleFileUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const newId = Date.now().toString();

    if (uploadType === 'cad') {
      const newCADData: CADData = {
        id: newId,
        name: file.name,
        type: 'drawing',
        format: file.name.endsWith('.sxf') ? 'sxf' : file.name.endsWith('.dxf') ? 'dxf' : 'dwg',
        filePath: URL.createObjectURL(file),
        elements: [],
        layers: [],
        createdAt: new Date().toISOString()
      };

      const updatedProject = {
        ...project,
        cadData: [...project.cadData, newCADData],
        updatedAt: new Date().toISOString()
      };

      onUpdate(updatedProject);
    }

    setShowUploadModal(false);
  };

  const handleProjectEdit = (updatedProject: Partial<Project>) => {
    const updatedProjectData: Project = {
      ...project,
      ...updatedProject,
      updatedAt: new Date().toISOString()
    };
    onUpdate(updatedProjectData);
    setShowEditModal(false);
  };

  const sampleCADData: CADData[] = [
    {
      id: '1',
      name: '基盤地図.sxf',
      type: 'drawing',
      format: 'sxf',
      elements: [],
      layers: [],
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: '境界線図.dxf',
      type: 'survey',
      format: 'dxf',
      elements: [],
      layers: [],
      createdAt: '2024-01-16T14:30:00Z'
    }
  ];

  const sampleCoordinateData: CoordinateData[] = [
    {
      id: '1',
      name: '基準点A',
      type: 'benchmark',
      coordinates: {
        x: 35.6762,
        y: 139.6503,
        z: 25.5,
        system: 'JGD2011'
      },
      accuracy: '±0.01m',
      description: '三角点',
      createdAt: '2024-01-15T09:00:00Z'
    },
    {
      id: '2',
      name: '境界点01',
      type: 'boundary_point',
      coordinates: {
        x: 35.6765,
        y: 139.6508,
        system: 'JGD2011'
      },
      accuracy: '±0.02m',
      createdAt: '2024-01-15T11:15:00Z'
    }
  ];

  const allCADData = [...project.cadData, ...sampleCADData];
  const allCoordinateData = [...project.coordinateData, ...sampleCoordinateData];

  // 座標・地番編集モードを開く
  const handleCoordinateMode = () => {
    onEditMode('coordinate');
  };

  const handleLotMode = () => {
    onEditMode('lot');
  };

  return (
    <div>
      {/* カスタムプロジェクト編集モーダル */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Paper
            shadow="xl"
            p="xl"
            style={{
              width: '600px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 4000
            }}
          >
            <Group justify="space-between" mb="lg">
              <Title order={3}>プロジェクト編集</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => {
                  console.log('閉じるボタンがクリックされました');
                  setShowEditModal(false);
                }}
              >
                ×
              </Button>
            </Group>
            
            <ProjectEditForm
              project={project}
              onSubmit={handleProjectEdit}
              onCancel={() => setShowEditModal(false)}
            />
          </Paper>
        </div>
      )}

      <div style={{ display: 'flex', position: 'relative' }}>
        {/* 永続的な左サイドバー */}
        <Paper
          shadow="sm"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            width: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            gap: '8px',
            zIndex: 100,
            backgroundColor: '#f8f9fa',
            borderRight: '1px solid #dee2e6'
          }}
        >
          {/* 戻るボタン */}
          <Tooltip label="戻る" position="right" withArrow>
            <ActionIcon 
              variant="light" 
              size="lg"
              onClick={onBack}
              style={{ margin: '10px 0' }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
          </Tooltip>

          {/* ホームボタン */}
          <Tooltip label="プロジェクトトップ" position="right" withArrow>
            <ActionIcon 
              variant="light" 
              size="lg"
              onClick={() => setActiveView('overview')}
              style={{ margin: '5px 0' }}
            >
              <IconHome size={20} />
            </ActionIcon>
          </Tooltip>

          {/* セパレーター */}
          <div style={{ width: '30px', height: '1px', backgroundColor: '#dee2e6', margin: '5px 0' }} />

          {/* 概要 */}
          <Tooltip label="概要" position="right" withArrow>
            <ActionIcon
              variant={activeView === 'overview' ? 'filled' : 'light'}
              size="lg"
              onClick={() => setActiveView('overview')}
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Tooltip>

          {/* メンバー管理 */}
          <Tooltip label="メンバー管理" position="right" withArrow>
            <ActionIcon
              variant={activeView === 'members' ? 'filled' : 'light'}
              size="lg"
              onClick={() => setActiveView('members')}
            >
              <IconUsers size={20} />
            </ActionIcon>
          </Tooltip>

          {/* タスク管理 */}
          <Tooltip label="タスク管理" position="right" withArrow>
            <ActionIcon
              variant={activeView === 'tasks' ? 'filled' : 'light'}
              size="lg"
              onClick={() => setActiveView('tasks')}
            >
              <IconChecklist size={20} />
            </ActionIcon>
          </Tooltip>

          {/* 座標編集 */}
          <Tooltip label="座標編集" position="right" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleCoordinateMode}
            >
              <IconMapPins size={20} />
            </ActionIcon>
          </Tooltip>

          {/* 地番編集 */}
          <Tooltip label="地番編集" position="right" withArrow>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={handleLotMode}
            >
              <IconMap2 size={20} />
            </ActionIcon>
          </Tooltip>

          {/* セパレーター */}
          <div style={{ width: '30px', height: '1px', backgroundColor: '#dee2e6', margin: '5px 0' }} />

          {/* 設定 */}
          <Tooltip label="設定" position="right" withArrow>
            <ActionIcon
              variant={activeView === 'settings' ? 'filled' : 'light'}
              size="lg"
              onClick={() => setActiveView('settings')}
            >
              <IconSettings2 size={20} />
            </ActionIcon>
          </Tooltip>
        </Paper>

        <div style={{ flex: 1, marginRight: '33.333vw', marginLeft: '60px' }}>
          <Container 
            size="xl" 
            py={20} 
            style={{ 
              paddingLeft: '20px'
            }}
          >
          {/* ヘッダー */}
          {activeView === 'overview' && (
            <>
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Group justify="space-between">
          <Group>
            <div>
              <Group gap="sm" align="center">
                <Title order={2}>{project.name}</Title>
                <Badge color={getStatusColor(project.status)} variant="light">
                  {getStatusLabel(project.status)}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">{project.description}</Text>
              
              {/* プロジェクト基本情報 */}
              <Grid mt="md" gutter="md">
                <Grid.Col span={4}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="xs" fw={500} c="dimmed">調査地域:</Text>
                      <Text size="xs">{project.location.address}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" fw={500} c="dimmed">座標系:</Text>
                      <Text size="xs">{project.settings.coordinateSystem}</Text>
                    </Group>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="xs" fw={500} c="dimmed">テンプレート:</Text>
                      <Text size="xs">{project.template.name}</Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" fw={500} c="dimmed">作成日:</Text>
                      <Text size="xs">{new Date(project.createdAt).toLocaleDateString('ja-JP')}</Text>
                    </Group>
                  </Stack>
                </Grid.Col>
                <Grid.Col span={4}>
                  <Stack gap="xs">
                    <Group gap="xs">
                      <Text size="xs" fw={500} c="dimmed">データ統計:</Text>
                    </Group>
                    <Group gap="xs">
                      <Badge size="xs" variant="outline">CAD: {allCADData.length}件</Badge>
                      <Badge size="xs" variant="outline">座標: 1000点</Badge>
                    </Group>
                  </Stack>
                </Grid.Col>
              </Grid>
            </div>
          </Group>
          <Group>
            <Button 
              variant="light" 
              leftSection={<IconEdit size={16} />}
              onClick={() => {
                console.log('編集ボタンがクリックされました');
                setShowEditModal(true);
                console.log('showEditModal が true に設定されました');
              }}
            >
              編集
            </Button>
            <Button 
              leftSection={<IconUpload size={16} />}
              onClick={() => setShowUploadModal(true)}
            >
              データアップロード
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* メンバーとタスクの管理概要 - サイドメニューで詳細管理 */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Group gap="sm" align="center">
                <IconChecklist size={24} color="#228be6" />
                <Title order={3}>メンバーとタスクの管理</Title>
              </Group>
              <Text size="sm" c="dimmed">
                左メニューからメンバー管理・タスク管理にアクセスできます
              </Text>
            </div>
            <Group>
              <Button 
                variant="light" 
                size="sm" 
                leftSection={<IconUsers size={16} />} 
                onClick={() => setActiveView('members')}
              >
                メンバー管理
              </Button>
              {onTeamManagement && (
                <Button 
                  variant="filled" 
                  size="sm" 
                  leftSection={<IconChecklist size={16} />}
                  onClick={onTeamManagement}
                >
                  チーム・タスク管理
                </Button>
              )}
              <Button 
                size="sm" 
                leftSection={<IconChecklist size={16} />} 
                onClick={() => setActiveView('tasks')}
              >
                タスク管理
              </Button>
            </Group>
          </Group>

          {/* メンバー・タスク統計概要 */}
          <Group justify="space-between">
            <Group gap="md">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="blue">{members.length}</Text>
                <Text size="xs" c="dimmed">メンバー</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="green">{tasks.filter(t => t.status === 'completed').length}</Text>
                <Text size="xs" c="dimmed">完了タスク</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="yellow">{tasks.filter(t => t.status === 'in_progress').length}</Text>
                <Text size="xs" c="dimmed">作業中</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="gray">{tasks.filter(t => t.status === 'pending').length}</Text>
                <Text size="xs" c="dimmed">未着手</Text>
              </div>
            </Group>
            <Text size="sm" c="dimmed">
              全体進捗: {Math.round((tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length))}%
            </Text>
          </Group>
        </Stack>
      </Paper>

      {/* 座標・地番編集メニュー */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>座標・地番編集</Title>
              <Text size="sm" c="dimmed">
                座標データと地番データの編集を行います
              </Text>
            </div>
            <Group>
              <Button 
                variant="light" 
                color="orange"
                leftSection={<IconMapPins size={16} />}
                onClick={handleCoordinateMode}
              >
                座標編集
              </Button>
              <Button 
                variant="light" 
                color="teal"
                leftSection={<IconMap2 size={16} />}
                onClick={handleLotMode}
              >
                地番編集
              </Button>
            </Group>
          </Group>
          
          {/* データ統計概要 */}
          <Group justify="space-between">
            <Group gap="md">
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="orange">{coordinateData.length}</Text>
                <Text size="xs" c="dimmed">座標点</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="teal">{lotData.length}</Text>
                <Text size="xs" c="dimmed">地番</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text size="xl" fw={700} c="gray">{coordinateData.filter(c => c.status === '検査済み').length}</Text>
                <Text size="xs" c="dimmed">検査済み</Text>
              </div>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* CADメニュー */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <div>
              <Title order={3}>CADメニュー</Title>
              <Text size="sm" c="dimmed">
                CADデータの表示・編集・管理を行います
              </Text>
            </div>
            <Group>
              <Button
                variant={cadViewMode === 'thumbnail' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setCADViewMode('thumbnail')}
                leftSection={<IconPhotoSquareRounded size={16} />}
              >
                サムネイル表示
              </Button>
              <Button
                variant={cadViewMode === 'list' ? 'filled' : 'light'}
                size="sm"
                onClick={() => setCADViewMode('list')}
                leftSection={<IconList size={16} />}
              >
                詳細表示
              </Button>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconSettings2 size={16} />}
              >
                CAD設定
              </Button>
            </Group>
          </Group>

          {cadViewMode === 'thumbnail' ? (
            <Grid>
              {allCADData.map((cadData) => (
                <Grid.Col key={cadData.id} span={4}>
                  <Card
                    withBorder
                    p="md"
                    radius="md"
                    style={{ height: '200px', cursor: 'pointer' }}
                    onClick={() => onEditMode('cad')}
                  >
                    <Stack align="center" gap="sm" style={{ height: '100%' }}>
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed #dee2e6'
                        }}
                      >
                        <IconFile size={32} color="#868e96" />
                      </div>
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <Text fw={600} size="sm" truncate>
                          {cadData.name}
                        </Text>
                        <Text size="xs" c="dimmed" mt={8}>
                          {new Date(cadData.createdAt).toLocaleDateString('ja-JP')}
                        </Text>
                      </div>
                      <Button
                        size="xs"
                        fullWidth
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMode('cad');
                        }}
                      >
                        編集
                      </Button>
                    </Stack>
                  </Card>
                </Grid.Col>
              ))}
              <Grid.Col span={4}>
                <Card
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    height: '200px',
                    cursor: 'pointer',
                    border: '2px dashed #dee2e6'
                  }}
                  onClick={() => onEditMode('cad')}
                >
                  <Stack align="center" justify="center" style={{ height: '100%' }}>
                    <IconPlus size={48} color="#868e96" />
                    <Text size="sm" c="dimmed" ta="center">
                      新しいCADファイルを
                      <br />
                      追加
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ファイル名</Table.Th>
                  <Table.Th>種類</Table.Th>
                  <Table.Th>サイズ</Table.Th>
                  <Table.Th>作成日</Table.Th>
                  <Table.Th>最終更新</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {allCADData.map((cadData) => (
                  <Table.Tr key={cadData.id} style={{ cursor: 'pointer' }}>
                    <Table.Td>
                      <Group gap="sm">
                        <IconFile size={20} color="#868e96" />
                        <div>
                          <Text fw={600} size="sm">
                            {cadData.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            レイヤー: {cadData.layers.length}個
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {cadData.type === 'drawing' ? '図面' : 
                         cadData.type === 'survey' ? '測量' : '設計図'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">2.3 MB</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(cadData.createdAt).toLocaleDateString('ja-JP')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(cadData.createdAt).toLocaleDateString('ja-JP')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => onEditMode('cad')}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="gray">
                          <IconEye size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="gray">
                          <IconDownload size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="red">
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          {allCADData.length === 0 && (
            <Box ta="center" py={40}>
              <IconFile size={48} color="gray" style={{ margin: '0 auto 16px' }} />
              <Text c="dimmed" mb="md">CADデータがありません</Text>
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={() => onEditMode('cad')}
              >
                新しいCADファイルを作成
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
            </>
          )}

          {/* メンバー・タスク統合管理ビュー */}
          {(activeView === 'members' || activeView === 'tasks') && (
            <Stack gap="lg">
              {/* メンバー管理セクション */}
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Title order={3}>メンバー管理</Title>
                    <Button leftSection={<IconPlus size={16} />} onClick={handleMemberAdd}>
                      メンバー追加
                    </Button>
                  </Group>
                  
                  <MemberManagement
                    members={members}
                    onMemberSave={handleMemberSave}
                    onMemberDelete={handleMemberDelete}
                    onMemberEdit={handleMemberEdit}
                    onMemberAdd={handleMemberAdd}
                    onClose={() => setActiveView('overview')}
                  />
                </Stack>
              </Paper>

              {/* タスク管理セクション */}
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <div>
                      <Title order={3}>タスク管理</Title>
                      <Text size="sm" c="dimmed">
                        各項目をクリックして直接編集できます
                      </Text>
                    </div>
                    <Button leftSection={<IconPlus size={16} />} onClick={handleTaskAdd}>
                      タスク追加
                    </Button>
                  </Group>

                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>タスク名</Table.Th>
                        <Table.Th>担当者</Table.Th>
                        <Table.Th>ステータス</Table.Th>
                        <Table.Th>優先度</Table.Th>
                        <Table.Th>期限</Table.Th>
                        <Table.Th>進捗</Table.Th>
                        <Table.Th>操作</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {tasks.map((task) => (
                        <Table.Tr key={task.id}>
                          <Table.Td>
                            <div>
                              <Group gap="xs">
                                {getCategoryIcon(task.category)}
                                {editingTaskId === task.id && editingField === 'title' ? (
                                  <TextInput
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    onBlur={saveInlineEdit}
                                    size="xs"
                                    autoFocus
                                    style={{ minWidth: '200px' }}
                                  />
                                ) : (
                                  <Text 
                                    fw={600} 
                                    size="sm" 
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => startInlineEdit(task.id, 'title', task.title)}
                                  >
                                    {task.title}
                                  </Text>
                                )}
                              </Group>
                              {editingTaskId === task.id && editingField === 'description' ? (
                                <Textarea
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={handleKeyPress}
                                  onBlur={saveInlineEdit}
                                  size="xs"
                                  autoFocus
                                  mt={4}
                                  autosize
                                  minRows={1}
                                  maxRows={3}
                                />
                              ) : (
                                <Text 
                                  size="xs" 
                                  c="dimmed" 
                                  mt={4}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => startInlineEdit(task.id, 'description', task.description)}
                                >
                                  {task.description}
                                </Text>
                              )}
                            </div>
                          </Table.Td>
                          <Table.Td>
                            {editingTaskId === task.id && editingField === 'assignee' ? (
                              <Select
                                value={editingValue}
                                onChange={(value) => {
                                  setEditingValue(value || '');
                                  setTimeout(saveInlineEdit, 100);
                                }}
                                data={members.map(m => m.name)}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startInlineEdit(task.id, 'assignee', task.assignee)}
                              >
                                {task.assignee}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingTaskId === task.id && editingField === 'status' ? (
                              <Select
                                value={editingValue}
                                onChange={(value) => {
                                  setEditingValue(value || '');
                                  setTimeout(saveInlineEdit, 100);
                                }}
                                data={[
                                  { value: 'pending', label: '未着手' },
                                  { value: 'in_progress', label: '進行中' },
                                  { value: 'completed', label: '完了' }
                                ]}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getTaskStatusColor(task.status)} 
                                variant="light"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startInlineEdit(task.id, 'status', task.status)}
                              >
                                {getTaskStatusLabel(task.status)}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingTaskId === task.id && editingField === 'priority' ? (
                              <Select
                                value={editingValue}
                                onChange={(value) => {
                                  setEditingValue(value || '');
                                  setTimeout(saveInlineEdit, 100);
                                }}
                                data={[
                                  { value: 'high', label: '高' },
                                  { value: 'medium', label: '中' },
                                  { value: 'low', label: '低' }
                                ]}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getPriorityColor(task.priority)} 
                                variant="outline" 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startInlineEdit(task.id, 'priority', task.priority)}
                              >
                                {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingTaskId === task.id && editingField === 'dueDate' ? (
                              <TextInput
                                type="date"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                onBlur={saveInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startInlineEdit(task.id, 'dueDate', task.dueDate)}
                              >
                                {task.dueDate}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            <div style={{ width: '80px' }}>
                              {editingTaskId === task.id && editingField === 'progress' ? (
                                <NumberInput
                                  value={parseInt(editingValue)}
                                  onChange={(value) => setEditingValue(value?.toString() || '0')}
                                  onKeyDown={handleKeyPress}
                                  onBlur={saveInlineEdit}
                                  min={0}
                                  max={100}
                                  size="xs"
                                  autoFocus
                                  suffix="%"
                                />
                              ) : (
                                <div onClick={() => startInlineEdit(task.id, 'progress', task.progress.toString())}>
                                  <Progress 
                                    value={task.progress} 
                                    size="sm" 
                                    style={{ cursor: 'pointer' }} 
                                  />
                                  <Text size="xs" ta="center" style={{ cursor: 'pointer' }}>
                                    {task.progress}%
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon
                                variant="light"
                                color="red"
                                onClick={() => handleTaskDelete(task.id)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Paper>
            </Stack>
          )}


          {/* 設定ビュー */}
          {activeView === 'settings' && (
            <Paper shadow="sm" p={20} withBorder>
              <Stack gap="md">
                <Title order={3}>プロジェクト設定</Title>
                <Text c="dimmed">プロジェクトの設定を変更できます。</Text>
                <Button
                  leftSection={<IconEdit size={16} />}
                  onClick={() => setShowEditModal(true)}
                >
                  プロジェクト編集
                </Button>
              </Stack>
            </Paper>
          )}

        </Container>
        </div>

      {/* アップロードモーダル */}
      <Modal
        opened={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={uploadType === 'cad' ? 'CADファイルアップロード' : '座標データアップロード'}
      >
        <Stack>
          <Select
            label="データ種別"
            value={uploadType}
            onChange={(value) => setUploadType(value as 'cad' | 'coordinate')}
            data={[
              { value: 'cad', label: 'CADファイル' },
              { value: 'coordinate', label: '座標データ' }
            ]}
          />
          
          <FileInput
            label="ファイル選択"
            placeholder="ファイルを選択してください"
            accept={uploadType === 'cad' ? '.sxf,.dxf,.dwg' : '.csv,.txt'}
            onChange={handleFileUpload}
          />
          
          <Text size="xs" c="dimmed">
            {uploadType === 'cad' 
              ? '対応形式: SXF, DXF, DWG' 
              : '対応形式: CSV, TXT'
            }
          </Text>
        </Stack>
      </Modal>

      {/* タスク編集モーダル */}
      {showTaskModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '50px'
          }}
          onClick={() => setShowTaskModal(false)}
        >
          <Paper
            shadow="xl"
            p="xl"
            style={{
              width: '800px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 4000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Group justify="space-between" mb="lg">
              <Title order={3}>{editingTask ? 'タスク編集' : 'タスク追加'}</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setShowTaskModal(false)}
              >
                ×
              </Button>
            </Group>
            
            <TaskForm
              task={editingTask}
              onSave={handleTaskSave}
              onCancel={() => setShowTaskModal(false)}
              onDelete={editingTask ? () => {
                handleTaskDelete(editingTask.id);
                setShowTaskModal(false);
                setEditingTask(null);
              } : undefined}
              projectMembers={members}
            />
          </Paper>
        </div>
      )}

      {/* メンバー変更モーダル */}
      {showMemberModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '50px'
          }}
          onClick={() => setShowMemberModal(false)}
        >
          <Paper
            shadow="xl"
            p="xl"
            style={{
              width: '1000px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 4000
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Group justify="space-between" mb="lg">
              <Title order={3}>メンバー管理</Title>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => setShowMemberModal(false)}
              >
                ×
              </Button>
            </Group>
            
            <MemberManagement
              members={members}
              onMemberSave={handleMemberSave}
              onMemberDelete={handleMemberDelete}
              onMemberEdit={handleMemberEdit}
              onMemberAdd={handleMemberAdd}
              onClose={() => setShowMemberModal(false)}
            />
          </Paper>
        </div>
      )}

        {/* 右側のビューワー */}
        <CoordinateLotViewer 
          project={project}
          coordinates={coordinateData.map(coord => ({
            id: coord.id,
            pointName: coord.pointName,
            x: coord.x,
            y: coord.y,
            z: coord.z,
            type: coord.type as 'benchmark' | 'control_point' | 'boundary_point',
            visible: true
          }))}
          lots={lotData.map(lot => ({
            id: lot.id,
            lotNumber: lot.lotNumber,
            landCategory: lot.landCategory,
            area: lot.area,
            coordinates: lot.coordinates,
            visible: true
          }))}
          onCoordinateClick={(coord) => {
            console.log('座標点クリック:', coord.pointName);
          }}
          onLotClick={(lot) => {
            console.log('地番クリック:', lot.lotNumber);
          }}
          onAddCoordinate={handleAddCoordinate}
        />
      </div>
    </div>
  );
};

// メンバー管理コンポーネント
const MemberManagement: React.FC<{
  members: any[];
  onMemberSave: (data: any) => void;
  onMemberDelete: (id: string) => void;
  onMemberEdit: (member: any) => void;
  onMemberAdd: () => void;
  onClose: () => void;
}> = ({ members, onMemberSave, onMemberDelete, onMemberEdit, onMemberAdd, onClose }) => {
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const handleMemberEdit = (member: any) => {
    setEditingMember(member);
    setShowMemberForm(true);
  };

  const handleMemberAdd = () => {
    setEditingMember(null);
    setShowMemberForm(true);
  };

  const handleMemberSave = (memberData: any) => {
    onMemberSave(memberData);
    setShowMemberForm(false);
    setEditingMember(null);
  };

  const handleMemberDelete = (memberId: string) => {
    onMemberDelete(memberId);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'blue';
      case 'editor': return 'green';
      case 'viewer': return 'gray';
      default: return 'gray';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'editor': return '編集者';
      case 'viewer': return '閲覧者';
      default: return role;
    }
  };

  if (showMemberForm) {
    return (
      <MemberForm
        member={editingMember}
        onSave={handleMemberSave}
        onCancel={() => setShowMemberForm(false)}
        onDelete={editingMember ? () => {
          handleMemberDelete(editingMember.id);
          setShowMemberForm(false);
          setEditingMember(null);
        } : undefined}
      />
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <div>
          <Text size="sm" c="dimmed">
            プロジェクトメンバーの追加・編集・削除を行います
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={handleMemberAdd}>
          メンバー追加
        </Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>名前</Table.Th>
            <Table.Th>所属</Table.Th>
            <Table.Th>メールアドレス</Table.Th>
            <Table.Th>電話番号</Table.Th>
            <Table.Th>役割</Table.Th>
            <Table.Th>権限</Table.Th>
            <Table.Th>操作</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {members.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>
                <div>
                  <Text fw={600}>{member.name}</Text>
                  <Text size="xs" c="dimmed">{member.position || '未設定'}</Text>
                </div>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{member.department || '未設定'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>
                  {member.email || '未設定'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" style={{ fontFamily: 'monospace' }}>
                  {member.phone || '未設定'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Badge color={getRoleColor(member.role)} variant="light">
                  {getRoleLabel(member.role)}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{member.permissions || '標準'}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleMemberEdit(member)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => handleMemberDelete(member.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group justify="center">
        <Text size="sm" c="dimmed">
          {members.length} 名のメンバーが登録されています
        </Text>
      </Group>
    </Stack>
  );
};

// メンバー編集フォームコンポーネント
const MemberForm: React.FC<{
  member?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
}> = ({ member, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    department: member?.department || '',
    position: member?.position || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || 'viewer',
    permissions: member?.permissions || '標準'
  });

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Stack gap="md">
      <Title order={4}>{member ? 'メンバー編集' : 'メンバー追加'}</Title>
      
      <Group grow>
        <TextInput
          label="名前"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="例: 田中太郎"
          required
        />
        <TextInput
          label="所属部署"
          value={formData.department}
          onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
          placeholder="例: 測量部"
        />
      </Group>

      <Group grow>
        <TextInput
          label="役職"
          value={formData.position}
          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
          placeholder="例: 主任測量士"
        />
        <TextInput
          label="メールアドレス"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="例: tanaka@example.com"
        />
      </Group>

      <Group grow>
        <TextInput
          label="電話番号"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="例: 03-1234-5678"
        />
        <Select
          label="役割"
          value={formData.role}
          onChange={(value) => setFormData(prev => ({ ...prev, role: value || 'viewer' }))}
          data={[
            { value: 'admin', label: '管理者' },
            { value: 'editor', label: '編集者' },
            { value: 'viewer', label: '閲覧者' }
          ]}
          required
        />
      </Group>

      <Select
        label="権限レベル"
        value={formData.permissions}
        onChange={(value) => setFormData(prev => ({ ...prev, permissions: value || '標準' }))}
        data={[
          { value: 'フル', label: 'フル権限' },
          { value: '標準', label: '標準権限' },
          { value: '制限', label: '制限付き権限' },
          { value: '閲覧のみ', label: '閲覧のみ' }
        ]}
      />

      <Group justify="space-between">
        <div>
          {onDelete && (
            <Button color="red" variant="light" onClick={onDelete}>
              削除
            </Button>
          )}
        </div>
        <Group>
          <Button variant="light" onClick={onCancel}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name}
          >
            {member ? '更新' : '追加'}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};

// タスク編集フォームコンポーネント
const TaskForm: React.FC<{
  task?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
  projectMembers: any[];
}> = ({ task, onSave, onCancel, onDelete, projectMembers }) => {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    assignee: task?.assignee || '',
    dueDate: task?.dueDate || '',
    category: task?.category || 'survey',
    progress: task?.progress || 0
  });

  const handleSubmit = () => {
    const data = {
      ...formData,
      progress: parseInt(formData.progress.toString())
    };
    onSave(data);
  };

  return (
    <Stack gap="md">
      <TextInput
        label="タスク名"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        placeholder="例: 測量現地作業（A地区）"
        required
      />

      <Textarea
        label="説明"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="例: 基準点測量および境界点確認"
        minRows={3}
      />

      <Group grow>
        <Select
          label="ステータス"
          value={formData.status}
          onChange={(value) => setFormData(prev => ({ ...prev, status: value || 'pending' }))}
          data={[
            { value: 'pending', label: '未着手' },
            { value: 'in_progress', label: '作業中' },
            { value: 'completed', label: '完了' },
            { value: 'overdue', label: '遅延' }
          ]}
          required
        />

        <Select
          label="優先度"
          value={formData.priority}
          onChange={(value) => setFormData(prev => ({ ...prev, priority: value || 'medium' }))}
          data={[
            { value: 'high', label: '高' },
            { value: 'medium', label: '中' },
            { value: 'low', label: '低' }
          ]}
          required
        />
      </Group>

      <Group grow>
        <Select
          label="カテゴリ"
          value={formData.category}
          onChange={(value) => setFormData(prev => ({ ...prev, category: value || 'survey' }))}
          data={[
            { value: 'survey', label: '測量' },
            { value: 'cad', label: 'CAD' },
            { value: 'calculation', label: '計算' },
            { value: 'delivery', label: '納品' }
          ]}
          required
        />

        <Select
          label="担当者"
          value={formData.assignee}
          onChange={(value) => setFormData(prev => ({ ...prev, assignee: value || '' }))}
          data={projectMembers.map(member => ({
            value: member.name,
            label: member.name
          }))}
          placeholder="担当者を選択"
          required
        />
      </Group>

      <Group grow>
        <TextInput
          label="期限"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          required
        />

        <NumberInput
          label="進捗 (%)"
          value={formData.progress}
          onChange={(value) => setFormData(prev => ({ ...prev, progress: value || 0 }))}
          min={0}
          max={100}
          disabled={formData.status === 'completed'}
        />
      </Group>

      {formData.status === 'in_progress' && (
        <div>
          <Text size="sm" mb="xs">進捗バー</Text>
          <Progress value={formData.progress} size="lg" />
        </div>
      )}

      <Group justify="space-between">
        <div>
          {onDelete && (
            <Button color="red" variant="light" onClick={onDelete}>
              削除
            </Button>
          )}
        </div>
        <Group>
          <Button variant="light" onClick={onCancel}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.title || !formData.assignee || !formData.dueDate}
          >
            {task ? '更新' : '追加'}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};