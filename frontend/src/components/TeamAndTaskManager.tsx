import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Tabs,
  Grid,
  Card,
  Avatar,
  Progress,
  Alert,
  LoadingOverlay,
  ActionIcon
} from '@mantine/core';
import {
  IconUsers,
  IconChecklist,
  IconChartBar,
  IconBell,
  IconArrowLeft,
  IconCalendar,
  IconTrendingUp
} from '@tabler/icons-react';
import { AppHeader } from './layout/AppHeader';
import { MemberManager } from './members/MemberManager';
import { TaskManager } from './tasks/TaskManager';
import type { Project, User } from '../types/project';
import type { Task } from '../types/task';

interface TeamAndTaskManagerProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate: (project: Project) => void;
}

export const TeamAndTaskManager: React.FC<TeamAndTaskManagerProps> = ({
  project,
  onBack,
  onProjectUpdate
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [members, setMembers] = useState<User[]>(project.members || []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 現在のユーザーID（実際はauthから取得）
  const currentUserId = '1';
  const currentUserRole = members.find(m => m.id === currentUserId)?.role || 'viewer';

  // サンプルタスクデータ
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: '基準点測量',
      description: '地区内の基準点を設置し、GPS測量を実施',
      status: 'in_progress',
      priority: 'high',
      assigneeId: '2',
      assignee: members.find(m => m.id === '2'),
      dueDate: '2024-03-20T00:00:00Z',
      createdAt: '2024-01-15T09:00:00Z',
      createdBy: '1',
      projectId: project.id,
      labels: ['測量', '基準点'],
      estimatedHours: 16,
      actualHours: 8
    },
    {
      id: '2',
      title: '境界点確認',
      description: '既存の境界標を確認し、不明点の復元作業',
      status: 'todo',
      priority: 'medium',
      assigneeId: '3',
      assignee: members.find(m => m.id === '3'),
      dueDate: '2024-03-25T00:00:00Z',
      createdAt: '2024-01-20T10:00:00Z',
      createdBy: '1',
      projectId: project.id,
      labels: ['境界', '確認'],
      estimatedHours: 24
    },
    {
      id: '3',
      title: 'CAD図面作成',
      description: '測量データをもとにCAD図面を作成',
      status: 'review',
      priority: 'medium',
      assigneeId: '1',
      assignee: members.find(m => m.id === '1'),
      dueDate: '2024-03-30T00:00:00Z',
      createdAt: '2024-01-25T14:00:00Z',
      createdBy: '2',
      projectId: project.id,
      labels: ['CAD', '図面'],
      estimatedHours: 12,
      actualHours: 10
    },
    {
      id: '4',
      title: '地権者説明資料作成',
      description: '地権者向けの説明資料と図面を準備',
      status: 'completed',
      priority: 'low',
      assigneeId: '2',
      assignee: members.find(m => m.id === '2'),
      dueDate: '2024-02-15T00:00:00Z',
      createdAt: '2024-01-10T11:00:00Z',
      createdBy: '1',
      projectId: project.id,
      labels: ['説明資料', '地権者'],
      estimatedHours: 8,
      actualHours: 6
    },
    {
      id: '5',
      title: '成果品チェック',
      description: '最終成果品の品質チェックと修正',
      status: 'todo',
      priority: 'urgent',
      assigneeId: '1',
      assignee: members.find(m => m.id === '1'),
      dueDate: '2024-04-05T00:00:00Z',
      createdAt: '2024-02-01T16:00:00Z',
      createdBy: '1',
      projectId: project.id,
      labels: ['品質管理', '最終確認'],
      estimatedHours: 16
    }
  ];

  useEffect(() => {
    setTasks(sampleTasks);
  }, [project.id]);

  const handleMemberAdd = (newMember: Omit<User, 'id'>) => {
    const member: User = {
      id: Date.now().toString(),
      ...newMember
    };
    const updatedMembers = [...members, member];
    setMembers(updatedMembers);
    
    const updatedProject = {
      ...project,
      members: updatedMembers
    };
    onProjectUpdate(updatedProject);
  };

  const handleMemberUpdate = (updatedMember: User) => {
    const updatedMembers = members.map(m => m.id === updatedMember.id ? updatedMember : m);
    setMembers(updatedMembers);
    
    const updatedProject = {
      ...project,
      members: updatedMembers
    };
    onProjectUpdate(updatedProject);
  };

  const handleMemberRemove = (memberId: string) => {
    const updatedMembers = members.filter(m => m.id !== memberId);
    setMembers(updatedMembers);
    
    // 削除されたメンバーに割り当てられたタスクを未割り当てにする
    const updatedTasks = tasks.map(task => 
      task.assigneeId === memberId 
        ? { ...task, assigneeId: undefined, assignee: undefined }
        : task
    );
    setTasks(updatedTasks);
    
    const updatedProject = {
      ...project,
      members: updatedMembers
    };
    onProjectUpdate(updatedProject);
  };

  const handleTaskAdd = (newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const task: Task = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...newTask
    };
    setTasks([...tasks, task]);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const taskStats = React.useMemo(() => {
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status !== 'completed';
      }).length
    };
    return stats;
  }, [tasks]);

  const handleUserMenuClick = (action: 'profile' | 'settings' | 'logout') => {
    console.log(`User menu action: ${action}`);
  };

  return (
    <Box style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader onUserMenuClick={handleUserMenuClick} />
      
      <Container size="xl" style={{ flex: 1 }} py="md">
        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* プロジェクト情報ヘッダー */}
        <Paper shadow="sm" p="lg" mb="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <Group>
              <ActionIcon variant="light" onClick={onBack}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Stack gap="xs">
                <Title order={2}>{project.name}</Title>
                <Text size="sm" c="dimmed">
                  {project.description}
                </Text>
                <Group gap="md">
                  <Group gap="xs">
                    <IconCalendar size={14} />
                    <Text size="xs" c="dimmed">
                      作成: {new Date(project.createdAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </Group>
                  <Badge color={project.status === 'completed' ? 'green' : 'blue'} variant="light">
                    {project.status === 'planning' && '計画中'}
                    {project.status === 'in_progress' && '実施中'}
                    {project.status === 'review' && 'レビュー中'}
                    {project.status === 'completed' && '完了'}
                  </Badge>
                </Group>
              </Stack>
            </Group>
            
            {/* 統計カード */}
            <Grid w={400}>
              <Grid.Col span={6}>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">メンバー数</Text>
                      <Text size="lg" fw={700} c="blue">
                        {members.length}
                      </Text>
                    </Stack>
                    <IconUsers size={20} color="blue" />
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">タスク完了率</Text>
                      <Text size="lg" fw={700} c="green">
                        {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                      </Text>
                    </Stack>
                    <IconTrendingUp size={20} color="green" />
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">進行中</Text>
                      <Text size="lg" fw={700} c="yellow">
                        {taskStats.inProgress}
                      </Text>
                    </Stack>
                    <IconChecklist size={20} color="orange" />
                  </Group>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="sm" withBorder>
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Text size="xs" c="dimmed">期限切れ</Text>
                      <Text size="lg" fw={700} c="red">
                        {taskStats.overdue}
                      </Text>
                    </Stack>
                    <IconBell size={20} color="red" />
                  </Group>
                </Card>
              </Grid.Col>
            </Grid>
          </Group>
        </Paper>

        {/* タブ切り替え */}
        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconChartBar size={16} />}>
              概要
            </Tabs.Tab>
            <Tabs.Tab value="tasks" leftSection={<IconChecklist size={16} />}>
              タスク管理
            </Tabs.Tab>
            <Tabs.Tab value="members" leftSection={<IconUsers size={16} />}>
              メンバー管理
            </Tabs.Tab>
          </Tabs.List>

          {/* 概要タブ */}
          <Tabs.Panel value="overview">
            <Grid>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack>
                  {/* プロジェクト進捗 */}
                  <Paper shadow="sm" p="lg" withBorder>
                    <Title order={4} mb="md">プロジェクト進捗</Title>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text size="sm">全体進捗</Text>
                        <Text size="sm" fw={500}>
                          {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                        </Text>
                      </Group>
                      <Progress 
                        value={taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0} 
                        size="lg" 
                        color="green" 
                      />
                      <Group gap="lg">
                        <Group gap="xs">
                          <Badge variant="dot" color="green" size="sm">完了</Badge>
                          <Text size="sm">{taskStats.completed}件</Text>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="dot" color="blue" size="sm">進行中</Badge>
                          <Text size="sm">{taskStats.inProgress}件</Text>
                        </Group>
                        <Group gap="xs">
                          <Badge variant="dot" color="red" size="sm">期限切れ</Badge>
                          <Text size="sm">{taskStats.overdue}件</Text>
                        </Group>
                      </Group>
                    </Stack>
                  </Paper>

                  {/* 最近のタスク */}
                  <Paper shadow="sm" p="lg" withBorder>
                    <Group justify="space-between" mb="md">
                      <Title order={4}>最近のタスク</Title>
                      <Button 
                        variant="light" 
                        size="sm"
                        onClick={() => setActiveTab('tasks')}
                      >
                        すべて見る
                      </Button>
                    </Group>
                    <Stack gap="md">
                      {tasks
                        .filter(t => t.status !== 'completed')
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 3)
                        .map((task) => (
                          <Group key={task.id} justify="space-between">
                            <Group>
                              <Avatar size="sm" radius="xl" src={task.assignee?.avatar}>
                                {task.assignee?.name.charAt(0) || '?'}
                              </Avatar>
                              <Stack gap="xs">
                                <Text size="sm" fw={500}>
                                  {task.title}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  担当: {task.assignee?.name || '未割り当て'}
                                </Text>
                              </Stack>
                            </Group>
                            <Group gap="xs">
                              <Badge 
                                variant="light" 
                                color={task.status === 'in_progress' ? 'blue' : task.status === 'review' ? 'yellow' : 'gray'}
                                size="sm"
                              >
                                {task.status === 'todo' && '未着手'}
                                {task.status === 'in_progress' && '進行中'}
                                {task.status === 'review' && 'レビュー'}
                              </Badge>
                            </Group>
                          </Group>
                        ))}
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack>
                  {/* メンバー一覧 */}
                  <Paper shadow="sm" p="lg" withBorder>
                    <Group justify="space-between" mb="md">
                      <Title order={4}>チームメンバー</Title>
                      <Button 
                        variant="light" 
                        size="sm"
                        onClick={() => setActiveTab('members')}
                      >
                        管理
                      </Button>
                    </Group>
                    <Stack gap="md">
                      {members.slice(0, 4).map((member) => (
                        <Group key={member.id} justify="space-between">
                          <Group gap="sm">
                            <Avatar src={member.avatar} size="sm" radius="xl">
                              {member.name.charAt(0)}
                            </Avatar>
                            <Stack gap="xs">
                              <Text size="sm" fw={500}>
                                {member.name}
                              </Text>
                              <Badge 
                                variant="light" 
                                color={member.role === 'admin' ? 'red' : member.role === 'editor' ? 'blue' : 'gray'}
                                size="xs"
                              >
                                {member.role === 'admin' && '管理者'}
                                {member.role === 'editor' && '編集者'}
                                {member.role === 'viewer' && '閲覧者'}
                              </Badge>
                            </Stack>
                          </Group>
                        </Group>
                      ))}
                      {members.length > 4 && (
                        <Text size="xs" c="dimmed" ta="center">
                          他 {members.length - 4} 名
                        </Text>
                      )}
                    </Stack>
                  </Paper>

                  {/* アクティビティ */}
                  <Paper shadow="sm" p="lg" withBorder>
                    <Title order={4} mb="md">最近のアクティビティ</Title>
                    <Stack gap="sm">
                      <Group gap="sm" align="flex-start">
                        <Avatar size="xs" color="blue">田</Avatar>
                        <div>
                          <Text size="xs">
                            <Text component="span" fw={500}>田中太郎</Text> さんが
                            <Text component="span" fw={500} c="blue">CAD図面作成</Text> を
                            レビューに移しました
                          </Text>
                          <Text size="xs" c="dimmed">2時間前</Text>
                        </div>
                      </Group>
                      
                      <Group gap="sm" align="flex-start">
                        <Avatar size="xs" color="teal">佐</Avatar>
                        <div>
                          <Text size="xs">
                            <Text component="span" fw={500}>佐藤花子</Text> さんが
                            <Text component="span" fw={500} c="blue">基準点測量</Text> を
                            開始しました
                          </Text>
                          <Text size="xs" c="dimmed">5時間前</Text>
                        </div>
                      </Group>
                      
                      <Group gap="sm" align="flex-start">
                        <Avatar size="xs" color="orange">山</Avatar>
                        <div>
                          <Text size="xs">
                            <Text component="span" fw={500}>山田次郎</Text> さんが
                            プロジェクトに参加しました
                          </Text>
                          <Text size="xs" c="dimmed">1日前</Text>
                        </div>
                      </Group>
                    </Stack>
                  </Paper>
                </Stack>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          {/* タスク管理タブ */}
          <Tabs.Panel value="tasks">
            <TaskManager
              projectId={project.id}
              tasks={tasks}
              members={members}
              onTaskAdd={handleTaskAdd}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          </Tabs.Panel>

          {/* メンバー管理タブ */}
          <Tabs.Panel value="members">
            <MemberManager
              projectId={project.id}
              members={members}
              onMemberAdd={handleMemberAdd}
              onMemberUpdate={handleMemberUpdate}
              onMemberRemove={handleMemberRemove}
              currentUserRole={currentUserRole}
            />
          </Tabs.Panel>
        </Tabs>
      </Container>

      <LoadingOverlay visible={loading} />
    </Box>
  );
};