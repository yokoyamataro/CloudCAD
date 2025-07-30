import React from 'react';
import {
  Group,
  ActionIcon,
  Tooltip,
  Divider,
  ColorInput,
  NumberInput,
  Select,
  Paper,
  Stack,
  Text
} from '@mantine/core';
import {
  IconPointer,
  IconPoint,
  IconLine,
  IconSquare,
  IconCircle,
  IconLetterT,
  IconArrowsMove,
  IconZoomIn,
  IconZoomOut,
  IconRotate,
  IconCopy,
  IconTrash,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconRuler
} from '@tabler/icons-react';
import { useDrawingStore } from '../../modules/drawing/DrawingStore';

interface DrawingToolbarProps {
  onToolChange?: (tool: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  disabled?: boolean;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  onToolChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  disabled = false
}) => {
  const { 
    currentTool, 
    setCurrentTool, 
    settings, 
    updateSettings,
    getSelectedElements,
    removeElement,
    clearSelection
  } = useDrawingStore();

  const handleToolChange = (tool: string) => {
    setCurrentTool(tool as any);
    onToolChange?.(tool);
  };

  const handleDeleteSelected = () => {
    const selected = getSelectedElements();
    selected.forEach(element => removeElement(element.id));
    clearSelection();
  };

  const tools = [
    {
      id: 'select',
      icon: IconPointer,
      label: '選択ツール',
      shortcut: 'V'
    },
    {
      id: 'pan',
      icon: IconArrowsMove,
      label: 'パンツール',
      shortcut: 'H'
    },
    {
      id: 'zoom',
      icon: IconZoomIn,
      label: 'ズームツール',
      shortcut: 'Z'
    },
    // 区切り線
    { divider: true },
    {
      id: 'point',
      icon: IconPoint,
      label: '点ツール',
      shortcut: 'P'
    },
    {
      id: 'line',
      icon: IconLine,
      label: '線分ツール',
      shortcut: 'L'
    },
    {
      id: 'polygon',
      icon: IconSquare,
      label: 'ポリゴンツール',
      shortcut: 'R'
    },
    {
      id: 'circle',
      icon: IconCircle,
      label: '円ツール',
      shortcut: 'C'
    },
    {
      id: 'text',
      icon: IconLetterT,
      label: 'テキストツール',
      shortcut: 'T'
    },
    // 区切り線
    { divider: true },
    {
      id: 'measure',
      icon: IconRuler,
      label: '距離測定ツール',
      shortcut: 'M'
    }
  ];

  const editActions = [
    {
      id: 'undo',
      icon: IconArrowBackUp,
      label: '元に戻す',
      shortcut: 'Ctrl+Z',
      action: onUndo,
      disabled: !canUndo
    },
    {
      id: 'redo',
      icon: IconArrowForwardUp,
      label: 'やり直し',
      shortcut: 'Ctrl+Y',
      action: onRedo,
      disabled: !canRedo
    },
    // 区切り線
    { divider: true },
    {
      id: 'copy',
      icon: IconCopy,
      label: 'コピー',
      shortcut: 'Ctrl+C',
      action: () => {
        // TODO: コピー機能の実装
        console.log('Copy selected elements');
      },
      disabled: getSelectedElements().length === 0
    },
    {
      id: 'delete',
      icon: IconTrash,
      label: '削除',
      shortcut: 'Delete',
      action: handleDeleteSelected,
      disabled: getSelectedElements().length === 0
    }
  ];

  const lineTypes = [
    { value: 'solid', label: '実線' },
    { value: 'dashed', label: '破線' },
    { value: 'dotted', label: '点線' },
    { value: 'dashdot', label: '一点鎖線' },
    { value: 'dashdotdot', label: '二点鎖線' }
  ];

  return (
    <Paper withBorder p="xs" style={{ backgroundColor: '#f8f9fa' }}>
      <Stack spacing="md">
        {/* 描画ツール */}
        <Group spacing="xs" wrap="nowrap">
          <Text size="xs" fw={500} c="dimmed" style={{ minWidth: 60 }}>
            ツール
          </Text>
          <Group spacing={4}>
            {tools.map((tool, index) => {
              if ('divider' in tool) {
                return <Divider key={index} orientation="vertical" />;
              }

              const Icon = tool.icon;
              const isActive = currentTool === tool.id;

              return (
                <Tooltip
                  key={tool.id}
                  label={`${tool.label} (${tool.shortcut})`}
                  position="bottom"
                >
                  <ActionIcon
                    variant={isActive ? 'filled' : 'subtle'}
                    color={isActive ? 'blue' : 'gray'}
                    onClick={() => handleToolChange(tool.id)}
                    disabled={disabled}
                    size="md"
                  >
                    <Icon size={16} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </Group>
        </Group>

        {/* 編集アクション */}
        <Group spacing="xs" wrap="nowrap">
          <Text size="xs" fw={500} c="dimmed" style={{ minWidth: 60 }}>
            編集
          </Text>
          <Group spacing={4}>
            {editActions.map((action, index) => {
              if ('divider' in action) {
                return <Divider key={index} orientation="vertical" />;
              }

              const Icon = action.icon;

              return (
                <Tooltip
                  key={action.id}
                  label={`${action.label} (${action.shortcut})`}
                  position="bottom"
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={action.action}
                    disabled={disabled || action.disabled}
                    size="md"
                  >
                    <Icon size={16} />
                  </ActionIcon>
                </Tooltip>
              );
            })}
          </Group>
        </Group>

        {/* スタイル設定 */}
        <Group spacing="xs" wrap="nowrap">
          <Text size="xs" fw={500} c="dimmed" style={{ minWidth: 60 }}>
            スタイル
          </Text>
          <Group spacing="xs">
            <ColorInput
              placeholder="線の色"
              value={settings.defaultLineColor}
              onChange={(color) => updateSettings({ defaultLineColor: color })}
              size="xs"
              style={{ width: 80 }}
              disabled={disabled}
            />

            <NumberInput
              placeholder="線幅"
              value={1}
              min={0.1}
              max={10}
              step={0.1}
              size="xs"
              style={{ width: 70 }}
              disabled={disabled}
            />

            <Select
              placeholder="線種"
              data={lineTypes}
              value="solid"
              size="xs"
              style={{ width: 100 }}
              disabled={disabled}
            />

            {(currentTool === 'point' || currentTool === 'text') && (
              <ColorInput
                placeholder="色"
                value={currentTool === 'point' ? settings.defaultPointColor : settings.defaultTextColor}
                onChange={(color) => {
                  if (currentTool === 'point') {
                    updateSettings({ defaultPointColor: color });
                  } else {
                    updateSettings({ defaultTextColor: color });
                  }
                }}
                size="xs"
                style={{ width: 80 }}
                disabled={disabled}
              />
            )}

            {currentTool === 'text' && (
              <NumberInput
                placeholder="フォントサイズ"
                value={16}
                min={8}
                max={72}
                step={1}
                size="xs"
                style={{ width: 90 }}
                disabled={disabled}
              />
            )}
          </Group>
        </Group>

        {/* 選択要素情報 */}
        {getSelectedElements().length > 0 && (
          <Group spacing="xs" wrap="nowrap">
            <Text size="xs" fw={500} c="dimmed" style={{ minWidth: 60 }}>
              選択中
            </Text>
            <Text size="xs" c="blue">
              {getSelectedElements().length}個の要素
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
};