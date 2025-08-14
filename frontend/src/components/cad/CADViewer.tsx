import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move,
  Grid,
  Maximize,
  Info
} from 'lucide-react';

interface CADViewerProps {
  projectId: string;
  selectedFile?: {
    id: string;
    name: string;
    path: string;
    type: string;
  } | null;
}

interface CADElement {
  id: string;
  type: 'line' | 'point' | 'text' | 'polygon';
  coordinates: number[];
  properties: any;
  style: {
    color: string;
    lineWidth?: number;
    fontSize?: number;
  };
}

const CADViewer: React.FC<CADViewerProps> = ({ projectId, selectedFile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cadElements, setCadElements] = useState<CADElement[]>([]);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 1000 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(false);

  // SXFファイルのサンプルデータを生成（実際の実装ではファイルをパースする）
  const loadSXFData = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    
    // サンプルの美山南地区画地調整図データを模擬
    const sampleElements: CADElement[] = [
      // 境界線
      {
        id: '1',
        type: 'line',
        coordinates: [100, 100, 400, 100],
        properties: { label: '北側境界線', length: 300 },
        style: { color: '#FF0000', lineWidth: 2 }
      },
      {
        id: '2',
        type: 'line',
        coordinates: [400, 100, 400, 300],
        properties: { label: '東側境界線', length: 200 },
        style: { color: '#FF0000', lineWidth: 2 }
      },
      {
        id: '3',
        type: 'line',
        coordinates: [400, 300, 100, 300],
        properties: { label: '南側境界線', length: 300 },
        style: { color: '#FF0000', lineWidth: 2 }
      },
      {
        id: '4',
        type: 'line',
        coordinates: [100, 300, 100, 100],
        properties: { label: '西側境界線', length: 200 },
        style: { color: '#FF0000', lineWidth: 2 }
      },
      // 測量点
      {
        id: '5',
        type: 'point',
        coordinates: [100, 100],
        properties: { pointNumber: 'A-1', type: '境界点' },
        style: { color: '#0000FF', lineWidth: 3 }
      },
      {
        id: '6',
        type: 'point',
        coordinates: [400, 100],
        properties: { pointNumber: 'A-2', type: '境界点' },
        style: { color: '#0000FF', lineWidth: 3 }
      },
      {
        id: '7',
        type: 'point',
        coordinates: [400, 300],
        properties: { pointNumber: 'A-3', type: '境界点' },
        style: { color: '#0000FF', lineWidth: 3 }
      },
      {
        id: '8',
        type: 'point',
        coordinates: [100, 300],
        properties: { pointNumber: 'A-4', type: '境界点' },
        style: { color: '#0000FF', lineWidth: 3 }
      },
      // テキスト注記
      {
        id: '9',
        type: 'text',
        coordinates: [250, 50],
        properties: { text: '美山南地区 画地調整図（仮）', type: 'title' },
        style: { color: '#000000', fontSize: 16 }
      },
      {
        id: '10',
        type: 'text',
        coordinates: [250, 200],
        properties: { text: '面積: 600㎡', type: 'area' },
        style: { color: '#666666', fontSize: 12 }
      },
      // 建物
      {
        id: '11',
        type: 'polygon',
        coordinates: [150, 150, 350, 150, 350, 250, 150, 250],
        properties: { type: '建物', use: '住宅' },
        style: { color: '#00AA00', lineWidth: 1 }
      },
    ];
    
    setTimeout(() => {
      setCadElements(sampleElements);
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    if (selectedFile) {
      loadSXFData();
    }
  }, [selectedFile]);

  const drawCADElements = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 座標変換設定
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // グリッド描画
    drawGrid(ctx);

    // CAD要素描画
    cadElements.forEach(element => {
      ctx.strokeStyle = element.style.color;
      ctx.lineWidth = element.style.lineWidth || 1;
      
      switch (element.type) {
        case 'line':
          const [x1, y1, x2, y2] = element.coordinates;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          break;
          
        case 'point':
          const [px, py] = element.coordinates;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = element.style.color;
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // 点番号表示
          if (element.properties.pointNumber) {
            ctx.fillStyle = '#000000';
            ctx.font = '10px Arial';
            ctx.fillText(element.properties.pointNumber, px + 8, py - 8);
          }
          break;
          
        case 'text':
          const [tx, ty] = element.coordinates;
          ctx.fillStyle = element.style.color;
          ctx.font = `${element.style.fontSize || 12}px Arial`;
          ctx.fillText(element.properties.text, tx, ty);
          break;
          
        case 'polygon':
          ctx.beginPath();
          for (let i = 0; i < element.coordinates.length; i += 2) {
            const x = element.coordinates[i];
            const y = element.coordinates[i + 1];
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = element.style.color + '20'; // 透明度20%
          ctx.fill();
          break;
      }
    });

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 50;
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 0.5;
    
    // 縦線
    for (let x = 0; x <= 1000; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1000);
      ctx.stroke();
    }
    
    // 横線
    for (let y = 0; y <= 1000; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    drawCADElements();
  }, [cadElements, zoom, pan]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleZoomFit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      {/* ツールバー */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="font-medium">
            {selectedFile ? selectedFile.name : 'CADビューワー'}
          </h3>
          {selectedFile && (
            <Badge variant="outline">{selectedFile.type}</Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomFit}>
            <Maximize className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-500 px-2">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* メインビューエリア */}
      <div className="flex-1 flex">
        {selectedFile ? (
          <div className="flex-1 relative overflow-hidden">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">CADデータを読み込み中...</p>
                </div>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="border border-gray-300 bg-white cursor-move"
                style={{ margin: 'auto', display: 'block' }}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-96">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-gray-400" />
                </div>
                <CardTitle>CADファイルを選択してください</CardTitle>
                <CardDescription>
                  左側のCADメニューからファイルを選択すると、ここに図面が表示されます。
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-sm text-gray-600">
                  対応形式: SXF, SFC, DWG, DXF
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 情報パネル */}
        {selectedFile && (
          <div className="w-64 bg-white border-l border-gray-200 p-4">
            <h4 className="font-medium mb-4">図面情報</h4>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-500">ファイル名</div>
                <div className="font-medium">{selectedFile.name}</div>
              </div>
              <div>
                <div className="text-gray-500">形式</div>
                <div>{selectedFile.type}</div>
              </div>
              <div>
                <div className="text-gray-500">要素数</div>
                <div>{cadElements.length} 個</div>
              </div>
              <div>
                <div className="text-gray-500">座標系</div>
                <div>JGD2000 / 平面直角座標系第9系</div>
              </div>
            </div>

            {cadElements.length > 0 && (
              <>
                <h4 className="font-medium mb-2 mt-6">レイヤー構成</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>境界線 (4)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>測量点 (4)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>建物 (1)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-500 rounded"></div>
                    <span>注記 (2)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CADViewer;