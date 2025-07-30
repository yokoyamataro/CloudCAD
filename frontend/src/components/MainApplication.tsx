import React, { useState, useEffect } from 'react';
import {
  AppShell,
  Group,
  Text,
  Alert,
  LoadingOverlay,
  Modal,
  Stack,
  Button,
  Select,
  TextInput,
  Textarea
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { useAuth, authenticatedRequest } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useLayer } from '../hooks/useLayer';
import { useDrawingStore } from '../modules/drawing/DrawingStore';

// コンポーネントのインポート
import { AppHeader } from './layout/AppHeader';
import { DrawingToolbar } from './tools/DrawingToolbar';
import { PropertiesPanel } from './tools/PropertiesPanel';
import { LayerPanel } from './layers/LayerPanel';
import { ThreeCanvas } from '../modules/drawing/ThreeCanvas';
import { SXFLoader } from '../modules/sxf/SXFLoader';
import { RealtimeSync } from '../modules/realtime/RealtimeSync';

// 型定義
interface Project {
  id: string;
  name: string;
  description?: string;
  surveyArea?: string;
  coordinateSystem: string;
  createdAt: string;
  updatedAt: string;
}

export const MainApplication: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { connected, joinProject } = useSocket();
  const { loadLayers, createStandardLayers } = useLayer();
  const { 
    elements, 
    selectedElements, 
    currentTool,
    hasUnsavedChanges,
    markClean 
  } = useDrawingStore();

  // 状態管理
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  // プロジェクト作成フォーム
  const createProjectForm = useForm({
    initialValues: {
      name: '',
      description: '',
      surveyArea: '',
      coordinateSystem: 'JGD2000'
    },
    validate: {
      name: (value) => !value ? 'プロジェクト名は必須です' : null
    }
  });

  // 初期化処理
  useEffect(() => {
    initializeApplication();
  }, []);

  // プロジェクト変更時の処理
  useEffect(() => {
    if (currentProject) {
      joinProject(currentProject.id);
      loadLayers(currentProject.id);
    }
  }, [currentProject?.id]);

  const initializeApplication = async () => {
    try {
      setLoading(true);
      await loadProjects();
    } catch (err) {
      setError('アプリケーションの初期化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await authenticatedRequest('/projects');
      const projectList: Project[] = response.projects || [];
      setProjects(projectList);

      // 最初のプロジェクトを自動選択
      if (projectList.length > 0 && !currentProject) {
        setCurrentProject(projectList[0]);
      } else if (projectList.length === 0 && hasRole('surveyor')) {
        // プロジェクトがない場合は作成モーダルを表示
        setShowCreateProjectModal(true);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('プロジェクトの読み込みに失敗しました');
    }
  };

  const handleCreateProject = async (values: any) => {
    try {
      const response = await authenticatedRequest('/projects', {
        method: 'POST',
        body: JSON.stringify(values)
      });

      const newProject: Project = response.project;
      setProjects(prev => [newProject, ...prev]);
      setCurrentProject(newProject);
      setShowCreateProjectModal(false);
      createProjectForm.reset();

      // 標準レイヤーを作成
      await createStandardLayers(newProject.id);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('プロジェクトの作成に失敗しました');
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      if (hasUnsavedChanges()) {
        if (window.confirm('未保存の変更があります。プロジェクトを切り替えますか？')) {
          setCurrentProject(project);
          markClean();
        }
      } else {
        setCurrentProject(project);
      }
    }
    setShowProjectModal(false);
  };

  const handleSaveProject = async () => {
    if (!currentProject) return;

    try {
      // 図面データの保存
      const drawingData = {
        elements: elements,
        metadata: {
          lastModified: new Date().toISOString(),
          elementCount: elements.length,
          selectedCount: selectedElements.length
        }
      };

      await authenticatedRequest(`/projects/${currentProject.id}/save`, {
        method: 'POST',
        body: JSON.stringify(drawingData)
      });

      markClean();
      setError(null);
    } catch (err) {
      console.error('Failed to save project:', err);
      setError('プロジェクトの保存に失敗しました');
    }
  };

  const coordinateSystemOptions = [
    { value: 'JGD2000', label: 'JGD2000 (世界測地系)' },
    { value: 'JGD2011', label: 'JGD2011' },
    { value: 'EPSG:4612', label: 'JGD2000 / Japan Plane Rectangular CS' }
  ];

  if (loading) {
    return <LoadingOverlay visible />;
  }

  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: true } }}
        aside={{ width: 320, breakpoint: 'md', collapsed: { desktop: false, mobile: true } }}
        padding="md"
      >
        {/* ヘッダー */}
        <AppShell.Header>
          <AppHeader
            onOpenProjects={() => setShowProjectModal(true)}
            hasUnsavedChanges={hasUnsavedChanges()}
          />
        </AppShell.Header>

        {/* サイドバー（レイヤーパネル） */}
        <AppShell.Navbar p="md">
          <Stack h="100%">
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {currentProject?.name || 'プロジェクト未選択'}
              </Text>
              {hasRole('surveyor') && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={handleSaveProject}
                  disabled={!hasUnsavedChanges()}
                >
                  保存
                </Button>
              )}
            </Group>

            {currentProject && (
              <LayerPanel
                projectId={currentProject.id}
                height={window.innerHeight - 200}
              />
            )}
          </Stack>
        </AppShell.Navbar>

        {/* プロパティパネル */}
        <AppShell.Aside p="md">
          <PropertiesPanel />
        </AppShell.Aside>

        {/* メインコンテンツ */}
        <AppShell.Main>
          <Stack h="100%" spacing="md">
            {/* エラー表示 */}
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                onClose={() => setError(null)}
                withCloseButton
              >
                {error}
              </Alert>
            )}

            {/* ツールバー */}
            <DrawingToolbar />

            {/* リアルタイム同期状態 */}
            <Group justify="space-between">
              <RealtimeSync
                projectId={currentProject?.id || null}
                onSyncError={setError}
              />
              <Group spacing="xs">
                <Text size="xs" c="dimmed">
                  座標系: {currentProject?.coordinateSystem || 'JGD2000'}
                </Text>
                <Text size="xs" c="dimmed">|</Text>
                <Text size="xs" c="dimmed">
                  要素数: {elements.length}
                </Text>
                {selectedElements.length > 0 && (
                  <>
                    <Text size="xs" c="dimmed">|</Text>
                    <Text size="xs" c="blue">
                      {selectedElements.length}個選択中
                    </Text>
                  </>
                )}
              </Group>
            </Group>

            {/* 描画キャンバス */}
            {currentProject ? (
              <div style={{ flex: 1, position: 'relative' }}>
                <ThreeCanvas
                  width={window.innerWidth - 700} // サイドバー幅を考慮
                  height={window.innerHeight - 300} // ヘッダー・ツールバー高さを考慮
                  drawingState={{
                    elements,
                    selectedElements,
                    currentTool,
                    settings: {
                      backgroundColor: '#f0f0f0',
                      gridVisible: true,
                      gridSize: 10,
                      snapToGrid: false,
                      defaultLineColor: '#000000',
                      defaultPointColor: '#ff0000',
                      defaultTextColor: '#000000'
                    },
                    camera: {
                      position: { x: 0, y: 0, z: 100 } as any,
                      target: { x: 0, y: 0, z: 0 } as any,
                      zoom: 1,
                      is2D: true
                    },
                    isDirty: hasUnsavedChanges()
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Stack align="center" spacing="md">
                  <Text size="lg" c="dimmed">
                    プロジェクトを選択してください
                  </Text>
                  {hasRole('surveyor') && (
                    <Button
                      leftSection={<IconPlus size={16} />}
                      onClick={() => setShowCreateProjectModal(true)}
                    >
                      新規プロジェクト作成
                    </Button>
                  )}
                </Stack>
              </div>
            )}
          </Stack>
        </AppShell.Main>
      </AppShell>

      {/* プロジェクト選択モーダル */}
      <Modal
        opened={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title="プロジェクト選択"
        size="md"
      >
        <Stack spacing="md">
          {projects.map((project) => (
            <div
              key={project.id}
              style={{
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: currentProject?.id === project.id ? '#e7f5ff' : '#fff'
              }}
              onClick={() => handleProjectSelect(project.id)}
            >
              <Text fw={500}>{project.name}</Text>
              {project.description && (
                <Text size="sm" c="dimmed">{project.description}</Text>
              )}
              <Text size="xs" c="dimmed">
                更新日: {new Date(project.updatedAt).toLocaleDateString()}
              </Text>
            </div>
          ))}
          
          {hasRole('surveyor') && (
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setShowProjectModal(false);
                setShowCreateProjectModal(true);
              }}
            >
              新規プロジェクト作成
            </Button>
          )}
        </Stack>
      </Modal>

      {/* プロジェクト作成モーダル */}
      <Modal
        opened={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        title="新規プロジェクト作成"
        size="md"
      >
        <form onSubmit={createProjectForm.onSubmit(handleCreateProject)}>
          <Stack spacing="md">
            <TextInput
              label="プロジェクト名"
              placeholder="例: 〇〇町地籍調査"
              {...createProjectForm.getInputProps('name')}
            />
            <Textarea
              label="説明"
              placeholder="プロジェクトの説明（任意）"
              {...createProjectForm.getInputProps('description')}
            />
            <TextInput
              label="調査地区"
              placeholder="例: 〇〇町△△地区"
              {...createProjectForm.getInputProps('surveyArea')}
            />
            <Select
              label="座標系"
              data={coordinateSystemOptions}
              {...createProjectForm.getInputProps('coordinateSystem')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="outline"
                onClick={() => setShowCreateProjectModal(false)}
              >
                キャンセル
              </Button>
              <Button type="submit">作成</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
};