import React, { useState, useEffect } from 'react';
import {
  Paper,
  Stack,
  Text,
  TextInput,
  NumberInput,
  ColorInput,
  Select,
  Switch,
  Button,
  Group,
  Divider,
  Accordion,
  Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconSettings, IconEye, IconEyeOff, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useDrawingStore } from '../../modules/drawing/DrawingStore';
import { DrawingElement } from '../../types/drawing';

interface PropertiesPanelProps {
  onElementUpdate?: (element: DrawingElement) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  onElementUpdate
}) => {
  const { 
    getSelectedElements, 
    updateElement, 
    settings, 
    updateSettings 
  } = useDrawingStore();

  const [selectedElements, setSelectedElements] = useState<DrawingElement[]>([]);
  const [editingElement, setEditingElement] = useState<DrawingElement | null>(null);

  // 選択要素の更新を監視
  useEffect(() => {
    const elements = getSelectedElements();
    setSelectedElements(elements);
    setEditingElement(elements.length === 1 ? elements[0] : null);
  }, [getSelectedElements]);

  const elementForm = useForm({
    initialValues: {
      visible: true,
      locked: false,
      color: '#000000',
      lineWidth: 1,
      layer: 'default'
    }
  });

  // 編集対象が変更された時にフォームを更新
  useEffect(() => {
    if (editingElement) {
      elementForm.setValues({
        visible: editingElement.visible,
        locked: editingElement.locked,
        color: editingElement.color || '#000000',
        lineWidth: (editingElement as any).lineWidth || 1,
        layer: editingElement.layer || 'default'
      });
    }
  }, [editingElement]);

  const handleElementPropertyChange = (field: string, value: any) => {
    if (!editingElement) return;

    const updates = { ...editingElement, [field]: value };
    updateElement(editingElement.id, updates);
    onElementUpdate?.(updates as DrawingElement);
  };

  const handleBatchPropertyChange = (field: string, value: any) => {
    selectedElements.forEach(element => {
      const updates = { ...element, [field]: value };
      updateElement(element.id, updates);
      onElementUpdate?.(updates as DrawingElement);
    });
  };

  const getElementTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      'line': '線分',
      'point': '点',
      'text': 'テキスト',
      'polygon': 'ポリゴン',
      'circle': '円',
      'arc': '円弧'
    };
    return typeNames[type] || type;
  };

  const getElementDescription = (element: DrawingElement) => {
    switch (element.type) {
      case 'line':
        const lineEl = element as any;
        return `開始点: (${lineEl.startPoint?.x?.toFixed(2)}, ${lineEl.startPoint?.y?.toFixed(2)})`;
      case 'point':
        const pointEl = element as any;
        return `座標: (${pointEl.position?.x?.toFixed(2)}, ${pointEl.position?.y?.toFixed(2)})`;
      case 'text':
        const textEl = element as any;
        return `内容: "${textEl.text}"`;
      case 'polygon':
        const polyEl = element as any;
        return `頂点数: ${polyEl.points?.length || 0}個`;
      default:
        return `ID: ${element.id.substring(0, 8)}...`;
    }
  };

  const lineTypes = [
    { value: 'solid', label: '実線' },
    { value: 'dashed', label: '破線' },
    { value: 'dotted', label: '点線' },
    { value: 'dashdot', label: '一点鎖線' }
  ];

  const layers = [
    { value: 'default', label: 'デフォルト' },
    { value: 'construction', label: '構造物' },
    { value: 'boundary', label: '境界' },
    { value: 'text', label: '文字' },
    { value: 'dimension', label: '寸法' }
  ];

  return (
    <Paper withBorder p="md" style={{ width: 300, height: '100%' }}>
      <Stack spacing="md">
        <Group justify="space-between">
          <Text fw={600} size="sm">プロパティ</Text>
          <IconSettings size={16} />
        </Group>

        <Divider />

        {/* 選択要素情報 */}
        {selectedElements.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            要素を選択してください
          </Text>
        ) : (
          <Accordion defaultValue="selection" variant="contained">
            <Accordion.Item value="selection">
              <Accordion.Control>
                <Group justify="space-between">
                  <Text size="sm">選択要素</Text>
                  <Badge size="sm" variant="light">
                    {selectedElements.length}個
                  </Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack spacing="xs">
                  {selectedElements.slice(0, 5).map((element) => (
                    <Group key={element.id} justify="space-between" p="xs" style={{
                      backgroundColor: editingElement?.id === element.id ? '#e7f5ff' : '#f8f9fa',
                      borderRadius: 4,
                      cursor: 'pointer'
                    }} onClick={() => setEditingElement(element)}>
                      <div>
                        <Text size="xs" fw={500}>
                          {getElementTypeName(element.type)}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {getElementDescription(element)}
                        </Text>
                      </div>
                      <Group spacing={4}>
                        {!element.visible && <IconEyeOff size={12} color="gray" />}
                        {element.locked && <IconLock size={12} color="gray" />}
                      </Group>
                    </Group>
                  ))}
                  {selectedElements.length > 5 && (
                    <Text size="xs" c="dimmed" ta="center">
                      他 {selectedElements.length - 5}個...
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            {/* 要素プロパティ編集 */}
            {editingElement && (
              <Accordion.Item value="properties">
                <Accordion.Control>
                  <Text size="sm">要素プロパティ</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="md">
                    <Group grow>
                      <Switch
                        label="表示"
                        checked={editingElement.visible}
                        onChange={(event) => 
                          handleElementPropertyChange('visible', event.currentTarget.checked)
                        }
                        thumbIcon={
                          editingElement.visible ? (
                            <IconEye size={12} stroke={2.5} />
                          ) : (
                            <IconEyeOff size={12} stroke={2.5} />
                          )
                        }
                      />
                      <Switch
                        label="ロック"
                        checked={editingElement.locked}
                        onChange={(event) => 
                          handleElementPropertyChange('locked', event.currentTarget.checked)
                        }
                        thumbIcon={
                          editingElement.locked ? (
                            <IconLock size={12} stroke={2.5} />
                          ) : (
                            <IconLockOpen size={12} stroke={2.5} />
                          )
                        }
                      />
                    </Group>

                    <Select
                      label="レイヤー"
                      data={layers}
                      value={editingElement.layer || 'default'}
                      onChange={(value) => handleElementPropertyChange('layer', value)}
                    />

                    {(editingElement.type === 'line' || editingElement.type === 'polygon') && (
                      <>
                        <ColorInput
                          label="線の色"
                          value={(editingElement as any).color || '#000000'}
                          onChange={(color) => handleElementPropertyChange('color', color)}
                        />
                        <NumberInput
                          label="線幅"
                          value={(editingElement as any).lineWidth || 1}
                          min={0.1}
                          max={10}
                          step={0.1}
                          onChange={(value) => handleElementPropertyChange('lineWidth', value)}
                        />
                        <Select
                          label="線種"
                          data={lineTypes}
                          value={(editingElement as any).lineType || 'solid'}
                          onChange={(value) => handleElementPropertyChange('lineType', value)}
                        />
                      </>
                    )}

                    {editingElement.type === 'point' && (
                      <>
                        <ColorInput
                          label="色"
                          value={(editingElement as any).color || '#ff0000'}
                          onChange={(color) => handleElementPropertyChange('color', color)}
                        />
                        <NumberInput
                          label="サイズ"
                          value={(editingElement as any).size || 3}
                          min={1}
                          max={20}
                          step={1}
                          onChange={(value) => handleElementPropertyChange('size', value)}
                        />
                      </>
                    )}

                    {editingElement.type === 'text' && (
                      <>
                        <TextInput
                          label="テキスト"
                          value={(editingElement as any).text || ''}
                          onChange={(event) => 
                            handleElementPropertyChange('text', event.currentTarget.value)
                          }
                        />
                        <ColorInput
                          label="文字色"
                          value={(editingElement as any).color || '#000000'}
                          onChange={(color) => handleElementPropertyChange('color', color)}
                        />
                        <NumberInput
                          label="フォントサイズ"
                          value={(editingElement as any).fontSize || 16}
                          min={8}
                          max={72}
                          step={1}
                          onChange={(value) => handleElementPropertyChange('fontSize', value)}
                        />
                      </>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* 一括編集 */}
            {selectedElements.length > 1 && (
              <Accordion.Item value="batch">
                <Accordion.Control>
                  <Text size="sm">一括編集</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack spacing="md">
                    <Group grow>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => handleBatchPropertyChange('visible', true)}
                      >
                        すべて表示
                      </Button>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => handleBatchPropertyChange('visible', false)}
                      >
                        すべて非表示
                      </Button>
                    </Group>
                    <Group grow>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => handleBatchPropertyChange('locked', true)}
                      >
                        すべてロック
                      </Button>
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => handleBatchPropertyChange('locked', false)}
                      >
                        すべてロック解除
                      </Button>
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* 描画設定 */}
            <Accordion.Item value="settings">
              <Accordion.Control>
                <Text size="sm">描画設定</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack spacing="md">
                  <Switch
                    label="グリッド表示"
                    checked={settings.gridVisible}
                    onChange={(event) => 
                      updateSettings({ gridVisible: event.currentTarget.checked })
                    }
                  />
                  <Switch
                    label="グリッドスナップ"
                    checked={settings.snapToGrid}
                    onChange={(event) => 
                      updateSettings({ snapToGrid: event.currentTarget.checked })
                    }
                  />
                  <NumberInput
                    label="グリッドサイズ"
                    value={settings.gridSize}
                    min={1}
                    max={100}
                    step={1}
                    onChange={(value) => updateSettings({ gridSize: value || 10 })}
                  />
                  <ColorInput
                    label="背景色"
                    value={settings.backgroundColor}
                    onChange={(color) => updateSettings({ backgroundColor: color })}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Paper>
  );
};