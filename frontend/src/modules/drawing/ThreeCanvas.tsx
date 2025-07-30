import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { DrawingState, DrawingElement, CameraSettings } from '../../types/drawing';

interface ThreeCanvasProps {
  width?: number;
  height?: number;
  onElementClick?: (element: DrawingElement) => void;
  onCanvasClick?: (position: THREE.Vector3) => void;
  drawingState?: DrawingState;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  width = 800,
  height = 600,
  onElementClick,
  onCanvasClick,
  drawingState
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Three.js初期化
  useEffect(() => {
    if (!mountRef.current || isInitialized) return;

    // シーン作成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // カメラ作成（2D CAD用の正投影カメラ）
    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2,
      height / 2, -height / 2,
      0.1, 1000
    );
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // レンダラー作成
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // グリッド追加
    const gridHelper = new THREE.GridHelper(1000, 100, 0xcccccc, 0xeeeeee);
    gridHelper.rotateX(Math.PI / 2);
    scene.add(gridHelper);

    // 軸ヘルパー追加
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // DOM要素に追加
    mountRef.current.appendChild(renderer.domElement);

    // 初期レンダリング
    renderer.render(scene, camera);
    setIsInitialized(true);

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [width, height, isInitialized]);

  // マウスイベント処理
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        // 要素クリック処理
        if (onElementClick && intersect.object.userData?.element) {
          onElementClick(intersect.object.userData.element);
        }
      } else {
        // キャンバスクリック処理
        if (onCanvasClick) {
          const worldPosition = new THREE.Vector3(
            (mouse.x * (cameraRef.current.right - cameraRef.current.left)) / 2,
            (mouse.y * (cameraRef.current.top - cameraRef.current.bottom)) / 2,
            0
          );
          onCanvasClick(worldPosition);
        }
      }
    };

    const canvas = rendererRef.current.domElement;
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('click', handleClick);
    };
  }, [onElementClick, onCanvasClick]);

  // 描画要素の更新
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current || !drawingState) return;

    // 既存の描画要素をクリア（グリッドと軸は残す）
    const objectsToRemove = sceneRef.current.children.filter(
      child => child.userData?.isDrawingElement
    );
    objectsToRemove.forEach(obj => sceneRef.current!.remove(obj));

    // 新しい描画要素を追加
    drawingState.elements.forEach(element => {
      if (element.mesh) {
        element.mesh.userData = { isDrawingElement: true, element };
        sceneRef.current!.add(element.mesh);
      }
    });

    // レンダリング
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [drawingState]);

  // リサイズ処理
  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current) return;

    rendererRef.current.setSize(width, height);
    
    cameraRef.current.left = -width / 2;
    cameraRef.current.right = width / 2;
    cameraRef.current.top = height / 2;
    cameraRef.current.bottom = -height / 2;
    cameraRef.current.updateProjectionMatrix();

    rendererRef.current.render(sceneRef.current!, cameraRef.current);
  }, [width, height]);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width, 
        height, 
        border: '1px solid #ccc',
        borderRadius: '4px',
        overflow: 'hidden'
      }} 
    />
  );
};

export default ThreeCanvas;