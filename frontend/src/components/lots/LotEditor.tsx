import React, { useState, useRef, useEffect } from 'react';
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
import { landParcelService, type LandParcel } from '../../services/landParcelService';
import { surveyPointService, type SurveyPoint } from '../../services/surveyPointService';

interface LotEditorProps {
  project: Project;
  onClose: () => void;
}

// LotDataインターフェースをLandParcelに統一
// interface LotData は LandParcel に統合

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
  // 座標点データ（API連携）
  const [availableCoordinates, setAvailableCoordinates] = useState<CoordinatePoint[]>([]);
  const [coordinatesLoading, setCoordinatesLoading] = useState(true);

  // 地番データ管理（API連携）
  const [lotData, setLotData] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showLotModal, setShowLotModal] = useState(false);
  const [editingLot, setEditingLot] = useState<LandParcel | null>(null);
  const [showCoordinateSelectModal, setShowCoordinateSelectModal] = useState(false);
  const [selectedLotForCoordinates, setSelectedLotForCoordinates] = useState<LandParcel | null>(null);
  const [hoveredLot, setHoveredLot] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 100, y: 100 });
  const [coordinateModalPosition, setCoordinateModalPosition] = useState({ x: 150, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });

  // データの初期読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 座標点と地番データを並行して読み込み
        const [coordinatesData, parcelsData] = await Promise.all([
          surveyPointService.getSurveyPointsByProject(project.id),
          landParcelService.getLandParcelsByProject(project.id)
        ]);

        // 座標点データを変換
        const convertedCoordinates = coordinatesData.map(sp => {
          const coords = surveyPointService.wktToCoordinates(sp.coordinates);
          return {
            id: sp.id,
            pointName: sp.pointNumber,
            x: coords.x,
            y: coords.y,
            z: coords.z || 0,
            type: sp.pointType as 'benchmark' | 'control_point' | 'boundary_point'
          };
        });

        setAvailableCoordinates(convertedCoordinates);
        setLotData(parcelsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
        setCoordinatesLoading(false);
      }
    };

    loadData();
  }, [project.id]);

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
  
  const handleEditLot = (lot: LandParcel) => {
    setEditingLot(lot);
    setShowLotModal(true);
  };
  
  const handleDeleteLot = async (id: string) => {
    try {
      await landParcelService.deleteLandParcel(id);
      setLotData(prev => prev.filter(lot => lot.id !== id));
    } catch (error) {
      console.error('地番の削除に失敗しました:', error);
      setError(error instanceof Error ? error.message : '地番の削除に失敗しました');
    }
  };

  const handleEditCoordinates = (lot: LandParcel) => {
    setSelectedLotForCoordinates(lot);
    setShowCoordinateSelectModal(true);
  };

  const handleSaveCoordinates = async (selectedCoordinateIds: string[]) => {
    if (selectedLotForCoordinates) {
      try {
        // 選択された座標点から WKT Polygon を生成
        const geometry = landParcelService.coordinateIdsToPolygonWKT(
          selectedCoordinateIds,
          availableCoordinates
        );
        
        // 座標点IDリストをJSON文字列に変換
        const coordinatePoints = landParcelService.coordinatePointsToJson(selectedCoordinateIds);

        // バックエンドAPIで更新
        const updatedParcel = await landParcelService.updateLandParcel(
          selectedLotForCoordinates.id,
          {
            geometry,
            coordinatePoints
          }
        );

        // ローカル状態を更新
        setLotData(prev => prev.map(lot => 
          lot.id === selectedLotForCoordinates.id ? updatedParcel : lot
        ));

        setShowCoordinateSelectModal(false);
        setSelectedLotForCoordinates(null);
      } catch (error) {
        console.error('構成点の保存に失敗しました:', error);
        setError(error instanceof Error ? error.message : '構成点の保存に失敗しました');
      }
    }
  };
  
  const handleSaveLot = async (data: any) => {
    try {
      if (editingLot) {
        // 更新
        const updatedParcel = await landParcelService.updateLandParcel(editingLot.id, data);
        setLotData(prev => prev.map(lot => 
          lot.id === editingLot.id ? updatedParcel : lot
        ));
      } else {
        // 新規作成
        const newParcelData = {
          ...data,
          projectId: project.id,
          registrationDate: new Date().toISOString()
        };
        const newParcel = await landParcelService.createLandParcel(newParcelData);
        setLotData(prev => [...prev, newParcel]);
      }
      setShowLotModal(false);
      setEditingLot(null);
    } catch (error) {
      console.error('地番の保存に失敗しました:', error);
      setError(error instanceof Error ? error.message : '地番の保存に失敗しました');
    }
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
                    <Text fw={600}>{lot.parcelNumber}</Text>
                    {lot.description && (
                      <Text size="xs" c="dimmed">{lot.description}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getLandCategoryColor(lot.landUse)} variant="light">
                      {lot.landUse}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ fontFamily: 'monospace' }}>
                      {lot.area.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" size="sm">
                      {landParcelService.coordinatePointsFromJson(lot.coordinatePoints).length}点
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
            <Text fw={600}>構成点編集 - {selectedLotForCoordinates.parcelNumber}</Text>
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
              selectedCoordinateIds={landParcelService.coordinatePointsFromJson(selectedLotForCoordinates.coordinatePoints)}
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
          lotNumber: lot.parcelNumber,
          landCategory: lot.landUse || '',
          area: lot.area,
          coordinates: landParcelService.coordinatePointsFromJson(lot.coordinatePoints),
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
  lot?: LandParcel | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}> = ({ lot, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    parcelNumber: lot?.parcelNumber || '',
    landUse: lot?.landUse || '宅地',
    area: lot?.area?.toString() || '',
    address: lot?.address || '',
    owner: lot?.owner || '',
    remarks: lot?.remarks || ''
  });
  
  const handleSubmit = () => {
    const data = {
      ...formData,
      area: parseFloat(formData.area),
      projectId: lot?.projectId // 必要に応じて追加
    };
    onSave(data);
  };
  
  return (
    <Stack gap="md">
      <Group grow>
        <TextInput
          label="地番"
          value={formData.parcelNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, parcelNumber: e.target.value }))}
          required
          placeholder="例: 123番地1"
        />
        <Select
          label="地目"
          value={formData.landUse}
          onChange={(value) => setFormData(prev => ({ ...prev, landUse: value || '宅地' }))}
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
        value={formData.remarks}
        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
        placeholder="例: 角地、南向き"
      />
      
      <Group justify="flex-end">
        <Button variant="light" onClick={onCancel}>
          キャンセル
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.parcelNumber || !formData.area || !formData.address || !formData.owner}
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