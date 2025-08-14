import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { FileText, Upload, Eye, Download } from 'lucide-react';

interface CADFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  path: string;
}

interface CADDataManagerProps {
  projectId: string;
  onFileSelect?: (file: CADFile) => void;
}

const CADDataManager: React.FC<CADDataManagerProps> = ({ projectId, onFileSelect }) => {
  const [cadFiles, setCadFiles] = useState<CADFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CADFile | null>(null);
  const [loading, setLoading] = useState(false);

  // サンプルCADデータを読み込む
  useEffect(() => {
    loadSampleCADData();
  }, []);

  const loadSampleCADData = async () => {
    setLoading(true);
    try {
      // サンプルデータを設定（実際のファイル情報）
      const sampleFiles: CADFile[] = [
        {
          id: '1',
          name: '美山南地区画地調整図（仮）.SFC',
          size: 0, // ファイルサイズは後で取得
          type: 'SFC',
          lastModified: new Date('2023-06-17'),
          path: '../../../CADDATA/美山南地区画地調整図（仮）.SFC'
        }
      ];
      
      setCadFiles(sampleFiles);
    } catch (error) {
      console.error('CADデータの読み込みに失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: CADFile) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '不明';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">CADデータ管理</h3>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          CADファイル追加
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">読み込み中...</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {cadFiles.map((file) => (
            <Card key={file.id} className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFile?.id === file.id ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-sm font-medium">{file.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {file.type} • {formatFileSize(file.size)} • {file.lastModified.toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>{file.name} - プレビュー</DialogTitle>
                        </DialogHeader>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-4">
                            SXF形式のCADファイルです。詳細な図面データが含まれています。
                          </p>
                          <div className="bg-white p-4 rounded border">
                            <h4 className="font-medium mb-2">ファイル情報:</h4>
                            <ul className="text-sm space-y-1">
                              <li>• 形式: SXF (SFC)</li>
                              <li>• 作成日: {file.lastModified.toLocaleDateString()}</li>
                              <li>• 種類: 画地調整図</li>
                              <li>• 地区: 美山南地区</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleFileSelect(file)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleFileSelect(file)}
                    className="flex-1"
                  >
                    図面を開く
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleFileSelect(file)}
                  >
                    CADビューで表示
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {cadFiles.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">CADデータがありません</h3>
            <p className="text-gray-500 mb-4">
              CADファイルをアップロードして図面管理を開始してください。
            </p>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              最初のCADファイルを追加
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CADDataManager;