import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Box,
  Grid,
  Card,
  Badge,
  Stack,
  Tabs,
  Table,
  ActionIcon,
  Modal,
  FileInput,
  Select
} from '@mantine/core';
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconPlus,
  IconFile,
  IconMap,
  IconUpload,
  IconDownload,
  IconEye
} from '@tabler/icons-react';
import { Project, CADData, CoordinateData } from '../../types/project';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: (project: Project) => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'cad' | 'coordinate'>('cad');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'blue';
      case 'in_progress': return 'yellow';
      case 'review': return 'orange';
      case 'completed': return 'green';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return '計画中';
      case 'in_progress': return '実施中';
      case 'review': return 'レビュー中';
      case 'completed': return '完了';
      default: return '不明';
    }
  };

  const handleFileUpload = (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const newId = Date.now().toString();

    if (uploadType === 'cad') {
      const newCADData: CADData = {
        id: newId,
        name: file.name,
        type: 'drawing',
        format: file.name.endsWith('.sxf') ? 'sxf' : file.name.endsWith('.dxf') ? 'dxf' : 'dwg',
        filePath: URL.createObjectURL(file),
        elements: [],
        layers: [],
        createdAt: new Date().toISOString()
      };

      const updatedProject = {
        ...project,
        cadData: [...project.cadData, newCADData],
        updatedAt: new Date().toISOString()
      };

      onUpdate(updatedProject);
    }

    setShowUploadModal(false);
  };

  const sampleCADData: CADData[] = [
    {
      id: '1',
      name: '基盤地図.sxf',
      type: 'drawing',
      format: 'sxf',
      elements: [],
      layers: [],
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      name: '境界線図.dxf',
      type: 'survey',
      format: 'dxf',
      elements: [],
      layers: [],
      createdAt: '2024-01-16T14:30:00Z'
    }
  ];

  const sampleCoordinateData: CoordinateData[] = [
    {
      id: '1',
      name: '基準点A',
      type: 'benchmark',
      coordinates: {
        x: 35.6762,
        y: 139.6503,
        z: 25.5,
        system: 'JGD2011'
      },
      accuracy: '±0.01m',
      description: '三角点',
      createdAt: '2024-01-15T09:00:00Z'
    },
    {
      id: '2',
      name: '境界点01',
      type: 'boundary_point',
      coordinates: {
        x: 35.6765,
        y: 139.6508,
        system: 'JGD2011'
      },
      accuracy: '±0.02m',
      createdAt: '2024-01-15T11:15:00Z'
    }
  ];

  const allCADData = [...project.cadData, ...sampleCADData];
  const allCoordinateData = [...project.coordinateData, ...sampleCoordinateData];

  return (
    <Container size="xl" py={20}>
      {/* ヘッダー */}
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="light" onClick={onBack}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Group gap="sm" align="center">
                <Title order={2}>{project.name}</Title>
                <Badge color={getStatusColor(project.status)} variant="light">
                  {getStatusLabel(project.status)}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">{project.description}</Text>
            </div>
          </Group>
          <Group>
            <Button variant="light" leftSection={<IconEdit size={16} />}>
              編集
            </Button>
            <Button 
              leftSection={<IconUpload size={16} />}
              onClick={() => setShowUploadModal(true)}
            >
              データアップロード
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* タブコンテンツ */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>
            概要
          </Tabs.Tab>
          <Tabs.Tab value="cad-data" leftSection={<IconFile size={16} />}>
            CADデータ ({allCADData.length})
          </Tabs.Tab>
          <Tabs.Tab value="coordinates" leftSection={<IconMap size={16} />}>
            座標データ ({allCoordinateData.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper shadow="sm" p={20} withBorder>
                <Title order={4} mb="md">プロジェクト情報</Title>
                <Stack gap="md">
                  <Group>
                    <Text fw={500} w={120}>プロジェクト名:</Text>
                    <Text>{project.name}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={120}>調査地域:</Text>
                    <Text>{project.location.address}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={120}>テンプレート:</Text>
                    <Text>{project.template.name}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={120}>座標系:</Text>
                    <Text>{project.settings.coordinateSystem}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={120}>縮尺:</Text>
                    <Text>{project.settings.scale}</Text>
                  </Group>
                  <Group>
                    <Text fw={500} w={120}>作成日:</Text>
                    <Text>{new Date(project.createdAt).toLocaleDateString('ja-JP')}</Text>
                  </Group>
                </Stack>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack>
                <Card shadow="sm" padding="lg" withBorder>
                  <Title order={5} mb="sm">データ統計</Title>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text size="sm">CADファイル:</Text>
                      <Badge variant="light">{allCADData.length}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">座標点:</Text>
                      <Badge variant="light">{allCoordinateData.length}</Badge>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm">レイヤー:</Text>
                      <Badge variant="light">0</Badge>
                    </Group>
                  </Stack>
                </Card>

                <Card shadow="sm" padding="lg" withBorder>
                  <Title order={5} mb="sm">クイックアクション</Title>
                  <Stack gap="xs">
                    <Button size="sm" variant="light" fullWidth disabled>
                      CAD編集を開く
                    </Button>
                    <Button size="sm" variant="light" fullWidth disabled>
                      レポート生成
                    </Button>
                    <Button size="sm" variant="light" fullWidth disabled>
                      データエクスポート
                    </Button>
                  </Stack>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="cad-data" pt="md">
          <Paper shadow="sm" p={20} withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>CADデータ</Title>
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setUploadType('cad');
                  setShowUploadModal(true);
                }}
              >
                CADファイル追加
              </Button>
            </Group>

            {allCADData.length > 0 ? (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ファイル名</Table.Th>
                    <Table.Th>種類</Table.Th>
                    <Table.Th>形式</Table.Th>
                    <Table.Th>作成日</Table.Th>
                    <Table.Th>アクション</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {allCADData.map((cadData) => (
                    <Table.Tr key={cadData.id}>
                      <Table.Td>{cadData.name}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">
                          {cadData.type === 'drawing' ? '図面' : cadData.type === 'survey' ? '測量' : '設計図'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline">{cadData.format.toUpperCase()}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {new Date(cadData.createdAt).toLocaleDateString('ja-JP')}
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="light" size="sm" disabled>
                            <IconEye size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" size="sm" disabled>
                            <IconDownload size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" size="sm" color="red" disabled>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Box ta="center" py={40}>
                <IconFile size={48} color="gray" style={{ margin: '0 auto 16px' }} />
                <Text c="dimmed" mb="md">CADデータがありません</Text>
                <Button 
                  leftSection={<IconUpload size={16} />}
                  onClick={() => {
                    setUploadType('cad');
                    setShowUploadModal(true);
                  }}
                >
                  最初のCADファイルをアップロード
                </Button>
              </Box>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="coordinates" pt="md">
          <Paper shadow="sm" p={20} withBorder>
            <Group justify="space-between" mb="md">
              <Title order={4}>座標データ</Title>
              <Button 
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setUploadType('coordinate');
                  setShowUploadModal(true);
                }}
              >
                座標データ追加
              </Button>
            </Group>

            {allCoordinateData.length > 0 ? (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>点名</Table.Th>
                    <Table.Th>種別</Table.Th>
                    <Table.Th>X座標</Table.Th>
                    <Table.Th>Y座標</Table.Th>
                    <Table.Th>Z座標</Table.Th>
                    <Table.Th>精度</Table.Th>
                    <Table.Th>アクション</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {allCoordinateData.map((coord) => (
                    <Table.Tr key={coord.id}>
                      <Table.Td>{coord.name}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">
                          {coord.type === 'benchmark' ? '基準点' : 
                           coord.type === 'control_point' ? '制御点' : '境界点'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{coord.coordinates.x.toFixed(6)}</Table.Td>
                      <Table.Td>{coord.coordinates.y.toFixed(6)}</Table.Td>
                      <Table.Td>{coord.coordinates.z?.toFixed(2) || '-'}</Table.Td>
                      <Table.Td>{coord.accuracy}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon variant="light" size="sm" disabled>
                            <IconEye size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" size="sm" disabled>
                            <IconEdit size={14} />
                          </ActionIcon>
                          <ActionIcon variant="light" size="sm" color="red" disabled>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Box ta="center" py={40}>
                <IconMap size={48} color="gray" style={{ margin: '0 auto 16px' }} />
                <Text c="dimmed" mb="md">座標データがありません</Text>
                <Button 
                  leftSection={<IconUpload size={16} />}
                  onClick={() => {
                    setUploadType('coordinate');
                    setShowUploadModal(true);
                  }}
                >
                  座標データをアップロード
                </Button>
              </Box>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* アップロードモーダル */}
      <Modal
        opened={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={uploadType === 'cad' ? 'CADファイルアップロード' : '座標データアップロード'}
      >
        <Stack>
          <Select
            label="データ種別"
            value={uploadType}
            onChange={(value) => setUploadType(value as 'cad' | 'coordinate')}
            data={[
              { value: 'cad', label: 'CADファイル' },
              { value: 'coordinate', label: '座標データ' }
            ]}
          />
          
          <FileInput
            label="ファイル選択"
            placeholder="ファイルを選択してください"
            accept={uploadType === 'cad' ? '.sxf,.dxf,.dwg' : '.csv,.txt'}
            onChange={handleFileUpload}
          />
          
          <Text size="xs" c="dimmed">
            {uploadType === 'cad' 
              ? '対応形式: SXF, DXF, DWG' 
              : '対応形式: CSV, TXT'
            }
          </Text>
        </Stack>
      </Modal>
    </Container>
  );
};