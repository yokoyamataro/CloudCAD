import React, { useState } from 'react';
import {
  Paper,
  Stack,
  Text,
  Group,
  ActionIcon,
  Button,
  Modal,
  TextInput,
  ColorInput,
  NumberInput,
  Select,
  Switch,
  Menu,
  Tooltip,
  Badge,
  ScrollArea,
  Divider
} from '@mantine/core';
import {
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconCopy,
  IconTrash,
  IconArrowUp,
  IconArrowDown,
  IconPalette,
  IconLayersLinked
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLayer } from '../../hooks/useLayer';
import { Layer, CreateLayerRequest, STANDARD_LAYERS } from '../../types/layer';

interface LayerPanelProps {
  projectId: string;
  height?: number;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  projectId,
  height = 400
}) => {
  const {
    layers,
    activeLayerId,
    selectedLayerIds,
    createLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    setActiveLayer,
    selectLayer,
    clearLayerSelection,
    moveLayerUp,
    moveLayerDown,
    reorderLayers,
    createStandardLayers
  } = useLayer();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState<Layer | null>(null);
  const [showStandardLayersModal, setShowStandardLayersModal] = useState(false);

  const createForm = useForm<CreateLayerRequest>({
    initialValues: {
      name: '',
      color: '#000000',
      lineType: 'solid',
      lineWidth: 1.0,
      visible: true,
      locked: false,
      projectId
    },
    validate: {
      name: (value) => {
        if (!value) return 'レイヤー名は必須です';
        if (layers.some(layer => layer.name === value)) {
          return '同じ名前のレイヤーが既に存在します';
        }
        return null;
      }
    }
  });

  const editForm = useForm({
    initialValues: {
      name: '',
      color: '#000000',
      lineType: 'solid',
      lineWidth: 1.0,
      visible: true,
      locked: false
    }
  });

  const handleCreateLayer = async (values: CreateLayerRequest) => {
    try {
      await createLayer(values);
      setShowCreateModal(false);
      createForm.reset();
    } catch (error) {
      console.error('Failed to create layer:', error);
    }
  };

  const handleEditLayer = async (values: any) => {
    if (!editingLayer) return;

    try {
      await updateLayer(editingLayer.id, values);
      setEditingLayer(null);
      editForm.reset();
    } catch (error) {
      console.error('Failed to update layer:', error);
    }
  };

  const handleDeleteLayer = async (layerId: string) => {
    if (window.confirm('このレイヤーを削除しますか？関連する図形要素も削除されます。')) {
      try {
        await deleteLayer(layerId);
      } catch (error) {
        console.error('Failed to delete layer:', error);
      }
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(layers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrder = items.map(item => item.id);
    reorderLayers(newOrder);
  };

  const handleCreateStandardLayers = async () => {
    try {
      await createStandardLayers(projectId);
      setShowStandardLayersModal(false);
    } catch (error) {
      console.error('Failed to create standard layers:', error);
    }
  };

  const openEditModal = (layer: Layer) => {
    setEditingLayer(layer);
    editForm.setValues({
      name: layer.name,
      color: layer.color,
      lineType: layer.lineType,
      lineWidth: layer.lineWidth,
      visible: layer.visible,
      locked: layer.locked
    });
  };

  const lineTypeOptions = [
    { value: 'solid', label: '実線' },
    { value: 'dashed', label: '破線' },
    { value: 'dotted', label: '点線' },
    { value: 'dashdot', label: '一点鎖線' }
  ];

  const layersByOrder = [...layers].sort((a, b) => b.order - a.order); // 上位が先頭

  return (
    <>
      <Paper withBorder p="sm" style={{ height }}>
        <Stack spacing="sm" h="100%">
          {/* ヘッダー */}
          <Group justify="space-between">
            <Group spacing="xs">
              <IconLayersLinked size={16} />
              <Text fw={600} size="sm">レイヤー</Text>
              <Badge size="sm" variant="light">
                {layers.length}
              </Badge>
            </Group>
            <Group spacing="xs">
              <Tooltip label="標準レイヤー作成">
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => setShowStandardLayersModal(true)}
                >
                  <IconPalette size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="新規レイヤー">
                <ActionIcon
                  variant="light"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          <Divider />

          {/* レイヤーリスト */}
          <ScrollArea flex={1}>
            {layers.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                レイヤーがありません
              </Text>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="layers">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <Stack spacing="xs">
                        {layersByOrder.map((layer, index) => (
                          <Draggable
                            key={layer.id}
                            draggableId={layer.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Paper
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                p="xs"
                                withBorder
                                style={{
                                  backgroundColor: activeLayerId === layer.id
                                    ? '#e7f5ff'
                                    : selectedLayerIds.includes(layer.id)
                                    ? '#f0f8ff'
                                    : '#fff',
                                  cursor: 'pointer',
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                  ...provided.draggableProps.style
                                }}
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    selectLayer(layer.id, true);
                                  } else {
                                    setActiveLayer(layer.id);
                                    clearLayerSelection();
                                  }
                                }}
                              >
                                <Group justify="space-between" wrap="nowrap">
                                  <Group spacing="xs" flex={1}>
                                    {/* ドラッグハンドル */}
                                    <div {...provided.dragHandleProps}>
                                      <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color="gray"
                                      >
                                        <IconDotsVertical size={12} />
                                      </ActionIcon>
                                    </div>

                                    {/* レイヤーカラー */}
                                    <div
                                      style={{
                                        width: 16,
                                        height: 16,
                                        backgroundColor: layer.color,
                                        border: '1px solid #ccc',
                                        borderRadius: 2
                                      }}
                                    />

                                    {/* レイヤー名 */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <Text size="sm" truncate>
                                        {layer.name}
                                      </Text>
                                    </div>
                                  </Group>

                                  {/* 操作ボタン */}
                                  <Group spacing={2}>
                                    <Tooltip label={layer.visible ? '非表示' : '表示'}>
                                      <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color={layer.visible ? 'blue' : 'gray'}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLayerVisibility(layer.id);
                                        }}
                                      >
                                        {layer.visible ? (
                                          <IconEye size={12} />
                                        ) : (
                                          <IconEyeOff size={12} />
                                        )}
                                      </ActionIcon>
                                    </Tooltip>

                                    <Tooltip label={layer.locked ? 'ロック解除' : 'ロック'}>
                                      <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color={layer.locked ? 'red' : 'gray'}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLayerLock(layer.id);
                                        }}
                                      >
                                        {layer.locked ? (
                                          <IconLock size={12} />
                                        ) : (
                                          <IconLockOpen size={12} />
                                        )}
                                      </ActionIcon>
                                    </Tooltip>

                                    {/* レイヤーメニュー */}
                                    <Menu position="bottom-end">
                                      <Menu.Target>
                                        <ActionIcon
                                          variant="subtle"
                                          size="xs"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <IconDotsVertical size={12} />
                                        </ActionIcon>
                                      </Menu.Target>
                                      <Menu.Dropdown>
                                        <Menu.Item
                                          leftSection={<IconEdit size={14} />}
                                          onClick={() => openEditModal(layer)}
                                        >
                                          編集
                                        </Menu.Item>
                                        <Menu.Item
                                          leftSection={<IconCopy size={14} />}
                                          onClick={() => duplicateLayer(layer.id)}
                                        >
                                          複製
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                          leftSection={<IconArrowUp size={14} />}
                                          onClick={() => moveLayerUp(layer.id)}
                                        >
                                          上に移動
                                        </Menu.Item>
                                        <Menu.Item
                                          leftSection={<IconArrowDown size={14} />}
                                          onClick={() => moveLayerDown(layer.id)}
                                        >
                                          下に移動
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                          color="red"
                                          leftSection={<IconTrash size={14} />}
                                          onClick={() => handleDeleteLayer(layer.id)}
                                        >
                                          削除
                                        </Menu.Item>
                                      </Menu.Dropdown>
                                    </Menu>
                                  </Group>
                                </Group>
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </ScrollArea>
        </Stack>
      </Paper>

      {/* レイヤー作成モーダル */}
      <Modal
        opened={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新規レイヤー作成"
        size="sm"
      >
        <form onSubmit={createForm.onSubmit(handleCreateLayer)}>
          <Stack spacing="md">
            <TextInput
              label="レイヤー名"
              placeholder="レイヤー名を入力"
              {...createForm.getInputProps('name')}
            />
            <ColorInput
              label="色"
              {...createForm.getInputProps('color')}
            />
            <Select
              label="線種"
              data={lineTypeOptions}
              {...createForm.getInputProps('lineType')}
            />
            <NumberInput
              label="線幅"
              min={0.1}
              max={10}
              step={0.1}
              {...createForm.getInputProps('lineWidth')}
            />
            <Group grow>
              <Switch
                label="表示"
                {...createForm.getInputProps('visible', { type: 'checkbox' })}
              />
              <Switch
                label="ロック"
                {...createForm.getInputProps('locked', { type: 'checkbox' })}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
              <Button type="submit">作成</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* レイヤー編集モーダル */}
      <Modal
        opened={!!editingLayer}
        onClose={() => setEditingLayer(null)}
        title="レイヤー編集"
        size="sm"
      >
        <form onSubmit={editForm.onSubmit(handleEditLayer)}>
          <Stack spacing="md">
            <TextInput
              label="レイヤー名"
              {...editForm.getInputProps('name')}
            />
            <ColorInput
              label="色"
              {...editForm.getInputProps('color')}
            />
            <Select
              label="線種"
              data={lineTypeOptions}
              {...editForm.getInputProps('lineType')}
            />
            <NumberInput
              label="線幅"
              min={0.1}
              max={10}
              step={0.1}
              {...editForm.getInputProps('lineWidth')}
            />
            <Group grow>
              <Switch
                label="表示"
                {...editForm.getInputProps('visible', { type: 'checkbox' })}
              />
              <Switch
                label="ロック"
                {...editForm.getInputProps('locked', { type: 'checkbox' })}
              />
            </Group>
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setEditingLayer(null)}>
                キャンセル
              </Button>
              <Button type="submit">更新</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* 標準レイヤー作成モーダル */}
      <Modal
        opened={showStandardLayersModal}
        onClose={() => setShowStandardLayersModal(false)}
        title="標準レイヤー作成"
        size="md"
      >
        <Stack spacing="md">
          <Text size="sm" c="dimmed">
            地籍調査に使用される標準的なレイヤーを一括作成します。
          </Text>
          <ScrollArea h={200}>
            <Stack spacing="xs">
              {STANDARD_LAYERS.map((layer, index) => (
                <Group key={index} justify="space-between" p="xs" style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: 4
                }}>
                  <Group spacing="xs">
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: layer.color,
                        border: '1px solid #ccc',
                        borderRadius: 2
                      }}
                    />
                    <div>
                      <Text size="sm" fw={500}>{layer.name}</Text>
                      <Text size="xs" c="dimmed">{layer.description}</Text>
                    </div>
                  </Group>
                </Group>
              ))}
            </Stack>
          </ScrollArea>
          <Group justify="flex-end">
            <Button variant="outline" onClick={() => setShowStandardLayersModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateStandardLayers}>
              {STANDARD_LAYERS.length}個のレイヤーを作成
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};