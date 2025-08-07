import React, { useState } from 'react';
import {
  Paper,
  Stack,
  Button,
  Divider,
  Text,
  Group,
  ActionIcon,
  Badge,
  Portal
} from '@mantine/core';
import {
  IconMenu2,
  IconX,
  IconUsers,
  IconChecklist,
  IconMapPins,
  IconMap2,
  IconSettings,
  IconCalendar
} from '@tabler/icons-react';

interface SideMenuProps {
  opened: boolean;
  onClose: () => void;
  onMenuItemClick: (item: 'members' | 'tasks' | 'coordinates' | 'lots' | 'settings') => void;
  onCoordinateEdit?: () => void;
  onLotEdit?: () => void;
  taskCount?: number;
  memberCount?: number;
  coordinateCount?: number;
  lotCount?: number;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  opened,
  onClose,
  onMenuItemClick,
  onCoordinateEdit,
  onLotEdit,
  taskCount = 0,
  memberCount = 0,
  coordinateCount = 0,
  lotCount = 0
}) => {
  const menuItems = [
    {
      id: 'members' as const,
      label: 'メンバー管理',
      icon: <IconUsers size={18} />,
      description: 'プロジェクトメンバーの管理',
      count: memberCount,
      color: 'blue'
    },
    {
      id: 'tasks' as const,
      label: 'タスク管理',
      icon: <IconChecklist size={18} />,
      description: 'タスクの進捗管理',
      count: taskCount,
      color: 'green'
    },
    {
      id: 'coordinates' as const,
      label: '座標管理',
      icon: <IconMapPins size={18} />,
      description: '測量座標データの管理',
      count: coordinateCount,
      color: 'orange'
    },
    {
      id: 'lots' as const,
      label: '地番管理', 
      icon: <IconMap2 size={18} />,
      description: '土地地番データの管理',
      count: lotCount,
      color: 'teal'
    },
    {
      id: 'settings' as const,
      label: 'プロジェクト設定',
      icon: <IconSettings size={18} />,
      description: 'プロジェクトの詳細設定',
      count: 0,
      color: 'gray'
    }
  ];

  return (
    <Portal>
      {/* オーバーレイ */}
      {opened && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 9997,
          }}
          onClick={onClose}
        />
      )}
      
      {/* カスタムサイドメニュー */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: opened ? 0 : -400, // 左側からスライド
          width: 400,
          height: '100vh',
          backgroundColor: 'white',
          zIndex: 9998,
          transition: 'left 0.3s ease',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
          overflow: 'auto'
        }}
      >
        {/* ヘッダー */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Group gap="sm">
            <IconMenu2 size={20} />
            <Text fw={600}>プロジェクトメニュー</Text>
          </Group>
          <ActionIcon variant="subtle" onClick={onClose}>
            <IconX size={16} />
          </ActionIcon>
        </div>
        
        {/* メニューコンテンツ */}
        <div style={{ padding: '20px' }}>
      <Stack gap="md" pt="md">
        <Text size="sm" c="dimmed">
          プロジェクトの各機能にアクセスできます
        </Text>

        <Divider />

        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant="light"
            color={item.color}
            size="md"
            leftSection={item.icon}
            rightSection={
              item.count > 0 ? (
                <Badge size="sm" color={item.color} variant="filled">
                  {item.count}
                </Badge>
              ) : null
            }
            onClick={() => {
              if (item.id === 'coordinates' && onCoordinateEdit) {
                onCoordinateEdit();
              } else if (item.id === 'lots' && onLotEdit) {
                onLotEdit();
              } else {
                onMenuItemClick(item.id);
              }
              onClose();
            }}
            style={{
              justifyContent: 'flex-start',
              height: 'auto',
              padding: '12px 16px'
            }}
          >
            <div style={{ textAlign: 'left', flex: 1 }}>
              <Text fw={600} size="sm">
                {item.label}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                {item.description}
              </Text>
            </div>
          </Button>
        ))}

        <Divider />

        <Button
          variant="subtle"
          color="gray"
          size="sm"
          leftSection={<IconCalendar size={16} />}
          onClick={onClose}
        >
          スケジュール表示
        </Button>
      </Stack>
        </div>
      </div>
    </Portal>
  );
};

interface MenuToggleButtonProps {
  onClick: () => void;
}

export const MenuToggleButton: React.FC<MenuToggleButtonProps> = ({ onClick }) => {
  return (
    <Portal>
      <ActionIcon
        variant="filled"
        size="xl"
        color="blue"
        onClick={onClick}
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 9999, // より高いz-indexで確実に表示
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '2px solid white' // デバッグ用の境界線
        }}
      >
        <IconMenu2 size={24} />
      </ActionIcon>
    </Portal>
  );
};