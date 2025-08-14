import React, { useState } from 'react';
import CADMenu from './CADMenu';
import CADViewer from './CADViewer';

interface CADWorkspaceProps {
  projectId: string;
  projectName?: string;
}

interface SelectedFile {
  id: string;
  name: string;
  path: string;
  type: string;
}

const CADWorkspace: React.FC<CADWorkspaceProps> = ({ 
  projectId, 
  projectName = "プロジェクト" 
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [selectedTool, setSelectedTool] = useState<string>('select');

  const handleFileSelect = (file: any) => {
    const cadFile: SelectedFile = {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type
    };
    setSelectedFile(cadFile);
  };

  const handleToolSelect = (tool: string) => {
    // ファイル選択の場合
    try {
      const parsed = JSON.parse(tool);
      if (parsed.action === 'select_file') {
        handleFileSelect(parsed.file);
        return;
      }
    } catch {
      // 通常のツール選択
      setSelectedTool(tool);
      console.log('Selected tool:', tool);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              {projectName} - CADワークスペース
            </h1>
            {selectedFile && (
              <span className="text-sm text-gray-600">
                編集中: {selectedFile.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              ツール: {selectedTool}
            </span>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex overflow-hidden">
        {/* CADメニュー（左サイドバー） */}
        <CADMenu 
          projectId={projectId}
          onToolSelect={handleToolSelect}
        />

        {/* CADビューワー（メインエリア） */}
        <CADViewer 
          projectId={projectId}
          selectedFile={selectedFile}
        />
      </div>

      {/* ステータスバー */}
      <div className="bg-white border-t border-gray-200 px-6 py-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span>座標: JGD2000 / 平面直角座標系第9系</span>
            <span>単位: m</span>
            {selectedFile && (
              <span>ファイル: {selectedFile.type}</span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>準備完了</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CADWorkspace;