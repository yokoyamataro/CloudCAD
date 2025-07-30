import React, { useState } from 'react';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  Modal,
  Grid,
  Card,
  Image,
  Badge,
  TextInput,
  Textarea,
  Select,
  Stepper,
  NumberInput,
  Tabs,
  Table,
  ActionIcon,
  SimpleGrid,
  Box,
  ScrollArea
} from '@mantine/core';
import { 
  IconCheck, 
  IconPlus, 
  IconArrowLeft, 
  IconArrowRight,
  IconFile,
  IconMap,
  IconEye,
  IconDownload,
  IconEdit,
  IconTrash,
  IconFolder,
  IconUpload,
  IconMapPin,
  IconHome,
  IconPencil
} from '@tabler/icons-react';
import { CADEditor } from './cad/CADEditor';

export const TestApp: React.FC = () => {
  const [showProjects, setShowProjects] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [coordinateDisplayMode, setCoordinateDisplayMode] = useState<'plane' | 'geographic'>('plane');
  const [showCADEditor, setShowCADEditor] = useState(false);
  const [selectedCADFile, setSelectedCADFile] = useState<any>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    area: '',
    scale: '1:500',
    coordinateSystem: 'JGD2011'
  });

  // プロジェクトテンプレートデータ
  const projectTemplates = [
    {
      id: 'land-survey',
      name: '一筆地測量',
      description: '一筆毎の土地の境界を確定し、面積を測量する作業',
      image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop',
      category: '測量作業',
      features: ['境界確認', '面積測量', '座標測定', '境界標設置']
    },
    {
      id: 'legal-map-creation',
      name: '法務局備付地図作成作業',
      description: '法務局に備え付ける公式地図の作成・更新作業',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
      category: '地図作成',
      features: ['公図作成', '地番記入', '法務局提出', '図面調製']
    },
    {
      id: 'simple-cad',
      name: 'シンプルCAD',
      description: '基本的な図面作成・編集のためのシンプルなCADプロジェクト',
      image: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=300&fit=crop',
      category: 'CAD作業',
      features: ['図面作成', '線分描画', 'レイヤー管理', '寸法記入']
    }
  ];

  // サンプルCADデータと座標データ
  const getSampleCADData = (projectId: string) => [
    {
      id: `${projectId}_cad_1`,
      name: '基盤地図.sxf',
      type: 'base_map',
      format: 'sxf',
      thumbnail: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200&h=150&fit=crop',
      fileSize: '2.4MB',
      createdAt: new Date().toISOString(),
      elements: 156,
      layers: 8
    },
    {
      id: `${projectId}_cad_2`,
      name: '境界線図.dxf',
      type: 'boundary',
      format: 'dxf',
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop',
      fileSize: '1.8MB',
      createdAt: new Date().toISOString(),
      elements: 89,
      layers: 5
    },
    {
      id: `${projectId}_cad_3`,
      name: '実測図.dwg',
      type: 'survey',
      format: 'dwg',
      thumbnail: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=200&h=150&fit=crop',
      fileSize: '3.1MB',
      createdAt: new Date().toISOString(),
      elements: 203,
      layers: 12
    }
  ];

  // 座標変換関数（平面直角座標系 ⇔ 経緯度）
  const convertPlaneToGeographic = (x: number, y: number, coordinateSystem: number = 9) => {
    // 簡易変換（実際は複雑な変換式が必要）
    // 平面直角座標系第9系（東京都）を想定
    const originLat = 36.0; // 系の原点緯度
    const originLon = 139.833333; // 系の原点経度
    
    // メートル単位の座標をミリから変換
    const xM = x / 1000;
    const yM = y / 1000;
    
    // 簡易変換式（実用にはより精密な変換が必要）
    const lat = originLat + (xM / 111000);
    const lon = originLon + (yM / (111000 * Math.cos(originLat * Math.PI / 180)));
    
    return { lat, lon };
  };

  const formatCoordinate = (value: number, type: 'x' | 'y' | 'lat' | 'lon') => {
    if (coordinateDisplayMode === 'plane') {
      // 平面直角座標系（ミリ単位をメートルに変換して表示）
      return (value / 1000).toFixed(3);
    } else {
      // 経緯度表示
      if (type === 'x' || type === 'lat') {
        return value.toFixed(8) + '°';
      } else {
        return value.toFixed(8) + '°';
      }
    }
  };

  const getSampleCoordinateData = (projectId: string) => [
    {
      id: `${projectId}_coord_1`,
      name: '基準点A',
      type: 'benchmark',
      // 平面直角座標系第9系（東京都）ミリ単位
      x: -36254780, // X座標（mm）北方向
      y: -2345672,  // Y座標（mm）東方向
      z: 25450,     // Z座標（mm）標高
      coordinateSystem: 9,
      accuracy: '±10mm',
      description: '三角点',
      createdAt: new Date().toISOString()
    },
    {
      id: `${projectId}_coord_2`,
      name: '境界点01',
      type: 'boundary',
      x: -36254156,
      y: -2345051,
      z: 24120,
      coordinateSystem: 9,
      accuracy: '±20mm',
      description: '筆界点',
      createdAt: new Date().toISOString()
    },
    {
      id: `${projectId}_coord_3`,
      name: '境界点02',
      type: 'boundary',
      x: -36253897,
      y: -2345208,
      z: 23890,
      coordinateSystem: 9,
      accuracy: '±20mm',
      description: '筆界点',
      createdAt: new Date().toISOString()
    },
    {
      id: `${projectId}_coord_4`,
      name: '制御点B',
      type: 'control',
      x: -36254534,
      y: -2344834,
      z: 26230,
      coordinateSystem: 9,
      accuracy: '±10mm',
      description: '水準点',
      createdAt: new Date().toISOString()
    }
  ];

  const getSampleLandNumberData = (projectId: string) => [
    {
      id: `${projectId}_land_1`,
      landNumber: '1番1',
      landType: '宅地',
      area: 245.67,
      owner: '東京　太郎',
      address: '東京都港区麻布台1丁目1番1号',
      registrationDate: '2023-04-15',
      lastSurveyDate: '2024-01-15',
      boundaryStatus: '確定',
      notes: '境界確認済み',
      coordinates: [
        { x: -36254780, y: -2345672 },
        { x: -36254156, y: -2345051 },
        { x: -36253897, y: -2345208 },
        { x: -36254534, y: -2344834 }
      ]
    },
    {
      id: `${projectId}_land_2`,
      landNumber: '1番2',
      landType: '宅地',
      area: 186.23,
      owner: '山田　花子',
      address: '東京都港区麻布台1丁目1番2号',
      registrationDate: '2023-06-20',
      lastSurveyDate: '2024-01-16',
      boundaryStatus: '確定',
      notes: '分筆済み',
      coordinates: [
        { x: -36254534, y: -2344834 },
        { x: -36253897, y: -2345208 },
        { x: -36253653, y: -2344886 },
        { x: -36254290, y: -2344512 }
      ]
    },
    {
      id: `${projectId}_land_3`,
      landNumber: '1番3',
      landType: '雑種地',
      area: 89.45,
      owner: '佐藤　次郎',
      address: '東京都港区麻布台1丁目1番3号',
      registrationDate: '2022-11-10',
      lastSurveyDate: '2024-01-17',
      boundaryStatus: '未確定',
      notes: '隣接地との境界調整中',
      coordinates: [
        { x: -36253653, y: -2344886 },
        { x: -36253897, y: -2345208 },
        { x: -36253445, y: -2345541 },
        { x: -36253201, y: -2345219 }
      ]
    },
    {
      id: `${projectId}_land_4`,
      landNumber: '2番1',
      landType: '宅地',
      area: 312.89,
      owner: '田中建設株式会社',
      address: '東京都港区麻布台1丁目2番1号',
      registrationDate: '2023-08-05',
      lastSurveyDate: '2024-01-18',
      boundaryStatus: '確定',
      notes: '法人所有地',
      coordinates: [
        { x: -36254290, y: -2344512 },
        { x: -36253653, y: -2344886 },
        { x: -36253201, y: -2345219 },
        { x: -36253812, y: -2344639 }
      ]
    }
  ];

  // フォーム処理関数
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setActiveStep(1);
  };

  const handleNextStep = () => {
    if (activeStep < 2) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleCreateProject = () => {
    const newProject = {
      id: Date.now().toString(),
      ...formData,
      template: selectedTemplate,
      createdAt: new Date().toISOString(),
      progress: 0
    };
    
    setProjects([...projects, newProject]);
    
    // フォームリセット
    setFormData({
      name: '',
      description: '',
      location: '',
      area: '',
      scale: '1:500',
      coordinateSystem: 'JGD2011'
    });
    setSelectedTemplate(null);
    setActiveStep(0);
    setShowCreateModal(false);
    
    alert(`プロジェクト「${newProject.name}」を作成しました！`);
  };

  const resetForm = () => {
    setSelectedTemplate(null);
    setActiveStep(0);
    setFormData({
      name: '',
      description: '',
      location: '',
      area: '',
      scale: '1:500',
      coordinateSystem: 'JGD2011'
    });
  };

  // CADエディタ表示
  if (showCADEditor) {
    console.log('CADエディタを表示中:', { showCADEditor, selectedProject: selectedProject?.id });
    return (
      <div style={{ width: '100vw', height: '100vh' }}>
        <CADEditor 
          projectId={selectedProject?.id || 'test'}
          onClose={() => {
            console.log('CADエディタを閉じています');
            setShowCADEditor(false);
            setSelectedCADFile(null);
          }}
          onSave={(cadData) => {
            console.log('CADデータが保存されました:', cadData);
            // プロジェクトのCADデータリストに追加
            if (selectedProject) {
              const updatedProject = {
                ...selectedProject,
                cadData: [...(selectedProject.cadData || []), cadData]
              };
              setProjects(prev => prev.map(p => p.id === selectedProject.id ? updatedProject : p));
              setSelectedProject(updatedProject);
            }
          }}
        />
      </div>
    );
  }

  // プロジェクト詳細表示
  if (selectedProject) {
    const cadData = getSampleCADData(selectedProject.id);
    const coordinateData = getSampleCoordinateData(selectedProject.id);
    const landNumberData = getSampleLandNumberData(selectedProject.id);

    return (
      <Container size="xl" py={20}>
        {/* ヘッダー */}
        <Paper shadow="sm" p={20} mb={30} withBorder>
          <Group justify="space-between">
            <Group>
              <ActionIcon variant="light" onClick={() => setSelectedProject(null)}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <div>
                <Group gap="sm" align="center">
                  <Title order={2}>{selectedProject.name}</Title>
                  <Badge color="blue" variant="light">
                    進捗: {selectedProject.progress || 0}%
                  </Badge>
                </Group>
                <Text size="sm" c="dimmed">{selectedProject.description}</Text>
              </div>
            </Group>
            <Group>
              <Button variant="light" leftSection={<IconEdit size={16} />}>
                編集
              </Button>
              <Button leftSection={<IconUpload size={16} />}>
                データ追加
              </Button>
            </Group>
          </Group>
        </Paper>

        {/* タブコンテンツ */}
        <Tabs defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconEye size={16} />}>
              概要
            </Tabs.Tab>
            <Tabs.Tab value="cad-data" leftSection={<IconFile size={16} />}>
              CADデータ ({cadData.length})
            </Tabs.Tab>
            <Tabs.Tab value="coordinates" leftSection={<IconMap size={16} />}>
              座標データ ({coordinateData.length})
            </Tabs.Tab>
            <Tabs.Tab value="land-numbers" leftSection={<IconHome size={16} />}>
              地番データ ({landNumberData.length})
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
                      <Text>{selectedProject.name}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={120}>調査場所:</Text>
                      <Text>{selectedProject.location}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={120}>面積:</Text>
                      <Text>{selectedProject.area}㎡</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={120}>テンプレート:</Text>
                      <Text>{selectedProject.template.name}</Text>
                    </Group>
                    <Group>
                      <Text fw={500} w={120}>作成日:</Text>
                      <Text>{new Date(selectedProject.createdAt).toLocaleDateString('ja-JP')}</Text>
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
                        <Badge variant="light">{cadData.length}</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">座標点:</Text>
                        <Badge variant="light">{coordinateData.length}</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">地番:</Text>
                        <Badge variant="light">{landNumberData.length}</Badge>
                      </Group>
                      <Group justify="space-between">
                        <Text size="sm">進捗:</Text>
                        <Badge variant="light">{selectedProject.progress || 0}%</Badge>
                      </Group>
                    </Stack>
                  </Card>

                  <Card shadow="sm" padding="lg" withBorder>
                    <Title order={5} mb="sm">クイックアクション</Title>
                    <Stack gap="xs">
                      <Button 
                        size="sm" 
                        variant="light" 
                        fullWidth
                        leftSection={<IconPencil size={14} />}
                        onClick={() => setShowCADEditor(true)}
                      >
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
                <Button leftSection={<IconPlus size={16} />}>
                  CADファイル追加
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {cadData.map((cad) => (
                  <Card key={cad.id} shadow="sm" padding="lg" withBorder>
                    <Card.Section>
                      <Image
                        src={cad.thumbnail}
                        height={160}
                        alt={cad.name}
                      />
                    </Card.Section>

                    <Group justify="space-between" mt="md" mb="xs">
                      <Text fw={500} size="sm" truncate>
                        {cad.name}
                      </Text>
                      <Badge variant="outline" size="xs">
                        {cad.format.toUpperCase()}
                      </Badge>
                    </Group>

                    <Text size="xs" c="dimmed" mb="sm">
                      サイズ: {cad.fileSize} | 要素: {cad.elements}個 | レイヤー: {cad.layers}個
                    </Text>

                    <Group gap="xs">
                      <ActionIcon 
                        variant="light" 
                        size="sm"
                        onClick={() => {
                          setSelectedCADFile(cad);
                          setShowCADEditor(true);
                        }}
                        title="CAD編集"
                      >
                        <IconPencil size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" size="sm" title="プレビュー">
                        <IconEye size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" size="sm" title="ダウンロード">
                        <IconDownload size={14} />
                      </ActionIcon>
                      <ActionIcon variant="light" size="sm" color="red" title="削除">
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))}
              </SimpleGrid>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="coordinates" pt="md">
            <Paper shadow="sm" p={20} withBorder>
              <Group justify="space-between" mb="md">
                <Group>
                  <Title order={4}>座標データ</Title>
                  <Badge variant="light" color="blue" size="sm">
                    平面直角座標系第9系（東京都）
                  </Badge>
                </Group>
                <Group>
                  <Button
                    variant={coordinateDisplayMode === 'plane' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => setCoordinateDisplayMode('plane')}
                  >
                    平面座標
                  </Button>
                  <Button
                    variant={coordinateDisplayMode === 'geographic' ? 'filled' : 'light'}
                    size="sm"
                    onClick={() => setCoordinateDisplayMode('geographic')}
                  >
                    経緯度
                  </Button>
                  <Button leftSection={<IconPlus size={16} />}>
                    座標データ追加
                  </Button>
                </Group>
              </Group>

              <ScrollArea>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>点名</Table.Th>
                      <Table.Th>種別</Table.Th>
                      <Table.Th>
                        {coordinateDisplayMode === 'plane' ? 'X座標（北方向）' : '緯度'}
                      </Table.Th>
                      <Table.Th>
                        {coordinateDisplayMode === 'plane' ? 'Y座標（東方向）' : '経度'}
                      </Table.Th>
                      <Table.Th>Z座標（標高）</Table.Th>
                      <Table.Th>座標系</Table.Th>
                      <Table.Th>精度</Table.Th>
                      <Table.Th>説明</Table.Th>
                      <Table.Th>アクション</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {coordinateData.map((coord) => {
                      const geoCoord = coordinateDisplayMode === 'geographic' 
                        ? convertPlaneToGeographic(coord.x, coord.y, coord.coordinateSystem)
                        : null;
                      
                      return (
                        <Table.Tr key={coord.id}>
                          <Table.Td>
                            <Text fw={500}>{coord.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge 
                              variant="light" 
                              color={
                                coord.type === 'benchmark' ? 'red' : 
                                coord.type === 'control' ? 'blue' : 'green'
                              }
                              size="sm"
                            >
                              {coord.type === 'benchmark' ? '基準点' : 
                               coord.type === 'control' ? '制御点' : '境界点'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" family="monospace">
                              {coordinateDisplayMode === 'plane' 
                                ? formatCoordinate(coord.x, 'x')
                                : formatCoordinate(geoCoord!.lat, 'lat')
                              }
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" family="monospace">
                              {coordinateDisplayMode === 'plane' 
                                ? formatCoordinate(coord.y, 'y')
                                : formatCoordinate(geoCoord!.lon, 'lon')
                              }
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" family="monospace">
                              {formatCoordinate(coord.z, 'x')}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="outline" size="xs">
                              {coord.coordinateSystem}系
                            </Badge>
                          </Table.Td>
                          <Table.Td>{coord.accuracy}</Table.Td>
                          <Table.Td>{coord.description}</Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon variant="light" size="sm" title="詳細表示">
                                <IconEye size={14} />
                              </ActionIcon>
                              <ActionIcon variant="light" size="sm" title="編集">
                                <IconEdit size={14} />
                              </ActionIcon>
                              <ActionIcon variant="light" size="sm" color="red" title="削除">
                                <IconTrash size={14} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              {/* 座標データ統計 */}
              <Paper p="md" mt="md" withBorder bg="gray.0">
                <Title order={5} mb="sm">座標統計</Title>
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                  <Box ta="center">
                    <Text size="xl" fw={700} color="red">
                      {coordinateData.filter(c => c.type === 'benchmark').length}
                    </Text>
                    <Text size="xs" c="dimmed">基準点</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="blue">
                      {coordinateData.filter(c => c.type === 'control').length}
                    </Text>
                    <Text size="xs" c="dimmed">制御点</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="green">
                      {coordinateData.filter(c => c.type === 'boundary').length}
                    </Text>
                    <Text size="xs" c="dimmed">境界点</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="gray">
                      ±{Math.min(...coordinateData.map(c => parseInt(c.accuracy.replace(/\D/g, ''))))}mm
                    </Text>
                    <Text size="xs" c="dimmed">最高精度</Text>
                  </Box>
                </SimpleGrid>
              </Paper>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="land-numbers" pt="md">
            <Paper shadow="sm" p={20} withBorder>
              <Group justify="space-between" mb="md">
                <Title order={4}>地番データ</Title>
                <Button leftSection={<IconPlus size={16} />}>
                  地番データ追加
                </Button>
              </Group>

              <ScrollArea>
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>地番</Table.Th>
                      <Table.Th>地目</Table.Th>
                      <Table.Th>面積(㎡)</Table.Th>
                      <Table.Th>所有者</Table.Th>
                      <Table.Th>住所</Table.Th>
                      <Table.Th>境界状況</Table.Th>
                      <Table.Th>最終測量日</Table.Th>
                      <Table.Th>備考</Table.Th>
                      <Table.Th>アクション</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {landNumberData.map((land) => (
                      <Table.Tr key={land.id}>
                        <Table.Td>
                          <Text fw={500}>{land.landNumber}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge 
                            variant="light" 
                            color={
                              land.landType === '宅地' ? 'blue' : 
                              land.landType === '雑種地' ? 'orange' : 'green'
                            }
                            size="sm"
                          >
                            {land.landType}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{land.area.toFixed(2)}</Table.Td>
                        <Table.Td>{land.owner}</Table.Td>
                        <Table.Td>
                          <Text size="xs" style={{ maxWidth: 200 }} truncate>
                            {land.address}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge 
                            variant="light" 
                            color={land.boundaryStatus === '確定' ? 'green' : 'red'}
                            size="sm"
                          >
                            {land.boundaryStatus}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {new Date(land.lastSurveyDate).toLocaleDateString('ja-JP')}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" style={{ maxWidth: 150 }} truncate>
                            {land.notes}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon variant="light" size="sm" title="詳細表示">
                              <IconEye size={14} />
                            </ActionIcon>
                            <ActionIcon variant="light" size="sm" title="位置表示">
                              <IconMapPin size={14} />
                            </ActionIcon>
                            <ActionIcon variant="light" size="sm" title="編集">
                              <IconEdit size={14} />
                            </ActionIcon>
                            <ActionIcon variant="light" size="sm" color="red" title="削除">
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              {/* 地番データ統計 */}
              <Paper p="md" mt="md" withBorder bg="gray.0">
                <Title order={5} mb="sm">地番統計</Title>
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                  <Box ta="center">
                    <Text size="xl" fw={700} color="blue">
                      {landNumberData.filter(l => l.landType === '宅地').length}
                    </Text>
                    <Text size="xs" c="dimmed">宅地</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="orange">
                      {landNumberData.filter(l => l.landType === '雑種地').length}
                    </Text>
                    <Text size="xs" c="dimmed">雑種地</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="green">
                      {landNumberData.filter(l => l.boundaryStatus === '確定').length}
                    </Text>
                    <Text size="xs" c="dimmed">境界確定</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xl" fw={700} color="gray">
                      {landNumberData.reduce((sum, l) => sum + l.area, 0).toFixed(2)}
                    </Text>
                    <Text size="xs" c="dimmed">総面積(㎡)</Text>
                  </Box>
                </SimpleGrid>
              </Paper>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Container>
    );
  }

  if (showProjects) {
    return (
      <Container size="lg" py={40}>
        <Paper shadow="sm" p={20} mb={30} withBorder>
          <Group justify="space-between">
            <Title order={2}>プロジェクト管理</Title>
            <Button onClick={() => setShowProjects(false)}>
              戻る
            </Button>
          </Group>
        </Paper>
        
        <Stack>
          <Alert icon={<IconCheck size={16} />} title="プロジェクト管理" color="blue" mb={20}>
            プロジェクト管理画面が正常に表示されました！
          </Alert>

          <Paper shadow="sm" p={20} withBorder>
            <Title order={4} mb={15}>プロジェクト一覧 ({projects.length + 3}件)</Title>
            
            {/* 作成されたプロジェクト */}
            {projects.map((project) => (
              <Paper 
                key={project.id} 
                p={15} 
                withBorder 
                mb={10}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedProject(project)}
              >
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={500}>{project.name}</Text>
                    <Text size="sm" c="dimmed">{project.description}</Text>
                    <Text size="xs" c="dimmed" mt={5}>
                      場所: {project.location} | 作成日: {new Date(project.createdAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </div>
                  <Group gap="xs">
                    <Badge color="teal" variant="light">{project.template.category}</Badge>
                    <ActionIcon variant="light" size="sm">
                      <IconEye size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Paper>
            ))}
            
            {/* サンプルプロジェクト */}
            <Paper 
              p={15} 
              withBorder 
              mb={10}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedProject({
                id: 'sample_1',
                name: '東京都港区麻布台1丁目 一筆地測量',
                description: '境界確認・面積測量・座標測定',
                location: '東京都港区麻布台1丁目',
                area: '800',
                template: projectTemplates[0],
                progress: 80,
                createdAt: '2024-01-15T09:00:00Z'
              })}
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={500}>東京都港区麻布台1丁目 一筆地測量</Text>
                  <Text size="sm" c="dimmed">境界確認・面積測量・座標測定</Text>
                  <Text size="xs" c="dimmed" mt={5}>作成日: 2024-01-15 | 進捗: 80%</Text>
                </div>
                <Group gap="xs">
                  <Badge color="blue" variant="light">測量作業</Badge>
                  <ActionIcon variant="light" size="sm">
                    <IconEye size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>

            <Paper 
              p={15} 
              withBorder 
              mb={10}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedProject({
                id: 'sample_2',
                name: '千代田区丸の内地区 法務局備付地図',
                description: '公図作成・地番記入・法務局提出準備',
                location: '東京都千代田区丸の内',
                area: '1200',
                template: projectTemplates[1],
                progress: 60,
                createdAt: '2024-01-10T09:00:00Z'
              })}
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={500}>千代田区丸の内地区 法務局備付地図</Text>
                  <Text size="sm" c="dimmed">公図作成・地番記入・法務局提出準備</Text>
                  <Text size="xs" c="dimmed" mt={5}>作成日: 2024-01-10 | 進捗: 60%</Text>
                </div>
                <Group gap="xs">
                  <Badge color="green" variant="light">地図作成</Badge>
                  <ActionIcon variant="light" size="sm">
                    <IconEye size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>

            <Paper 
              p={15} 
              withBorder 
              mb={10}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedProject({
                id: 'sample_3',
                name: '新宿区西新宿 シンプルCAD図面',
                description: '基本図面作成・レイヤー管理',
                location: '東京都新宿区西新宿',
                area: '600',
                template: projectTemplates[2],
                progress: 100,
                createdAt: '2024-01-12T09:00:00Z'
              })}
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={500}>新宿区西新宿 シンプルCAD図面</Text>
                  <Text size="sm" c="dimmed">基本図面作成・レイヤー管理</Text>
                  <Text size="xs" c="dimmed" mt={5}>作成日: 2024-01-12 | 進捗: 完了</Text>
                </div>
                <Group gap="xs">
                  <Badge color="orange" variant="light">CAD作業</Badge>
                  <ActionIcon variant="light" size="sm">
                    <IconEye size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Paper>

            <Button 
              variant="light" 
              mt={15}
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              新規プロジェクト作成
            </Button>
          </Paper>
        </Stack>

        {/* プロジェクト作成モーダル */}
        <Modal
          opened={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          title="新規プロジェクト作成"
          size="xl"
        >
          <Stepper active={activeStep} mb="xl">
            <Stepper.Step label="テンプレート選択" description="作業種別を選択">
              <div>
                <Title order={4} mb="md">プロジェクトテンプレートを選択</Title>
                <Text size="sm" c="dimmed" mb="lg">
                  調査対象地域の特性に最も適したテンプレートを選択してください
                </Text>

                <Grid>
                  {projectTemplates.map((template) => (
                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={template.id}>
                      <Card
                        shadow="sm"
                        padding="lg"
                        radius="md"
                        withBorder
                        style={{ 
                          cursor: 'pointer',
                          border: selectedTemplate?.id === template.id ? '2px solid #228be6' : undefined
                        }}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <Card.Section>
                          <Image
                            src={template.image}
                            height={160}
                            alt={template.name}
                          />
                        </Card.Section>

                        <Group justify="space-between" mt="md" mb="xs">
                          <Text fw={500} size="lg" truncate>
                            {template.name}
                          </Text>
                          <Badge variant="light">
                            {template.category}
                          </Badge>
                        </Group>

                        <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                          {template.description}
                        </Text>

                        {template.features && (
                          <Stack gap="xs" mb="md">
                            <Text size="xs" fw={500} c="dimmed">主な機能:</Text>
                            {template.features.slice(0, 2).map((feature, index) => (
                              <Text key={index} size="xs" pl="sm">
                                • {feature}
                              </Text>
                            ))}
                          </Stack>
                        )}

                        <Button 
                          fullWidth 
                          variant={selectedTemplate?.id === template.id ? "filled" : "light"}
                        >
                          {selectedTemplate?.id === template.id ? "選択中" : "このテンプレートを選択"}
                        </Button>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              </div>
            </Stepper.Step>

            <Stepper.Step label="基本情報入力" description="プロジェクト詳細">
              {selectedTemplate && (
                <div>
                  <Alert icon={<IconCheck size={16} />} title="選択されたテンプレート" color="blue" mb="lg">
                    <Text size="sm">{selectedTemplate.name} - {selectedTemplate.description}</Text>
                  </Alert>

                  <Stack>
                    <TextInput
                      label="プロジェクト名"
                      placeholder="例: 東京都港区麻布台1丁目 一筆地測量"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.currentTarget.value})}
                      required
                    />

                    <Textarea
                      label="プロジェクト説明"
                      placeholder="プロジェクトの詳細な説明を入力してください"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.currentTarget.value})}
                      minRows={3}
                      required
                    />

                    <TextInput
                      label="調査場所"
                      placeholder="例: 東京都港区麻布台1丁目1番地"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.currentTarget.value})}
                      required
                    />

                    <NumberInput
                      label="調査面積 (㎡)"
                      placeholder="1000"
                      value={formData.area}
                      onChange={(value) => setFormData({...formData, area: value?.toString() || ''})}
                      min={0}
                    />
                  </Stack>
                </div>
              )}
            </Stepper.Step>

            <Stepper.Step label="測量設定" description="技術的設定">
              <Stack>
                <Select
                  label="図面縮尺"
                  value={formData.scale}
                  onChange={(value) => setFormData({...formData, scale: value || '1:500'})}
                  data={[
                    { value: '1:250', label: '1:250' },
                    { value: '1:500', label: '1:500' },
                    { value: '1:1000', label: '1:1000' },
                    { value: '1:2500', label: '1:2500' }
                  ]}
                />

                <Select
                  label="座標系"
                  value={formData.coordinateSystem}
                  onChange={(value) => setFormData({...formData, coordinateSystem: value || 'JGD2011'})}
                  data={[
                    { value: 'JGD2011', label: 'JGD2011 (日本測地系2011)' },
                    { value: 'JGD2000', label: 'JGD2000 (日本測地系2000)' },
                    { value: 'Tokyo', label: '日本測地系 (Tokyo Datum)' }
                  ]}
                />

                {selectedTemplate && (
                  <Alert icon={<IconCheck size={16} />} title="設定確認" color="green" mt="md">
                    <Stack gap="xs">
                      <Text size="sm"><strong>プロジェクト名:</strong> {formData.name}</Text>
                      <Text size="sm"><strong>テンプレート:</strong> {selectedTemplate.name}</Text>
                      <Text size="sm"><strong>調査場所:</strong> {formData.location}</Text>
                      <Text size="sm"><strong>面積:</strong> {formData.area}㎡</Text>
                      <Text size="sm"><strong>縮尺:</strong> {formData.scale}</Text>
                      <Text size="sm"><strong>座標系:</strong> {formData.coordinateSystem}</Text>
                    </Stack>
                  </Alert>
                )}
              </Stack>
            </Stepper.Step>
          </Stepper>

          <Group justify="space-between" mt="xl">
            <Group>
              <Button 
                variant="default" 
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                キャンセル
              </Button>
              {activeStep > 0 && (
                <Button
                  variant="default"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handlePrevStep}
                >
                  戻る
                </Button>
              )}
            </Group>

            <Group>
              {activeStep < 2 ? (
                <Button
                  rightSection={<IconArrowRight size={16} />}
                  onClick={handleNextStep}
                  disabled={activeStep === 0 && !selectedTemplate}
                >
                  次へ
                </Button>
              ) : (
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={handleCreateProject}
                  disabled={!formData.name || !formData.description || !formData.location}
                >
                  プロジェクトを作成
                </Button>
              )}
            </Group>
          </Group>
        </Modal>
      </Container>
    );
  }

  return (
    <Container size="lg" py={40}>
      <Paper shadow="sm" p={20} mb={30} withBorder>
        <Title order={2}>地籍調査CADシステム</Title>
        <Text size="sm" c="dimmed">テスト版</Text>
      </Paper>

      <Stack>
        <Alert icon={<IconCheck size={16} />} title="システム稼働中" color="green">
          システムが正常に動作しています。
        </Alert>

        <Paper shadow="sm" p={30} radius="md" withBorder>
          <Title order={3} mb={20}>テスト機能</Title>
          
          <Group>
            <Button 
              variant="filled"
              onClick={() => setShowProjects(true)}
            >
              プロジェクト管理テスト
            </Button>
            <Button 
              variant="filled"
              leftSection={<IconPencil size={16} />}
              onClick={() => setShowCADEditor(true)}
            >
              CAD編集
            </Button>
          </Group>
        </Paper>
      </Stack>
    </Container>
  );
};