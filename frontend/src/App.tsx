import { useState } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { ProjectManager } from './components/projects/ProjectManager';
import { ProjectDetail } from './components/projects/ProjectDetail';
import { CADEditor } from './components/cad/CADEditor';
import { CoordinateEditor } from './components/coordinates/CoordinateEditor';
import { LotEditor } from './components/lots/LotEditor';
import type { Project } from './types/project';

interface AppState {
  currentView: 'projects' | 'detail' | 'cad' | 'coordinate' | 'lot';
  selectedProject: Project | null;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentView: 'projects',
    selectedProject: null
  });

  const handleProjectSelect = (project: Project) => {
    setAppState({
      currentView: 'detail',
      selectedProject: project
    });
  };

  const handleBackToProjects = () => {
    setAppState({
      currentView: 'projects',
      selectedProject: null
    });
  };

  const handleBackToDetail = () => {
    setAppState(prev => ({
      ...prev,
      currentView: 'detail'
    }));
  };

  const handleEditMode = (mode: 'cad' | 'coordinate' | 'lot') => {
    console.log('handleEditMode called with mode:', mode);
    setAppState(prev => {
      const newState = {
        ...prev,
        currentView: mode
      };
      console.log('App state updated to:', newState);
      return newState;
    });
  };

  const handleProjectUpdate = (project: Project) => {
    setAppState(prev => ({
      ...prev,
      selectedProject: project
    }));
  };

  const handleSave = (data: unknown) => {
    console.log('CADデータを保存:', data);
    // ここで実際の保存処理を実装
  };

  const renderCurrentView = () => {
    console.log('renderCurrentView called with currentView:', appState.currentView);
    switch (appState.currentView) {
      case 'projects':
        return <ProjectManager onProjectSelect={handleProjectSelect} />;
      
      case 'detail':
        return appState.selectedProject ? (
          <ProjectDetail
            project={appState.selectedProject}
            onBack={handleBackToProjects}
            onUpdate={handleProjectUpdate}
            onEditMode={handleEditMode}
          />
        ) : (
          <ProjectManager onProjectSelect={handleProjectSelect} />
        );
      
      case 'cad':
        return appState.selectedProject ? (
          <CADEditor
            projectId={appState.selectedProject.id}
            onClose={handleBackToDetail}
            onSave={handleSave}
            initialTab={appState.currentView}
          />
        ) : (
          <ProjectManager onProjectSelect={handleProjectSelect} />
        );
      
      case 'coordinate':
        console.log('Rendering CoordinateEditor with project:', appState.selectedProject?.name);
        return appState.selectedProject ? (
          <CoordinateEditor
            project={appState.selectedProject}
            onClose={handleBackToDetail}
          />
        ) : (
          <ProjectManager onProjectSelect={handleProjectSelect} />
        );
      
      case 'lot':
        return appState.selectedProject ? (
          <CoordinateEditor
            project={appState.selectedProject}
            onClose={handleBackToDetail}
            initialTab="lots"
          />
        ) : (
          <ProjectManager onProjectSelect={handleProjectSelect} />
        );
      
      default:
        return <ProjectManager onProjectSelect={handleProjectSelect} />;
    }
  };

  return (
    <MantineProvider>
      {renderCurrentView()}
    </MantineProvider>
  );
}

export default App