import * as THREE from 'three';

// 描画要素の型定義を直接定義
interface BaseElement {
  id: string;
  type: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  properties: {
    color: string;
    lineWidth: number;
    lineType: string;
    fillColor?: string;
    text?: string;
    fontSize?: number;
    rotation?: number;
  };
  layerId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

interface LineElement extends BaseElement {
  type: 'line';
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
}

interface PointElement extends BaseElement {
  type: 'point';
  position: THREE.Vector3;
}

interface TextElement extends BaseElement {
  type: 'text';
  position: THREE.Vector3;
  text: string;
  fontSize: number;
}

interface PolygonElement extends BaseElement {
  type: 'polygon';
  points: THREE.Vector3[];
}

// 線分を作成
export const createLineElement = (
  id: string,
  startPoint: THREE.Vector3,
  endPoint: THREE.Vector3,
  options: {
    color?: string;
    lineWidth?: number;
    layer?: string;
  } = {}
): LineElement => {
  const { color = '#000000', lineWidth = 1, layer } = options;

  // ジオメトリ作成
  const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
  
  // マテリアル作成
  const material = new THREE.LineBasicMaterial({ 
    color: new THREE.Color(color),
    linewidth: lineWidth
  });

  // メッシュ作成
  const mesh = new THREE.Line(geometry, material);

  return {
    id,
    type: 'line',
    geometry,
    material,
    mesh,
    startPoint,
    endPoint,
    lineWidth,
    color,
    visible: true,
    locked: false,
    layer
  };
};

// 点を作成
export const createPointElement = (
  id: string,
  position: THREE.Vector3,
  options: {
    color?: string;
    size?: number;
    symbol?: string;
    layer?: string;
  } = {}
): PointElement => {
  const { color = '#ff0000', size = 3, symbol = 'circle', layer } = options;

  // ジオメトリ作成（小さな球体で点を表現）
  const geometry = new THREE.SphereGeometry(size, 8, 8);
  
  // マテリアル作成
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });

  // メッシュ作成
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);

  return {
    id,
    type: 'point',
    geometry,
    material,
    mesh,
    position,
    size,
    color,
    symbol,
    visible: true,
    locked: false,
    layer
  };
};

// テキストを作成（簡易版、後でより高度な実装に置き換え可能）
export const createTextElement = (
  id: string,
  position: THREE.Vector3,
  text: string,
  options: {
    fontSize?: number;
    color?: string;
    rotation?: number;
    layer?: string;
  } = {}
): TextElement => {
  const { fontSize = 16, color = '#000000', rotation = 0, layer } = options;

  // 簡易的なテキスト表現（後でFont Loaderを使った実装に置き換え）
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `${fontSize}px Arial`;
  const textWidth = context.measureText(text).width;
  const textHeight = fontSize;

  canvas.width = textWidth;
  canvas.height = textHeight;
  context.font = `${fontSize}px Arial`;
  context.fillStyle = color;
  context.fillText(text, 0, fontSize);

  // テクスチャ作成
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  
  // スプライト作成
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.scale.set(textWidth / 10, textHeight / 10, 1);
  
  if (rotation !== 0) {
    sprite.rotateZ(rotation);
  }

  // ダミージオメトリ（型の整合性のため）
  const geometry = new THREE.PlaneGeometry(textWidth / 10, textHeight / 10);

  return {
    id,
    type: 'text',
    geometry,
    material,
    mesh: sprite as any, // SpriteはMeshの派生ではないが、描画用として使用
    position,
    text,
    fontSize,
    color,
    rotation,
    visible: true,
    locked: false,
    layer
  };
};

// ポリゴンを作成
export const createPolygonElement = (
  id: string,
  points: THREE.Vector3[],
  options: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    layer?: string;
  } = {}
): PolygonElement => {
  const { fillColor = '#ffffff', strokeColor = '#000000', strokeWidth = 1, layer } = options;

  // Shape作成
  const shape = new THREE.Shape();
  if (points.length > 0) {
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();
  }

  // ジオメトリ作成
  const geometry = new THREE.ShapeGeometry(shape);
  
  // マテリアル作成
  const material = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(fillColor),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });

  // メッシュ作成
  const mesh = new THREE.Mesh(geometry, material);

  // 輪郭線の追加（オプション）
  if (strokeColor && strokeWidth > 0) {
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: new THREE.Color(strokeColor),
      linewidth: strokeWidth
    });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(wireframe);
  }

  return {
    id,
    type: 'polygon',
    geometry,
    material,
    mesh,
    points,
    fillColor,
    strokeColor,
    strokeWidth,
    visible: true,
    locked: false,
    layer
  };
};

// 描画要素の可視性を切り替え
export const toggleElementVisibility = (element: any, visible: boolean) => {
  if (element.mesh) {
    element.mesh.visible = visible;
  }
  element.visible = visible;
};

// 描画要素の色を変更
export const changeElementColor = (element: any, color: string) => {
  if (element.material) {
    element.material.color.setHex(color.replace('#', '0x'));
  }
  element.color = color;
};

// 座標変換ユーティリティ
export const screenToWorld = (
  screenX: number, 
  screenY: number, 
  camera: THREE.OrthographicCamera, 
  renderer: THREE.WebGLRenderer
): THREE.Vector3 => {
  const mouse = new THREE.Vector2();
  const rect = renderer.domElement.getBoundingClientRect();
  
  mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

  const worldX = (mouse.x * (camera.right - camera.left)) / 2;
  const worldY = (mouse.y * (camera.top - camera.bottom)) / 2;

  return new THREE.Vector3(worldX, worldY, 0);
};