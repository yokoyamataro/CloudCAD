import React, { useState } from 'react';
import { Button, Group, Stack, Title, Text, Tabs } from '@mantine/core';
import * as THREE from 'three';
import { ThreeCanvas } from '../modules/drawing/ThreeCanvas';
import { useDrawingStore } from '../modules/drawing/DrawingStore';
import { SXFLoader } from '../modules/sxf/SXFLoader';
import type { DrawingElement } from '../types/drawing';

export const DrawingDemo: React.FC = () => {
  const {
    elements,
    selectedElements,
    currentTool,
    setCurrentTool,
    addLine,
    addPoint,
    addText,
    addPolygon,
    clearSelection
  } = useDrawingStore();

  const [clickCount, setClickCount] = useState(0);
  const [tempPoints, setTempPoints] = useState<THREE.Vector3[]>([]);

  const handleCanvasClick = (position: THREE.Vector3) => {
    console.log('Canvas clicked at:', position);

    switch (currentTool) {
      case 'point':
        addPoint(position);
        break;
        
      case 'line':
        if (clickCount === 0) {
          setTempPoints([position]);
          setClickCount(1);
        } else {
          addLine(tempPoints[0], position);
          setClickCount(0);
          setTempPoints([]);
        }
        break;
        
      case 'text':
        addText(position, 'サンプルテキスト');
        break;
        
      case 'polygon':
        if (clickCount < 3) {
          setTempPoints(prev => [...prev, position]);
          setClickCount(prev => prev + 1);
        } else {
          addPolygon([...tempPoints, position]);
          setClickCount(0);
          setTempPoints([]);
        }
        break;
        
      default:
        clearSelection();
        break;
    }
  };

  const handleElementClick = (element: DrawingElement) => {
    console.log('Element clicked:', element);
  };

  const addSampleElements = () => {
    // サンプル線分
    addLine(
      new THREE.Vector3(-100, -50, 0),
      new THREE.Vector3(100, 50, 0),
      { color: '#0066cc' }
    );

    // サンプル点
    addPoint(
      new THREE.Vector3(50, 50, 0),
      { color: '#ff6600', size: 5 }
    );

    // サンプルテキスト
    addText(
      new THREE.Vector3(-50, 80, 0),
      '地籍調査CAD',
      { fontSize: 20, color: '#009900' }
    );

    // サンプルポリゴン
    addPolygon([
      new THREE.Vector3(-80, -80, 0),
      new THREE.Vector3(-20, -80, 0),
      new THREE.Vector3(-20, -20, 0),
      new THREE.Vector3(-80, -20, 0)
    ], {
      fillColor: '#ff9999',
      strokeColor: '#cc0000',
      strokeWidth: 2
    });
  };

  const clearAll = () => {
    // 全要素をクリア（ストアに実装が必要）
    elements.forEach(element => {
      // removeElement(element.id); // この機能を使用
    });
  };

  const drawingState = {
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
      position: new THREE.Vector3(0, 0, 100),
      target: new THREE.Vector3(0, 0, 0),
      zoom: 1,
      is2D: true
    },
    isDirty: false
  };

  return (
    <div style={{ padding: '20px' }}>
      <Stack spacing="md">
        <Title order={2}>地籍調査CAD - Phase 1 デモ</Title>
        
        <Text size="sm" color="dimmed">
          現在のツール: {currentTool} | 要素数: {elements.length} | 選択数: {selectedElements.length}
          {clickCount > 0 && ` | クリック回数: ${clickCount}`}
        </Text>

        <Tabs defaultValue="drawing">
          <Tabs.List>
            <Tabs.Tab value="drawing">基本描画</Tabs.Tab>
            <Tabs.Tab value="sxf">SXFファイル読み込み</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="drawing" pt="xs">
            <Stack spacing="md">
              <Group>
                <Button 
                  variant={currentTool === 'select' ? 'filled' : 'outline'}
                  onClick={() => setCurrentTool('select')}
                >
                  選択
                </Button>
                <Button 
                  variant={currentTool === 'point' ? 'filled' : 'outline'}
                  onClick={() => setCurrentTool('point')}
                >
                  点
                </Button>
                <Button 
                  variant={currentTool === 'line' ? 'filled' : 'outline'}
                  onClick={() => setCurrentTool('line')}
                >
                  線分
                </Button>
                <Button 
                  variant={currentTool === 'text' ? 'filled' : 'outline'}
                  onClick={() => setCurrentTool('text')}
                >
                  テキスト
                </Button>
                <Button 
                  variant={currentTool === 'polygon' ? 'filled' : 'outline'}
                  onClick={() => setCurrentTool('polygon')}
                >
                  ポリゴン
                </Button>
              </Group>

              <Group>
                <Button onClick={addSampleElements} color="green">
                  サンプル要素追加
                </Button>
                <Button onClick={clearAll} color="red" variant="outline">
                  全クリア
                </Button>
              </Group>

              <Text size="xs" color="dimmed">
                操作方法:<br/>
                • 点ツール: キャンバスをクリックして点を配置<br/>
                • 線分ツール: 2回クリックして線分を描画<br/>
                • テキストツール: クリックしてテキストを配置<br/>
                • ポリゴンツール: 4回クリックしてポリゴンを作成
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="sxf" pt="xs">
            <SXFLoader
              onLoadComplete={(success, message) => {
                console.log('SXF Load completed:', success, message);
              }}
              conversionOptions={{
                scale: 0.1,
                flipY: true
              }}
            />
          </Tabs.Panel>
        </Tabs>

        <div style={{ border: '2px solid #ddd', borderRadius: '8px', padding: '10px' }}>
          <ThreeCanvas
            width={800}
            height={600}
            onCanvasClick={handleCanvasClick}
            onElementClick={handleElementClick}
            drawingState={drawingState}
          />
        </div>
      </Stack>
    </div>
  );
};