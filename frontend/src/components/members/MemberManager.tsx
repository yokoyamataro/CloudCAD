import React, { useState } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Card,
  Avatar,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Select,
  Table,
  Menu,
  Divider
} from '@mantine/core';
import {
  IconUsers,
  IconPlus,
  IconEdit,
  IconTrash,
  IconDots,
  IconMail,
  IconUserPlus
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import type { User } from '../../types/project';

interface MemberManagerProps {
  projectId: string;
  members: User[];
  onMemberAdd: (member: Omit<User, 'id'>) => void;
  onMemberUpdate: (member: User) => void;
  onMemberRemove: (memberId: string) => void;
  currentUserRole?: 'admin' | 'editor' | 'viewer';
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  projectId,
  members,
  onMemberAdd,
  onMemberUpdate,
  onMemberRemove,
  currentUserRole = 'viewer'
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  const addMemberForm = useForm({
    initialValues: {
      name: '',
      email: '',
      role: 'viewer' as 'admin' | 'editor' | 'viewer'
    },
    validate: {
      name: (value) => !value ? '名前は必須です' : null,
      email: (value) => {
        if (!value) return 'メールアドレスは必須です';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '有効なメールアドレスを入力してください';
        if (members.some(m => m.email === value)) return 'このメールアドレスは既に登録されています';
        return null;
      }
    }
  });

  const editMemberForm = useForm({
    initialValues: {
      name: '',
      email: '',
      role: 'viewer' as 'admin' | 'editor' | 'viewer'
    },
    validate: {
      name: (value) => !value ? '名前は必須です' : null,
      email: (value) => {
        if (!value) return 'メールアドレスは必須です';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '有効なメールアドレスを入力してください';
        const otherMembers = members.filter(m => m.id !== editingMember?.id);
        if (otherMembers.some(m => m.email === value)) return 'このメールアドレスは既に登録されています';
        return null;
      }
    }
  });

  const roleOptions = [
    { value: 'admin', label: '管理者' },
    { value: 'editor', label: '編集者' },
    { value: 'viewer', label: '閲覧者' }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'editor': return 'blue';
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

  const handleAddMember = (values: typeof addMemberForm.values) => {
    onMemberAdd(values);
    addMemberForm.reset();
    setShowAddModal(false);
  };

  const handleEditMember = (member: User) => {
    setEditingMember(member);
    editMemberForm.setValues({
      name: member.name,
      email: member.email,
      role: member.role
    });
  };

  const handleUpdateMember = (values: typeof editMemberForm.values) => {
    if (editingMember) {
      onMemberUpdate({
        ...editingMember,
        ...values
      });
      setEditingMember(null);
      editMemberForm.reset();
    }
  };

  const canManageMembers = currentUserRole === 'admin';

  return (
    <>
      <Paper shadow="sm" p="lg" withBorder>
        <Group justify="space-between" mb="md">
          <Group>
            <IconUsers size={20} color="blue" />
            <Title order={4}>メンバー管理</Title>
            <Badge variant="light" color="blue">
              {members.length}名
            </Badge>
          </Group>
          {canManageMembers && (
            <Button
              leftSection={<IconUserPlus size={16} />}
              onClick={() => setShowAddModal(true)}
              size="sm"
            >
              メンバー追加
            </Button>
          )}
        </Group>

        {members.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            まだメンバーが登録されていません
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>メンバー</Table.Th>
                <Table.Th>メールアドレス</Table.Th>
                <Table.Th>権限</Table.Th>
                {canManageMembers && <Table.Th width={50}></Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((member) => (
                <Table.Tr key={member.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar
                        src={member.avatar}
                        radius="xl"
                        size="sm"
                        color="blue"
                      >
                        {member.name.charAt(0)}
                      </Avatar>
                      <Text fw={500} size="sm">
                        {member.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {member.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={getRoleColor(member.role)}
                      size="sm"
                    >
                      {getRoleLabel(member.role)}
                    </Badge>
                  </Table.Td>
                  {canManageMembers && (
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
                            onClick={() => handleEditMember(member)}
                          >
                            編集
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconMail size={14} />}
                            onClick={() => window.open(`mailto:${member.email}`)}
                          >
                            メール送信
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => {
                              if (window.confirm(`${member.name}さんをプロジェクトから削除しますか？`)) {
                                onMemberRemove(member.id);
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

        <Divider my="md" />
        
        <Group gap="lg">
          <Group gap="xs">
            <Badge variant="light" color="red" size="sm">管理者</Badge>
            <Text size="xs" c="dimmed">
              {members.filter(m => m.role === 'admin').length}名
            </Text>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="blue" size="sm">編集者</Badge>
            <Text size="xs" c="dimmed">
              {members.filter(m => m.role === 'editor').length}名
            </Text>
          </Group>
          <Group gap="xs">
            <Badge variant="light" color="gray" size="sm">閲覧者</Badge>
            <Text size="xs" c="dimmed">
              {members.filter(m => m.role === 'viewer').length}名
            </Text>
          </Group>
        </Group>
      </Paper>

      {/* メンバー追加モーダル */}
      <Modal
        opened={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="メンバー追加"
        size="md"
      >
        <form onSubmit={addMemberForm.onSubmit(handleAddMember)}>
          <Stack>
            <TextInput
              label="名前"
              placeholder="田中太郎"
              {...addMemberForm.getInputProps('name')}
            />
            <TextInput
              label="メールアドレス"
              placeholder="tanaka@example.com"
              {...addMemberForm.getInputProps('email')}
            />
            <Select
              label="権限"
              data={roleOptions}
              {...addMemberForm.getInputProps('role')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">追加</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* メンバー編集モーダル */}
      <Modal
        opened={!!editingMember}
        onClose={() => setEditingMember(null)}
        title="メンバー編集"
        size="md"
      >
        <form onSubmit={editMemberForm.onSubmit(handleUpdateMember)}>
          <Stack>
            <TextInput
              label="名前"
              placeholder="田中太郎"
              {...editMemberForm.getInputProps('name')}
            />
            <TextInput
              label="メールアドレス"
              placeholder="tanaka@example.com"
              {...editMemberForm.getInputProps('email')}
            />
            <Select
              label="権限"
              data={roleOptions}
              {...editMemberForm.getInputProps('role')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                キャンセル
              </Button>
              <Button type="submit">更新</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};