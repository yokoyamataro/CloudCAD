import React, { useState, useMemo } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  Table,
  Menu,
  Avatar,
  Progress,
  Tabs,
  MultiSelect,
  NumberInput,
  Divider,
  Grid,
  RingProgress,
  Center
} from '@mantine/core';
import {
  IconChecklist,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconCalendar,
  IconUser,
  IconFlag,
  IconClock,
  IconFilter,
  IconX,
  IconChevronDown,
  IconMessage
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import type { Task, TaskFilter, TaskStats } from '../../types/task';
import type { User } from '../../types/project';

interface TaskManagerProps {
  projectId: string;
  tasks: Task[];
  members: User[];
  onTaskAdd: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  currentUserId: string;
  currentUserRole?: 'admin' | 'editor' | 'viewer';
}

export const TaskManager: React.FC<TaskManagerProps> = ({
  projectId,
  tasks,
  members,
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  currentUserId,
  currentUserRole = 'viewer'
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  const [filter, setFilter] = useState<TaskFilter>({});
  const [showFilters, setShowFilters] = useState(false);

  const taskForm = useForm({
    initialValues: {
      title: '',
      description: '',
      status: 'todo' as Task['status'],
      priority: 'medium' as Task['priority'],
      assigneeId: '',
      dueDate: '',
      estimatedHours: 0,
      labels: [] as string[]
    },
    validate: {
      title: (value) => !value ? 'タスク名は必須です' : null
    }
  });

  const statusOptions = [
    { value: 'todo', label: '未着手' },
    { value: 'in_progress', label: '進行中' },
    { value: 'review', label: 'レビュー' },
    { value: 'completed', label: '完了' }
  ];

  const priorityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'urgent', label: '緊急' }
  ];

  const memberOptions = members.map(member => ({
    value: member.id,
    label: member.name
  }));

  const allLabels = Array.from(new Set(tasks.flatMap(task => task.labels || [])));
  const labelOptions = allLabels.map(label => ({ value: label, label }));

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'gray';
      case 'in_progress': return 'blue';
      case 'review': return 'yellow';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'gray';
      case 'medium': return 'blue';
      case 'high': return 'orange';
      case 'urgent': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    return priorityOptions.find(p => p.value === priority)?.label || priority;
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== 'completed';
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // タブフィルター
    if (activeTab !== 'all') {
      switch (activeTab) {
        case 'my':
          filtered = filtered.filter(task => task.assigneeId === currentUserId);
          break;
        case 'overdue':
          filtered = filtered.filter(task => isOverdue(task));
          break;
        case 'completed':
          filtered = filtered.filter(task => task.status === 'completed');
          break;
        default:
          filtered = filtered.filter(task => task.status === activeTab);
      }
    }

    // 追加フィルター
    if (filter.status?.length) {
      filtered = filtered.filter(task => filter.status!.includes(task.status));
    }
    if (filter.priority?.length) {
      filtered = filtered.filter(task => filter.priority!.includes(task.priority));
    }
    if (filter.assigneeId?.length) {
      filtered = filtered.filter(task => 
        task.assigneeId && filter.assigneeId!.includes(task.assigneeId)
      );
    }
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [tasks, activeTab, filter, currentUserId]);

  const taskStats: TaskStats = useMemo(() => {
    const stats: TaskStats = {
      total: tasks.length,
      todo: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
      overdue: 0,
      byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
      byAssignee: {}
    };

    tasks.forEach(task => {
      stats[task.status]++;
      stats.byPriority[task.priority]++;
      
      if (isOverdue(task)) {
        stats.overdue++;
      }

      if (task.assignee) {
        if (!stats.byAssignee[task.assignee.id]) {
          stats.byAssignee[task.assignee.id] = {
            name: task.assignee.name,
            total: 0,
            completed: 0
          };
        }
        stats.byAssignee[task.assignee.id].total++;
        if (task.status === 'completed') {
          stats.byAssignee[task.assignee.id].completed++;
        }
      }
    });

    return stats;
  }, [tasks]);

  const handleAddTask = (values: typeof taskForm.values) => {
    const newTask: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || undefined,
      assignee: values.assigneeId ? members.find(m => m.id === values.assigneeId) : undefined,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      estimatedHours: values.estimatedHours || undefined,
      labels: values.labels.length > 0 ? values.labels : undefined,
      createdBy: currentUserId,
      projectId
    };

    onTaskAdd(newTask);
    taskForm.reset();
    setShowAddModal(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    taskForm.setValues({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours || 0,
      labels: task.labels || []
    });
  };

  const handleUpdateTask = (values: typeof taskForm.values) => {
    if (editingTask) {
      const updatedTask: Task = {
        ...editingTask,
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || undefined,
        assignee: values.assigneeId ? members.find(m => m.id === values.assigneeId) : undefined,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
        estimatedHours: values.estimatedHours || undefined,
        labels: values.labels.length > 0 ? values.labels : undefined,
        updatedAt: new Date().toISOString()
      };

      onTaskUpdate(updatedTask);
      setEditingTask(null);
      taskForm.reset();
    }
  };

  const canManageTasks = currentUserRole !== 'viewer';

  const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;

  return (
    <>
      <Stack>
        {/* 統計情報 */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Paper shadow="sm" p="md" withBorder>
              <Group justify="space-between" mb="md">
                <Group>
                  <IconChecklist size={20} color="blue" />
                  <Title order={4}>タスク管理</Title>
                </Group>
                {canManageTasks && (
                  <Group>
                    <Button
                      variant="light"
                      leftSection={<IconFilter size={16} />}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      フィルター
                    </Button>
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={() => setShowAddModal(true)}
                    >
                      タスク追加
                    </Button>
                  </Group>
                )}
              </Group>

              <Group gap="lg" mb="md">
                <Stack gap="xs" align="center">
                  <Text size="xl" fw={700} c="blue">
                    {taskStats.total}
                  </Text>
                  <Text size="sm" c="dimmed">総タスク数</Text>
                </Stack>
                <Stack gap="xs" align="center">
                  <Text size="xl" fw={700} c="green">
                    {taskStats.completed}
                  </Text>
                  <Text size="sm" c="dimmed">完了</Text>
                </Stack>
                <Stack gap="xs" align="center">
                  <Text size="xl" fw={700} c="red">
                    {taskStats.overdue}
                  </Text>
                  <Text size="sm" c="dimmed">期限切れ</Text>
                </Stack>
                <Stack gap="xs" align="center">
                  <Text size="xl" fw={700} c="blue">
                    {taskStats.in_progress}
                  </Text>
                  <Text size="sm" c="dimmed">進行中</Text>
                </Stack>
              </Group>

              <Progress value={completionRate} color="green" size="lg" />
              <Text size="sm" c="dimmed" mt="xs">
                完了率: {completionRate.toFixed(1)}%
              </Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Paper shadow="sm" p="md" withBorder h="100%">
              <Center>
                <Stack align="center">
                  <RingProgress
                    size={120}
                    thickness={12}
                    sections={[
                      { value: (taskStats.completed / taskStats.total) * 100, color: 'green' },
                      { value: (taskStats.in_progress / taskStats.total) * 100, color: 'blue' },
                      { value: (taskStats.review / taskStats.total) * 100, color: 'yellow' },
                      { value: (taskStats.todo / taskStats.total) * 100, color: 'gray' }
                    ]}
                    label={
                      <Center>
                        <Text fw={700} size="xl">
                          {completionRate.toFixed(0)}%
                        </Text>
                      </Center>
                    }
                  />
                  <Text size="sm" c="dimmed" ta="center">
                    プロジェクト進捗
                  </Text>
                </Stack>
              </Center>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* フィルター */}
        {showFilters && (
          <Paper shadow="sm" p="md" withBorder>
            <Group align="flex-end">
              <TextInput
                label="検索"
                placeholder="タスク名や説明で検索"
                value={filter.searchText || ''}
                onChange={(event) => 
                  setFilter(prev => ({ ...prev, searchText: event.currentTarget.value }))
                }
                style={{ flex: 1 }}
              />
              <MultiSelect
                label="ステータス"
                data={statusOptions}
                value={filter.status || []}
                onChange={(value) => setFilter(prev => ({ ...prev, status: value as Task['status'][] }))}
                placeholder="選択してください"
              />
              <MultiSelect
                label="優先度"
                data={priorityOptions}
                value={filter.priority || []}
                onChange={(value) => setFilter(prev => ({ ...prev, priority: value as Task['priority'][] }))}
                placeholder="選択してください"
              />
              <MultiSelect
                label="担当者"
                data={memberOptions}
                value={filter.assigneeId || []}
                onChange={(value) => setFilter(prev => ({ ...prev, assigneeId: value }))}
                placeholder="選択してください"
              />
              <Button
                variant="light"
                color="red"
                leftSection={<IconX size={16} />}
                onClick={() => setFilter({})}
              >
                クリア
              </Button>
            </Group>
          </Paper>
        )}

        {/* タブナビゲーション */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="all">
              すべて ({tasks.length})
            </Tabs.Tab>
            <Tabs.Tab value="todo">
              未着手 ({taskStats.todo})
            </Tabs.Tab>
            <Tabs.Tab value="in_progress">
              進行中 ({taskStats.in_progress})
            </Tabs.Tab>
            <Tabs.Tab value="review">
              レビュー ({taskStats.review})
            </Tabs.Tab>
            <Tabs.Tab value="my">
              自分のタスク ({tasks.filter(t => t.assigneeId === currentUserId).length})
            </Tabs.Tab>
            <Tabs.Tab value="overdue" c="red">
              期限切れ ({taskStats.overdue})
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* タスク一覧 */}
        <Paper shadow="sm" withBorder>
          {filteredTasks.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              該当するタスクがありません
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>タスク</Table.Th>
                  <Table.Th>担当者</Table.Th>
                  <Table.Th>ステータス</Table.Th>
                  <Table.Th>優先度</Table.Th>
                  <Table.Th>期限</Table.Th>
                  {canManageTasks && <Table.Th width={50}></Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredTasks.map((task) => (
                  <Table.Tr key={task.id} bg={isOverdue(task) ? 'red.0' : undefined}>
                    <Table.Td>
                      <Stack gap="xs">
                        <Text fw={500} size="sm">
                          {task.title}
                        </Text>
                        {task.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {task.description}
                          </Text>
                        )}
                        {task.labels && task.labels.length > 0 && (
                          <Group gap="xs">
                            {task.labels.map((label) => (
                              <Badge key={label} variant="dot" size="xs">
                                {label}
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      {task.assignee ? (
                        <Group gap="xs">
                          <Avatar
                            src={task.assignee.avatar}
                            size="sm"
                            radius="xl"
                          >
                            {task.assignee.name.charAt(0)}
                          </Avatar>
                          <Text size="sm">{task.assignee.name}</Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          未割り当て
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={getStatusColor(task.status)}
                        size="sm"
                      >
                        {getStatusLabel(task.status)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="outline"
                        color={getPriorityColor(task.priority)}
                        size="sm"
                        leftSection={<IconFlag size={12} />}
                      >
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {task.dueDate ? (
                        <Group gap="xs">
                          <IconCalendar size={14} />
                          <Text size="sm" c={isOverdue(task) ? 'red' : undefined}>
                            {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                          </Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          未設定
                        </Text>
                      )}
                    </Table.Td>
                    {canManageTasks && (
                      <Table.Td>
                        <Menu position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="light" size="sm">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEdit size={14} />}
                              onClick={() => handleEditTask(task)}
                            >
                              編集
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconMessage size={14} />}
                              onClick={() => console.log('コメント機能')}
                            >
                              コメント
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              leftSection={<IconTrash size={14} />}
                              color="red"
                              onClick={() => {
                                if (window.confirm(`「${task.title}」を削除しますか？`)) {
                                  onTaskDelete(task.id);
                                }
                              }}
                            >
                              削除
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      {/* タスク追加/編集モーダル */}
      <Modal
        opened={showAddModal || !!editingTask}
        onClose={() => {
          setShowAddModal(false);
          setEditingTask(null);
          taskForm.reset();
        }}
        title={editingTask ? 'タスク編集' : 'タスク追加'}
        size="md"
      >
        <form onSubmit={taskForm.onSubmit(editingTask ? handleUpdateTask : handleAddTask)}>
          <Stack>
            <TextInput
              label="タスク名"
              placeholder="タスクのタイトルを入力"
              {...taskForm.getInputProps('title')}
            />
            <Textarea
              label="説明"
              placeholder="タスクの詳細説明（任意）"
              {...taskForm.getInputProps('description')}
              autosize
              minRows={3}
            />
            <Group grow>
              <Select
                label="ステータス"
                data={statusOptions}
                {...taskForm.getInputProps('status')}
              />
              <Select
                label="優先度"
                data={priorityOptions}
                {...taskForm.getInputProps('priority')}
              />
            </Group>
            <Group grow>
              <Select
                label="担当者"
                data={[{ value: '', label: '未割り当て' }, ...memberOptions]}
                {...taskForm.getInputProps('assigneeId')}
                clearable
              />
              <NumberInput
                label="予想工数（時間）"
                min={0}
                {...taskForm.getInputProps('estimatedHours')}
              />
            </Group>
            <TextInput
              label="期限"
              placeholder="YYYY-MM-DD"
              type="date"
              {...taskForm.getInputProps('dueDate')}
            />
            <MultiSelect
              label="ラベル"
              data={labelOptions}
              searchable
              creatable
              getCreateLabel={(query) => `+ ラベル「${query}」を作成`}
              onCreate={(query) => {
                const item = { value: query, label: query };
                labelOptions.push(item);
                return item;
              }}
              {...taskForm.getInputProps('labels')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                  taskForm.reset();
                }}
              >
                キャンセル
              </Button>
              <Button type="submit">
                {editingTask ? '更新' : '追加'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};