import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  Layers, 
  MapPin, 
  Ruler, 
  Settings, 
  Grid,
  Palette,
  Eye,
  EyeOff
} from 'lucide-react';
import CADDataManager from './CADDataManager';

interface CADMenuProps {
  projectId: string;
  onToolSelect?: (tool: string) => void;
}

const CADMenu: React.FC<CADMenuProps> = ({ projectId, onToolSelect }) => {
  const [activeTab, setActiveTab] = useState('files');
  const [layers, setLayers] = useState([
    { id: '1', name: '境界線', visible: true, color: '#FF0000', type: 'boundary' },
    { id: '2', name: '建物', visible: true, color: '#00FF00', type: 'building' },
    { id: '3', name: '道路', visible: true, color: '#0000FF', type: 'road' },
    { id: '4', name: '測量点', visible: true, color: '#FF00FF', type: 'survey_point' },
  ]);

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const cadTools = [
    { id: 'select', name: '選択', icon: '↗️', description: 'オブジェクトを選択' },
    { id: 'line', name: '線分', icon: '📏', description: '直線を描画' },
    { id: 'polyline', name: '連続線', icon: '〰️', description: '連続した線を描画' },
    { id: 'rectangle', name: '矩形', icon: '▢', description: '長方形を描画' },
    { id: 'circle', name: '円', icon: '○', description: '円を描画' },
    { id: 'text', name: 'テキスト', icon: 'A', description: 'テキストを追加' },
    { id: 'dimension', name: '寸法', icon: '↔️', description: '寸法線を追加' },
    { id: 'hatch', name: 'ハッチング', icon: '▦', description: '塗りつぶしパターン' },
  ];

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">CADメニュー</h2>
        <p className="text-sm text-gray-600">図面編集と表示設定</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 m-4 mb-2">
          <TabsTrigger value="files" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            ファイル
          </TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">
            <Settings className="w-3 h-3 mr-1" />
            ツール
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            レイヤー
          </TabsTrigger>
          <TabsTrigger value="view" className="text-xs">
            <Eye className="w-3 h-3 mr-1" />
            表示
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="files" className="p-4 pt-2 space-y-4">
            <CADDataManager 
              projectId={projectId}
              onFileSelect={(file) => {
                console.log('Selected CAD file:', file);
                // ファイル選択を親コンポーネントに通知
                if (onToolSelect) {
                  onToolSelect(JSON.stringify({ action: 'select_file', file }));
                }
              }}
            />
          </TabsContent>

          <TabsContent value="tools" className="p-4 pt-2 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">描画ツール</h3>
              <div className="grid grid-cols-2 gap-2">
                {cadTools.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    size="sm"
                    className="h-auto p-3 flex flex-col items-center space-y-1"
                    onClick={() => onToolSelect?.(tool.id)}
                  >
                    <span className="text-lg">{tool.icon}</span>
                    <span className="text-xs">{tool.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">測量ツール</h3>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => onToolSelect?.('survey_point')}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  測量点配置
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => onToolSelect?.('boundary_line')}
                >
                  <Ruler className="w-4 h-4 mr-2" />
                  境界線描画
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="p-4 pt-2 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">表示レイヤー</h3>
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div key={layer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleLayerVisibility(layer.id)}
                      >
                        {layer.visible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </Button>
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-sm font-medium">{layer.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {layer.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">レイヤー操作</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Layers className="w-4 h-4 mr-2" />
                  新規レイヤー
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Palette className="w-4 h-4 mr-2" />
                  レイヤー設定
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view" className="p-4 pt-2 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">表示設定</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Grid className="w-4 h-4 mr-2" />
                  グリッド表示
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Eye className="w-4 h-4 mr-2" />
                  スナップ設定
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">ズーム</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">全体表示</Button>
                <Button variant="outline" size="sm">ズームイン</Button>
                <Button variant="outline" size="sm">ズームアウト</Button>
                <Button variant="outline" size="sm">前の表示</Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">座標系情報</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs space-y-1">
                  <div>座標系: JGD2000</div>
                  <div>投影: 平面直角座標系</div>
                  <div>系番号: 第9系</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CADMenu;