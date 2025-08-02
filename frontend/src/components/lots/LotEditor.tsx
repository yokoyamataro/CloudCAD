import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  ActionIcon,
  Badge,
  TextInput,
  Select,
  NumberInput
} from '@mantine/core';
import {
  IconArrowLeft,
  IconPlus,
  IconEdit,
  IconTrash,
  IconMap2,
  IconMapPins
} from '@tabler/icons-react';
import type { Project } from '../../types/project';
import { CoordinateLotViewer } from '../viewer/CoordinateLotViewer';

interface LotEditorProps {
  project: Project;
  onClose: () => void;
}

interface LotData {
  id: string;
  lotNumber: string;
  landCategory: string;
  area: number;
  address: string;
  owner: string;
  registrationDate: string;
  description?: string;
  coordinates: string[]; // 構成座標点のIDリスト
}

interface CoordinatePoint {
  id: string;
  pointName: string;
  x: number;
  y: number;
  z: number;
  type: 'benchmark' | 'control_point' | 'boundary_point';
}

export const LotEditor: React.FC<LotEditorProps> = ({
  project,
  onClose
}) => {
  // 座標点データ（サンプル）
  const [availableCoordinates] = useState<CoordinatePoint[]>([
    {
      id: 'c1',
      pointName: 'BP-1',
      x: 45000.123,
      y: -12000.456,
      z: 12.345,
      type: 'benchmark'
    },
    {
      id: 'c2',
      pointName: 'CP-1',
      x: 45100.789,
      y: -12050.234,
      z: 11.987,
      type: 'control_point'
    },
    {
      id: 'c3',
      pointName: 'BP-2',
      x: 45200.345,
      y: -12100.678,
      z: 13.123,
      type: 'boundary_point'
    },
    {
      id: 'c4',
      pointName: 'BP-3',
      x: 45050.567,
      y: -12075.890,
      z: 12.678,
      type: 'boundary_point'
    }
  ]);

  // 地番データ管理
  const [lotData, setLotData] = useState<LotData[]>([
    {
      id: '1',
      lotNumber: '123番地1',
      landCategory: '宅地',
      area: 125.50,
      address: '東京都渋谷区神宮前1-123-1',
      owner: '田中太郎',
      registrationDate: '2024-01-15',
      description: '角地、南向き',
      coordinates: ['c1', 'c2', 'c4']
    },
    {
      id: '2',
      lotNumber: '123番地2',
      landCategory: '宅地',
      area: 98.75,
      address: '東京都渋谷区神宮前1-123-2',
      owner: '佐藤花子',
      registrationDate: '2024-01-16',
      description: '旗竿地',
      coordinates: ['c2', 'c3', 'c4']
    },
    {
      id: '3',
      lotNumber: '124番地',
      landCategory: '雑種地',
      area: 200.00,
      address: '東京都渋谷区神宮前1-124',
      owner: '山田商事株式会社',
      registrationDate: '2024-01-17',
      description: '駐車場用地',
      coordinates: ['c1', 'c3']
    }
  ]);
  
  const [showLotModal, setShowLotModal] = useState(false);
  const [editingLot, setEditingLot] = useState<LotData | null>(null);
  const [showCoordinateSelectModal, setShowCoordinateSelectModal] = useState(false);
  const [selectedLotForCoordinates, setSelectedLotForCoordinates] = useState<LotData | null>(null);
  const [hoveredLot, setHoveredLot] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });
  const [coordinateModalPosition, setCoordinateModalPosition] = useState({ x: 150, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });

  // ドラッグ関数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      offsetX: e.clientX - modalPosition.x,
      offsetY: e.clientY - modalPosition.y
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      const newX = e.clientX - dragRef.current.offsetX;
      const newY = e.clientY - dragRef.current.offsetY;
      
      // 画面範囲内に制限
      const maxX = window.innerWidth - 800;
      const maxY = window.innerHeight - 600;
      
      setModalPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, modalPosition]);

  // 地番管理関数
  const handleAddLot = () => {
    setEditingLot(null);
    setShowLotModal(true);
  };
  
  const handleEditLot = (lot: LotData) => {
    setEditingLot(lot);
    setShowLotModal(true);
  };
  
  const handleDeleteLot = (id: string) => {
    setLotData(prev => prev.filter(lot => lot.id !== id));
  };

  const handleEditCoordinates = (lot: LotData) => {
    setSelectedLotForCoordinates(lot);
    setShowCoordinateSelectModal(true);
  };

  const handleSaveCoordinates = (selectedCoordinateIds: string[]) => {
    if (selectedLotForCoordinates) {
      setLotData(prev => prev.map(lot => 
        lot.id === selectedLotForCoordinates.id 
          ? { ...lot, coordinates: selectedCoordinateIds }
          : lot
      ));
    }
    setShowCoordinateSelectModal(false);
    setSelectedLotForCoordinates(null);
  };
  
  const handleSaveLot = (data: any) => {
    if (editingLot) {
      setLotData(prev => prev.map(lot => 
        lot.id === editingLot.id ? { ...lot, ...data } : lot
      ));
    } else {
      const newLot: LotData = {
        id: Date.now().toString(),
        ...data,
        registrationDate: new Date().toISOString().split('T')[0]
      };
      setLotData(prev => [...prev, newLot]);
    }
    setShowLotModal(false);
  };
  
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
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="light" onClick={onClose}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Group gap="sm" align="center">
                <IconMap2 size={24} color="#fd7e14" />
                <Title order={2}>地番管理</Title>
              </Group>
              <Text size="sm" c="dimmed">{project.name} - 土地の地番・地目・面積の管理</Text>
            </div>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAddLot}>
            地番追加
          </Button>
        </Group>
      </Paper>

      {/* 地番テーブル */}
      <Paper shadow="sm" p={20} withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">土地の地番・地目・面積データを管理します</Text>
            <Group>
              <Button variant="light" size="sm">地番データインポート</Button>
              <Button variant="light" size="sm">地番データエクスポート</Button>
              <Button variant="light" size="sm">面積計算</Button>
            </Group>
          </Group>
          
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>地番</Table.Th>
                <Table.Th>地目</Table.Th>
                <Table.Th>面積 (㎡)</Table.Th>
                <Table.Th>構成点数</Table.Th>
                <Table.Th>所在地</Table.Th>
                <Table.Th>所有者</Table.Th>
                <Table.Th>登記日</Table.Th>
                <Table.Th>操作</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lotData.map((lot) => (
                <Table.Tr 
                  key={lot.id}
                  onMouseEnter={() => setHoveredLot(lot.id)}
                  onMouseLeave={() => setHoveredLot(null)}
                  style={{
                    backgroundColor: hoveredLot === lot.id ? '#e7f5ff' : undefined,
                    cursor: 'pointer'
                  }}
                >
                  <Table.Td>
                    <Text fw={600}>{lot.lotNumber}</Text>
                    {lot.description && (
                      <Text size="xs" c="dimmed">{lot.description}</Text>
                    )}
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
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="green"
                        onClick={() => handleEditCoordinates(lot)}
                        title="構成点編集"
                      >
                        <IconMapPins size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEditLot(lot)}
                        title="地番編集"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteLot(lot.id)}
                        title="削除"
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
              {lotData.length} 件の地番データが登録されています
            </Text>
          </Group>
        </Stack>
      </Paper>

      {/* 地番追加・編集モーダル */}
      {showLotModal && (
        <div
          style={{
            position: 'fixed',
            top: `${modalPosition.y}px`,
            left: `${modalPosition.x}px`,
            width: '800px',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
          }}
        >
          <div
            onMouseDown={handleMouseDown}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              padding: '16px',
              borderBottom: '1px solid #dee2e6',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text fw={600}>{editingLot ? "地番編集" : "地番追加"}</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowLotModal(false)}
            >
              ×
            </Button>
          </div>
          <div style={{ padding: '16px' }}>
            <LotForm
              lot={editingLot}
              onSave={handleSaveLot}
              onCancel={() => setShowLotModal(false)}
            />
          </div>
        </div>
      )}

      {/* 座標選択モーダル */}
      {showCoordinateSelectModal && selectedLotForCoordinates && (
        <div
          style={{
            position: 'fixed',
            top: `${coordinateModalPosition.y}px`,
            left: `${coordinateModalPosition.x}px`,
            width: '900px',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1001
          }}
        >
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #dee2e6',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Text fw={600}>構成点編集 - {selectedLotForCoordinates.lotNumber}</Text>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setShowCoordinateSelectModal(false)}
            >
              ×
            </Button>
          </div>
          <div style={{ padding: '16px' }}>
            <CoordinateSelectForm
              availableCoordinates={availableCoordinates}
              selectedCoordinateIds={selectedLotForCoordinates.coordinates}
              onSave={handleSaveCoordinates}
              onCancel={() => setShowCoordinateSelectModal(false)}
            />
          </div>
        </div>
      )}
        </Container>
      </div>
      
      {/* 右側のビューワー */}
      <CoordinateLotViewer 
        project={project}
        coordinates={availableCoordinates.map(coord => ({
          id: coord.id,
          pointName: coord.pointName,
          x: coord.x,
          y: coord.y,
          z: coord.z,
          type: coord.type,
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
        hoveredLot={hoveredLot}
        onCoordinateClick={(coord) => {
          console.log('座標点クリック:', coord.pointName);
        }}
        onLotClick={(lot) => {
          const originalLot = lotData.find(l => l.id === lot.id);
          if (originalLot) handleEditLot(originalLot);
        }}
      />
    </div>
  );
};

// 地番入力フォームコンポーネント
const LotForm: React.FC<{
  lot?: LotData | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ lot, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    lotNumber: lot?.lotNumber || '',
    landCategory: lot?.landCategory || '宅地',
    area: lot?.area?.toString() || '',
    address: lot?.address || '',
    owner: lot?.owner || '',
    description: lot?.description || ''
  });
  
  const handleSubmit = () => {
    const data = {
      ...formData,
      area: parseFloat(formData.area),
      coordinates: lot?.coordinates || []
    };
    onSave(data);
  };
  
  return (
    <Stack gap="md">
      <Group grow>
        <TextInput
          label="地番"
          value={formData.lotNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
          required
          placeholder="例: 123番地1"
        />
        <Select
          label="地目"
          value={formData.landCategory}
          onChange={(value) => setFormData(prev => ({ ...prev, landCategory: value || '宅地' }))}
          data={[
            { value: '宅地', label: '宅地' },
            { value: '田', label: '田' },
            { value: '畑', label: '畑' },
            { value: '山林', label: '山林' },
            { value: '雑種地', label: '雑種地' },
            { value: '原野', label: '原野' },
            { value: '牧場', label: '牧場' },
            { value: '池沼', label: '池沼' }
          ]}
          required
        />
      </Group>
      
      <Group grow>
        <NumberInput
          label="面積 (㎡)"
          value={formData.area}
          onChange={(value) => setFormData(prev => ({ ...prev, area: value?.toString() || '' }))}
          required
          decimalScale={2}
          placeholder="例: 125.50"
        />
        <TextInput
          label="所有者"
          value={formData.owner}
          onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
          required
          placeholder="例: 田中太郎"
        />
      </Group>

      <TextInput
        label="所在地"
        value={formData.address}
        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        required
        placeholder="例: 東京都渋谷区神宮前1-123-1"
      />
      
      <TextInput
        label="備考"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="例: 角地、南向き"
      />
      
      <Group justify="flex-end">
        <Button variant="light" onClick={onCancel}>
          キャンセル
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.lotNumber || !formData.area || !formData.address || !formData.owner}
        >
          {lot ? '更新' : '追加'}
        </Button>
      </Group>
    </Stack>
  );
};

