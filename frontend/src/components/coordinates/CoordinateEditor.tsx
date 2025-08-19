import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Tabs,
  ActionIcon,
  Table,
  Badge,
  TextInput,
  Select,
  ScrollArea,
  MultiSelect,
  Checkbox,
  Modal,
  FileInput
} from '@mantine/core';
import {
  IconArrowLeft,
  IconMapPins,
  IconMap2,
  IconPlus,
  IconSearch,
  IconFilter,
  IconFilterOff,
  IconUsers,
  IconTrash,
  IconDownload,
  IconUpload,
  IconX
} from '@tabler/icons-react';
import type { Project } from '../../types/project';
import { CoordinateLotViewer } from '../viewer/CoordinateLotViewer';
import { 
  generateSimpleCoordinateData, 
  generateLotData, 
  generateLandownerData,
  formatLotNumber,
  getDefaultStakeTypes,
  getDefaultInstallationCategories,
  type CoordinatePoint as MockCoordinatePoint,
  type LotData as MockLotData,
  type LandownerData as MockLandownerData
} from '../../utils/mockDataGenerator';

interface CoordinateEditorProps {
  project: Project;
  onClose: () => void;
  initialTab?: 'coordinates' | 'lots';
}

export const CoordinateEditor: React.FC<CoordinateEditorProps> = ({
  project,
  onClose,
  initialTab = 'coordinates'
}) => {
  console.log('CoordinateEditor loaded with project:', project?.name, 'initialTab:', initialTab);
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);

  // 座標データ管理（共通のデータジェネレーターを使用）
  const [coordinateData, setCoordinateData] = useState(() => generateSimpleCoordinateData());
  const [lotData, setLotData] = useState(() => generateLotData());
  const [landownerData, setLandownerData] = useState(() => generateLandownerData());
  
  // 座標選択状態管理
  const [selectedCoordinates, setSelectedCoordinates] = useState<Set<string>>(new Set());
  const [showSIMModal, setShowSIMModal] = useState(false);
  const [simAction, setSIMAction] = useState<'read' | 'write'>('read');
  
  // インライン編集状態管理
  const [editingCoordId, setEditingCoordId] = useState<string | null>(null);
  const [editingCoordField, setEditingCoordField] = useState<string | null>(null);
  const [editingCoordValue, setEditingCoordValue] = useState<string>('');
  
  // フィルター状態管理（複数選択対応）
  const [filters, setFilters] = useState({
    search: '',
    type: [] as string[],
    assignee: [] as string[],
    status: [] as string[]
  });
  
  // バッジの色を取得する関数
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'benchmark': return 'blue';
      case 'control_point': return 'green';
      case 'boundary_point': return 'orange';
      default: return 'gray';
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'benchmark': return '基準点';
      case 'control_point': return '制御点';
      case 'boundary_point': return '境界点';
      default: return type;
    }
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case '未測量': return 'gray';
      case '測量中': return 'yellow';
      case '測量済み': return 'blue';
      case '検査済み': return 'green';
      case '要再測量': return 'red';
      default: return 'gray';
    }
  };
  
  // フィルター適用関数（複数選択対応）
  const filteredCoordinateData = coordinateData.filter(coord => {
    const searchMatch = !filters.search || 
      coord.pointName.toLowerCase().includes(filters.search.toLowerCase()) ||
      coord.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      coord.assignee?.toLowerCase().includes(filters.search.toLowerCase());
    
    const typeMatch = filters.type.length === 0 || filters.type.includes(coord.type);
    const assigneeMatch = filters.assignee.length === 0 || filters.assignee.includes(coord.assignee);
    const statusMatch = filters.status.length === 0 || filters.status.includes(coord.status);
    
    return searchMatch && typeMatch && assigneeMatch && statusMatch;
  });
  
  // フィルターリセット関数
  const resetFilters = () => {
    setFilters({
      search: '',
      type: [],
      assignee: [],
      status: []
    });
  };
  
  // アクティブフィルター数（複数選択対応）
  const activeFilterCount = [
    filters.search,
    ...filters.type,
    ...filters.assignee,
    ...filters.status
  ].filter(Boolean).length;
  
  // ユニークな値を取得する関数
  const getUniqueAssignees = () => {
    const assignees = [...new Set(coordinateData.map(coord => coord.assignee).filter(Boolean))];
    return assignees.sort();
  };
  
  const getUniqueStatuses = () => {
    const statuses = [...new Set(coordinateData.map(coord => coord.status).filter(Boolean))];
    return statuses.sort();
  };
  
  // 座標選択関数
  const handleCoordinateCheck = (coordinateId: string, checked: boolean) => {
    setSelectedCoordinates(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(coordinateId);
      } else {
        newSet.delete(coordinateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCoordinates(new Set(filteredCoordinateData.map(coord => coord.id)));
    } else {
      setSelectedCoordinates(new Set());
    }
  };

  const handleBulkDelete = () => {
    setCoordinateData(prev => prev.filter(coord => !selectedCoordinates.has(coord.id)));
    setSelectedCoordinates(new Set());
  };

  // 座標インライン編集関数
  const startCoordInlineEdit = (coordId: string, field: string, currentValue: string) => {
    setEditingCoordId(coordId);
    setEditingCoordField(field);
    setEditingCoordValue(currentValue);
  };

  const saveCoordInlineEdit = () => {
    if (editingCoordId && editingCoordField) {
      setCoordinateData(prev => prev.map(coord => 
        coord.id === editingCoordId 
          ? { 
              ...coord, 
              [editingCoordField]: editingCoordField === 'x' || editingCoordField === 'y' || editingCoordField === 'z'
                ? parseFloat(editingCoordValue) || 0 
                : editingCoordValue 
            }
          : coord
      ));
    }
    cancelCoordInlineEdit();
  };

  const cancelCoordInlineEdit = () => {
    setEditingCoordId(null);
    setEditingCoordField(null);
    setEditingCoordValue('');
  };

  const handleCoordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCoordInlineEdit();
    } else if (e.key === 'Escape') {
      cancelCoordInlineEdit();
    }
  };

  // SIM読込・書込関数
  const handleSIMRead = () => {
    setSIMAction('read');
    setShowSIMModal(true);
  };

  const handleSIMWrite = () => {
    setSIMAction('write');
    setShowSIMModal(true);
  };

  const handleSIMProcess = (file: File | null) => {
    if (!file) return;

    if (simAction === 'read') {
      // SIM読込処理
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const simData = parseSIMFile(content);
          
          // 座標データに追加
          const newCoordinates = simData.map((coord, index) => ({
            id: `sim_${Date.now()}_${index}`,
            pointName: coord.pointName || `SIM-${String(index + 1).padStart(3, '0')}`,
            type: 'boundary_point' as const,
            x: parseFloat(coord.x.toFixed(3)),
            y: parseFloat(coord.y.toFixed(3)),
            z: parseFloat(coord.z.toFixed(3)),
            description: `SIM読込座標点${index + 1}`,
            surveyDate: new Date().toISOString().split('T')[0],
            assignee: '未割当',
            status: '未測量'
          }));

          setCoordinateData(prev => [...prev, ...newCoordinates]);
          alert(`${newCoordinates.length}件の座標データをSIMファイルから読み込みました。`);
        } catch (error) {
          alert('SIMファイルの読み込みに失敗しました。ファイル形式を確認してください。');
          console.error('SIM読込エラー:', error);
        }
      };
      reader.readAsText(file);
    } else {
      // SIM書込処理
      const simContent = generateSIMFile(coordinateData);
      const blob = new Blob([simContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `coordinates_${new Date().toISOString().split('T')[0]}.sim`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert(`${coordinateData.length}件の座標データをSIMファイルに書き出しました。`);
    }

    setShowSIMModal(false);
  };

  // SIMファイル解析関数
  const parseSIMFile = (content: string) => {
    const lines = content.split('\n');
    const coordinates = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // SIMファイル形式: 点名,X座標,Y座標,Z座標
      const parts = trimmed.split(',');
      if (parts.length >= 4) {
        coordinates.push({
          pointName: parts[0].trim(),
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        });
      }
    }
    
    return coordinates;
  };

  // SIMファイル生成関数
  const generateSIMFile = (data: any[]) => {
    let content = '# 座標データ SIMファイル\n';
    content += '# 点名,X座標(m),Y座標(m),標高(m)\n';
    
    for (const coord of data) {
      content += `${coord.pointName},${coord.x.toFixed(3)},${coord.y.toFixed(3)},${coord.z.toFixed(3)}\n`;
    }
    
    return content;
  };

  
  // 地目バッジ色関数
  const getLandCategoryColor = (category: string) => {
    switch (category) {
      case '宅地': return 'blue';
      case '田': return 'green';
      case '畑': return 'yellow';
      case '山林': return 'teal';
      case '雑種地': return 'gray';
      default: return 'gray';
    }
  };
  
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1, marginRight: '33.333vw' }}>
        <Container size="xl" py={20}>
          {/* ヘッダー */}
          <Paper shadow="sm" p={20} mb={30} withBorder>
            <Group justify="space-between" mb="md">
              <Group>
                <ActionIcon variant="light" onClick={onClose}>
                  <IconArrowLeft size={18} />
                </ActionIcon>
                <div>
                  <Group gap="sm" align="center">
                    <IconMapPins size={24} color="#40c057" />
                    <Title order={2}>座標・地番管理</Title>
                  </Group>
                  <Text size="sm" c="dimmed">{project.name} - 測量基準点・境界点・地番の統合管理</Text>
                </div>
              </Group>
            </Group>
          </Paper>

          {/* タブとタブコンテンツ */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="coordinates" leftSection={<IconMapPins size={16} />}>
                座標管理
              </Tabs.Tab>
              <Tabs.Tab value="lots" leftSection={<IconMap2 size={16} />}>
                地番管理
              </Tabs.Tab>
              <Tabs.Tab value="landowners" leftSection={<IconUsers size={16} />}>
                地権者管理
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="coordinates" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">測量基準点・境界点の座標データを管理します - 各項目をクリックして直接編集できます</Text>
                    {activeFilterCount > 0 && (
                      <Text size="sm" c="orange" fw={600}>
                        {activeFilterCount}個のフィルター適用中 ({filteredCoordinateData.length}/{coordinateData.length}件表示)
                      </Text>
                    )}
                  </div>
                  
                  {/* フィルターコントロール */}
                  <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
                    <Group justify="space-between" align="flex-end">
                      <Group grow style={{ flex: 1 }}>
                        <TextInput
                          placeholder="点名、説明、担当者で検索..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          leftSection={<IconSearch size={16} />}
                          style={{ minWidth: '200px' }}
                        />
                        <MultiSelect
                          placeholder="種類でフィルター（複数選択可）"
                          value={filters.type}
                          onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                          data={[
                            { value: 'benchmark', label: '基準点' },
                            { value: 'control_point', label: '制御点' },
                            { value: 'boundary_point', label: '境界点' }
                          ]}
                          clearable
                          searchable
                        />
                        <MultiSelect
                          placeholder="担当者でフィルター（複数選択可）"
                          value={filters.assignee}
                          onChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
                          data={getUniqueAssignees().map(assignee => ({
                            value: assignee,
                            label: assignee
                          }))}
                          clearable
                          searchable
                        />
                        <MultiSelect
                          placeholder="状態でフィルター（複数選択可）"
                          value={filters.status}
                          onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                          data={getUniqueStatuses().map(status => ({
                            value: status,
                            label: status
                          }))}
                          clearable
                          searchable
                        />
                      </Group>
                      <Group gap="xs">
                        {activeFilterCount > 0 && (
                          <Button
                            variant="light"
                            color="orange"
                            size="sm"
                            onClick={resetFilters}
                            leftSection={<IconFilterOff size={16} />}
                          >
                            フィルタークリア
                          </Button>
                        )}
                        <Button
                          variant="filled"
                          color={activeFilterCount > 0 ? 'orange' : 'gray'}
                          size="sm"
                          leftSection={<IconFilter size={16} />}
                        >
                          {activeFilterCount > 0 ? `${activeFilterCount}個適用中` : 'フィルター'}
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th width={50}>
                            <Checkbox
                              checked={selectedCoordinates.size === filteredCoordinateData.length && filteredCoordinateData.length > 0}
                              indeterminate={selectedCoordinates.size > 0 && selectedCoordinates.size < filteredCoordinateData.length}
                              onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                            />
                          </Table.Th>
                          <Table.Th>点名</Table.Th>
                          <Table.Th>種類</Table.Th>
                          <Table.Th>X座標 (m)</Table.Th>
                          <Table.Th>Y座標 (m)</Table.Th>
                          <Table.Th>標高 (m)</Table.Th>
                          <Table.Th>杭種</Table.Th>
                          <Table.Th>設置区分</Table.Th>
                          <Table.Th>担当者</Table.Th>
                          <Table.Th>状態</Table.Th>
                          <Table.Th>測量日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {filteredCoordinateData.map((coord) => (
                        <Table.Tr key={coord.id}>
                          <Table.Td>
                            <Checkbox
                              checked={selectedCoordinates.has(coord.id)}
                              onChange={(event) => handleCoordinateCheck(coord.id, event.currentTarget.checked)}
                            />
                          </Table.Td>
                          <Table.Td>
                            <div>
                              {editingCoordId === coord.id && editingCoordField === 'pointName' ? (
                                <TextInput
                                  value={editingCoordValue}
                                  onChange={(e) => setEditingCoordValue(e.target.value)}
                                  onKeyDown={handleCoordKeyPress}
                                  onBlur={saveCoordInlineEdit}
                                  size="xs"
                                  autoFocus
                                  style={{ marginBottom: 4 }}
                                />
                              ) : (
                                <Text 
                                  fw={600}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => startCoordInlineEdit(coord.id, 'pointName', coord.pointName)}
                                >
                                  {coord.pointName}
                                </Text>
                              )}
                              {editingCoordId === coord.id && editingCoordField === 'description' ? (
                                <TextInput
                                  value={editingCoordValue}
                                  onChange={(e) => setEditingCoordValue(e.target.value)}
                                  onKeyDown={handleCoordKeyPress}
                                  onBlur={saveCoordInlineEdit}
                                  size="xs"
                                  autoFocus
                                />
                              ) : (
                                <Text 
                                  size="xs" 
                                  c="dimmed"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => startCoordInlineEdit(coord.id, 'description', coord.description || '')}
                                >
                                  {coord.description}
                                </Text>
                              )}
                            </div>
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'type' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                data={[
                                  { value: 'benchmark', label: '基準点' },
                                  { value: 'control_point', label: '制御点' },
                                  { value: 'boundary_point', label: '境界点' }
                                ]}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getTypeBadgeColor(coord.type)} 
                                variant="light"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'type', coord.type)}
                              >
                                {getTypeLabel(coord.type)}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'x' ? (
                              <TextInput
                                type="number"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                                step="0.001"
                                style={{ fontFamily: 'monospace', width: '100px' }}
                              />
                            ) : (
                              <Text 
                                size="sm" 
                                style={{ fontFamily: 'monospace', cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'x', coord.x.toString())}
                              >
                                {coord.x.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'y' ? (
                              <TextInput
                                type="number"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                                step="0.001"
                                style={{ fontFamily: 'monospace', width: '100px' }}
                              />
                            ) : (
                              <Text 
                                size="sm" 
                                style={{ fontFamily: 'monospace', cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'y', coord.y.toString())}
                              >
                                {coord.y.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'z' ? (
                              <TextInput
                                type="number"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                                step="0.001"
                                style={{ fontFamily: 'monospace', width: '100px' }}
                              />
                            ) : (
                              <Text 
                                size="sm" 
                                style={{ fontFamily: 'monospace', cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'z', coord.z.toString())}
                              >
                                {coord.z.toFixed(3)}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'stakeType' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                data={getDefaultStakeTypes()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'stakeType', coord.stakeType || '')}
                              >
                                {coord.stakeType || '-'}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'installationCategory' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                data={getDefaultInstallationCategories()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'installationCategory', coord.installationCategory || '')}
                              >
                                {coord.installationCategory || '-'}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'assignee' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                data={getUniqueAssignees()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm" 
                                c={coord.assignee === '未割当' ? 'dimmed' : undefined}
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'assignee', coord.assignee)}
                              >
                                {coord.assignee}
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'status' ? (
                              <Select
                                value={editingCoordValue}
                                onChange={(value) => {
                                  setEditingCoordValue(value || '');
                                  setTimeout(saveCoordInlineEdit, 100);
                                }}
                                data={getUniqueStatuses()}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Badge 
                                color={getStatusBadgeColor(coord.status)} 
                                variant="light" 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'status', coord.status)}
                              >
                                {coord.status}
                              </Badge>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {editingCoordId === coord.id && editingCoordField === 'surveyDate' ? (
                              <TextInput
                                type="date"
                                value={editingCoordValue}
                                onChange={(e) => setEditingCoordValue(e.target.value)}
                                onKeyDown={handleCoordKeyPress}
                                onBlur={saveCoordInlineEdit}
                                size="xs"
                                autoFocus
                              />
                            ) : (
                              <Text 
                                size="sm"
                                style={{ cursor: 'pointer' }}
                                onClick={() => startCoordInlineEdit(coord.id, 'surveyDate', coord.surveyDate)}
                              >
                                {coord.surveyDate}
                              </Text>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <div>
                      <Text size="sm" c="dimmed">
                        {activeFilterCount > 0 
                          ? `${filteredCoordinateData.length}/${coordinateData.length} 件の座標データを表示中` 
                          : `${coordinateData.length} 件の座標データが登録されています`
                        }
                      </Text>
                      {selectedCoordinates.size > 0 && (
                        <Text size="sm" c="blue" fw={600}>
                          {selectedCoordinates.size} 件選択中
                        </Text>
                      )}
                    </div>
                    <Group>
                      {selectedCoordinates.size > 0 && (
                        <Button 
                          leftSection={<IconTrash size={16} />} 
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={handleBulkDelete}
                        >
                          選択した座標を削除 ({selectedCoordinates.size})
                        </Button>
                      )}
                      <Button 
                        leftSection={<IconDownload size={16} />} 
                        size="sm"
                        variant="light"
                        color="blue"
                        onClick={handleSIMRead}
                      >
                        SIM読込
                      </Button>
                      <Button 
                        leftSection={<IconUpload size={16} />} 
                        size="sm"
                        variant="light"
                        color="green"
                        onClick={handleSIMWrite}
                      >
                        SIM書込
                      </Button>
                      <Button leftSection={<IconPlus size={16} />} size="sm">
                        座標点追加
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="lots" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">土地の地番・地目・面積データを管理します（座標依存）</Text>
                  </div>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>地番</Table.Th>
                          <Table.Th>地目</Table.Th>
                          <Table.Th>面積 (㎡)</Table.Th>
                          <Table.Th>構成点数</Table.Th>
                          <Table.Th>所在地</Table.Th>
                          <Table.Th>所有者</Table.Th>
                          <Table.Th>登記日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lotData.map((lot) => (
                          <Table.Tr key={lot.id}>
                            <Table.Td>
                              <div>
                                <Text fw={600}>{formatLotNumber(lot.parentNumber, lot.childNumber)}</Text>
                                {lot.description && (
                                  <Text size="xs" c="dimmed">{lot.description}</Text>
                                )}
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={getLandCategoryColor(lot.landCategory)} variant="light">
                                {lot.landCategory}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {lot.area.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="outline" size="sm">
                                {lot.coordinates.length}点
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.address}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.owner}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{lot.registrationDate}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                      {lotData.length} 件の地番データが登録されています
                    </Text>
                    <Button leftSection={<IconPlus size={16} />} size="sm">
                      地番追加
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="landowners" pt="md">
              <Paper shadow="sm" p={20} withBorder>
                <Stack gap="md">
                  <div>
                    <Text size="sm" c="dimmed">地権者・土地所有者の情報を管理します</Text>
                  </div>
                  
                  <ScrollArea h={400} style={{ width: '100%' }}>
                    <Table striped highlightOnHover withTableBorder stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>氏名・法人名</Table.Th>
                          <Table.Th>種別</Table.Th>
                          <Table.Th>住所</Table.Th>
                          <Table.Th>電話番号</Table.Th>
                          <Table.Th>メールアドレス</Table.Th>
                          <Table.Th>所有地数</Table.Th>
                          <Table.Th>総面積 (㎡)</Table.Th>
                          <Table.Th>登録日</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {landownerData.map((landowner) => (
                          <Table.Tr key={landowner.id}>
                            <Table.Td>
                              <Text fw={600}>{landowner.name}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color={landowner.type === 'company' ? 'blue' : 'green'} variant="light">
                                {landowner.type === 'company' ? '法人' : '個人'}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{landowner.address}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.phone}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.email}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="outline" size="sm">
                                {landowner.landCount}件
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" style={{ fontFamily: 'monospace' }}>
                                {landowner.totalLandArea.toFixed(2)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{landowner.registrationDate}</Text>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                  
                  <Group justify="space-between" align="center">
                    <Text size="sm" c="dimmed">
                      {landownerData.length} 件の地権者データが登録されています
                    </Text>
                    <Button leftSection={<IconPlus size={16} />} size="sm">
                      地権者追加
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </div>
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
          lotNumber: formatLotNumber(lot.parentNumber, lot.childNumber),
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
      />

      {/* SIM読込・書込モーダル */}
      {showSIMModal && (
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
          onClick={() => setShowSIMModal(false)}
        >
          <Paper
            shadow="xl"
            p="xl"
            style={{
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Group justify="space-between" mb="md">
              <Title order={3}>
                {simAction === 'read' ? 'SIM読込' : 'SIM書込'}
              </Title>
              <ActionIcon
                variant="subtle"
                onClick={() => setShowSIMModal(false)}
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>
            
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                {simAction === 'read' 
                  ? 'SIMファイルから座標データを読み込みます。ファイルを選択してください。'
                  : '現在の座標データをSIMファイル形式で書き出します。'
                }
              </Text>
              
              {simAction === 'read' && (
                <FileInput
                  label="SIMファイル"
                  placeholder="ファイルを選択..."
                  accept=".sim,.txt"
                  onChange={handleSIMProcess}
                />
              )}
              
              {simAction === 'write' && (
                <Group justify="flex-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowSIMModal(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={() => handleSIMProcess(null)}
                    leftSection={<IconDownload size={16} />}
                  >
                    SIMファイル書き出し
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>
        </div>
      )}
    </div>
  );
};