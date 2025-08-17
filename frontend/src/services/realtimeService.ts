import { io, Socket } from 'socket.io-client';

// CADEditor で実際に使用されている CADElement の構造を再定義
interface CADElement {
  id: string;
  type: string;
  [key: string]: any;
}

interface ElementUpdate {
  id: string;
  geometry: string;
  properties?: any;
  style?: any;
}

interface CoordinateUpdate {
  elementId: string;
  coordinates: { x: number; y: number };
  userId: string;
  timestamp: string;
}

interface RealtimeEvents {
  // 要素関連
  'element-created': (element: any) => void;
  'element-updated': (element: any) => void;
  'element-deleted': (data: { id: string }) => void;
  'elements-batch-updated': (elements: any[]) => void;
  
  // 座標関連
  'coordinate-update': (data: CoordinateUpdate) => void;
  
  // 従来のイベント
  'drawing-update': (data: any) => void;
  'cursor-update': (data: any) => void;
}

class RealtimeService {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private userId: string | null = null;
  private callbacks: Map<keyof RealtimeEvents, Set<Function>> = new Map();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      
      // プロジェクトに再参加
      if (this.projectId) {
        this.joinProject(this.projectId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // リアルタイムイベントの設定
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // 要素作成
    this.socket.on('element-created', (element) => {
      console.log('🆕 Element created:', element.id);
      this.triggerCallbacks('element-created', element);
    });

    // 要素更新
    this.socket.on('element-updated', (element) => {
      console.log('📝 Element updated:', element.id);
      this.triggerCallbacks('element-updated', element);
    });

    // 要素削除
    this.socket.on('element-deleted', (data) => {
      console.log('🗑️ Element deleted:', data.id);
      this.triggerCallbacks('element-deleted', data);
    });

    // 一括更新
    this.socket.on('elements-batch-updated', (elements) => {
      console.log('📦 Elements batch updated:', elements.length);
      this.triggerCallbacks('elements-batch-updated', elements);
    });

    // 座標更新
    this.socket.on('coordinate-update', (data) => {
      console.log('📍 Coordinate update:', data.elementId);
      this.triggerCallbacks('coordinate-update', data);
    });

    // 従来のイベント
    this.socket.on('drawing-update', (data) => {
      this.triggerCallbacks('drawing-update', data);
    });

    this.socket.on('cursor-update', (data) => {
      this.triggerCallbacks('cursor-update', data);
    });
  }

  private triggerCallbacks(event: keyof RealtimeEvents, data: any) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // イベントリスナーを追加
  on<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event)!.add(callback);
  }

  // イベントリスナーを削除
  off<K extends keyof RealtimeEvents>(event: K, callback: RealtimeEvents[K]) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  // プロジェクトに参加
  joinProject(projectId: string, userId?: string) {
    if (!this.socket) return;
    
    this.projectId = projectId;
    if (userId) this.userId = userId;
    
    this.socket.emit('join-project', projectId);
    console.log('🏠 Joined project:', projectId);
  }

  // プロジェクトから離脱
  leaveProject(projectId: string) {
    if (!this.socket) return;
    
    this.socket.emit('leave-project', projectId);
    this.projectId = null;
    console.log('🚪 Left project:', projectId);
  }

  // 描画更新を送信
  sendDrawingUpdate(data: any) {
    if (!this.socket || !this.projectId) return;
    
    this.socket.emit('drawing-update', {
      ...data,
      projectId: this.projectId
    });
  }

  // カーソル位置を送信
  sendCursorUpdate(position: { x: number; y: number }) {
    if (!this.socket || !this.projectId) return;
    
    this.socket.emit('cursor-update', {
      projectId: this.projectId,
      position,
      userId: this.userId,
      timestamp: new Date().toISOString()
    });
  }

  // 接続状態を確認
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // 接続を切断
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
    this.projectId = null;
    this.userId = null;
  }

  // 再接続
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.initializeSocket();
    }
  }
}

// シングルトンインスタンス
export const realtimeService = new RealtimeService();
export default realtimeService;