// 座標選択フォームコンポーネント
const CoordinateSelectForm: React.FC<{
  availableCoordinates: CoordinatePoint[];
  selectedCoordinateIds: string[];
  onSave: (selectedIds: string[]) => void;
  onCancel: () => void;
}> = ({ availableCoordinates, selectedCoordinateIds, onSave, onCancel }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedCoordinateIds);

  const handleCoordinateToggle = (coordinateId: string) => {
    setSelectedIds(prev => 
      prev.includes(coordinateId)
        ? prev.filter(id => id !== coordinateId)
        : [...prev, coordinateId]
    );
  };

  const getCoordinateTypeColor = (type: string) => {
    switch (type) {
      case 'benchmark': return 'blue';
      case 'control_point': return 'green';
      case 'boundary_point': return 'orange';
      default: return 'gray';
    }
  };

  const getCoordinateTypeLabel = (type: string) => {
    switch (type) {
      case 'benchmark': return '基準点';
      case 'control_point': return '制御点';
      case 'boundary_point': return '境界点';
      default: return type;
    }
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        地番を構成する座標点を選択してください（選択順序が結線順序になります）
      </Text>
      
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th width={60}>選択</Table.Th>
            <Table.Th>点名</Table.Th>
            <Table.Th>種類</Table.Th>
            <Table.Th>X座標</Table.Th>
            <Table.Th>Y座標</Table.Th>
            <Table.Th>標高</Table.Th>
            <Table.Th>選択順序</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {availableCoordinates.map((coord) => {
            const isSelected = selectedIds.includes(coord.id);
            const selectionOrder = isSelected ? selectedIds.indexOf(coord.id) + 1 : null;
            
            return (
              <Table.Tr 
                key={coord.id}
                style={{ 
                  backgroundColor: isSelected ? '#e7f5ff' : undefined,
                  cursor: 'pointer'
                }}
                onClick={() => handleCoordinateToggle(coord.id)}
              >
                <Table.Td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCoordinateToggle(coord.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text fw={isSelected ? 600 : 400}>{coord.pointName}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={getCoordinateTypeColor(coord.type)} variant="light">
                    {getCoordinateTypeLabel(coord.type)}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ fontFamily: 'monospace' }}>
                    {coord.x.toFixed(3)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ fontFamily: 'monospace' }}>
                    {coord.y.toFixed(3)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" style={{ fontFamily: 'monospace' }}>
                    {coord.z.toFixed(3)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {selectionOrder && (
                    <Badge variant="filled" size="sm">
                      {selectionOrder}
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          選択済み: {selectedIds.length}点
        </Text>
        <Group>
          <Button variant="light" onClick={onCancel}>
            キャンセル
          </Button>
          <Button 
            onClick={() => onSave(selectedIds)}
            disabled={selectedIds.length < 3}
          >
            構成点を設定
          </Button>
        </Group>
      </Group>
    </Stack>
  );
};