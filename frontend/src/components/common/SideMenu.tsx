import React, { useState } from 'react';
import {
  Stack,
  Button,
  Divider,
  Text,
  Group,
  Badge
} from '@mantine/core';
import {
  IconMenu2,
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
  opened, // 常時表示なので実際は未使用
  onClose, // 常時表示なので実際は未使用
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
    // アイコンのみの細いサイドメニュー
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 60,
        height: '100vh',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #e9ecef',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '15px'
      }}
    >
      {/* ヘッダーアイコン */}
      <div style={{
        padding: '5px',
        marginBottom: '15px'
      }}>
        <IconMenu2 size={20} color="#495057" />
      </div>
      
      {/* メニューアイコン */}
      <Stack gap="xs" style={{ width: '100%', alignItems: 'center' }}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Button
              variant="subtle"
              color={item.color}
              size="md"
              onClick={() => {
                if (item.id === 'coordinates' && onCoordinateEdit) {
                  onCoordinateEdit();
                } else if (item.id === 'lots' && onLotEdit) {
                  onLotEdit();
                } else {
                  onMenuItemClick(item.id);
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                padding: '0',
                borderRadius: '6px'
              }}
              title={item.label} // ホバー時にラベルを表示
            >
              {item.icon}
            </Button>
            {/* カウントバッジ */}
            {item.count > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: item.color === 'blue' ? '#228be6' : 
                                 item.color === 'green' ? '#40c057' :
                                 item.color === 'orange' ? '#fd7e14' :
                                 item.color === 'teal' ? '#20c997' : '#868e96',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '20px'
                }}
              >
                {item.count > 99 ? '99+' : item.count}
              </div>
            )}
          </div>
        ))}

        <Divider style={{ width: '60%', margin: '10px 0' }} />

        <Button
          variant="subtle"
          color="gray"
          size="md"
          onClick={() => {}}
          style={{
            width: '36px',
            height: '36px',
            padding: '0',
            borderRadius: '6px'
          }}
          title="スケジュール表示"
        >
          <IconCalendar size={16} />
        </Button>
      </Stack>
    </div>
  );
};

