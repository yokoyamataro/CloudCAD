import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
// DrawingElement型を直接定義
interface DrawingElement {
  id: string;
  type: 'line' | 'polyline' | 'polygon' | 'circle' | 'arc' | 'text' | 'point';
  coordinates: number[];
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

interface SocketEvents {
  // 描画更新イベント
  'drawing-update': (data: {
    action: 'create' | 'update' | 'delete';
    element: DrawingElement;
    projectId: string;
    userId: string;
    timestamp: number;
  }) => void;

  // カーソル位置更新
  'cursor-update': (data: {
    userId: string;
    userName: string;
    position: { x: number; y: number };
    projectId: string;
    socketId: string;
  }) => void;

  // ユーザー参加・離脱
  'user-joined': (data: {
    userId: string;
    userName: string;
    projectId: string;
  }) => void;

  'user-left': (data: {
    userId: string;
    projectId: string;
  }) => void;

  // プロジェクト状態更新
  'project-updated': (data: {
    projectId: string;
    changes: any;
    userId: string;
  }) => void;

  // エラー・警告
  'sync-error': (data: {
    error: string;
    details?: any;
  }) => void;
}

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  onlineUsers: Map<string, { userId: string; userName: string; socketId: string }>;
  lastActivity: number;
}

const SOCKET_URL = process.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = (options: UseSocketOptions = {}) => {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const { user, token, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
    onlineUsers: new Map(),
    lastActivity: Date.now()
  });

  const currentProjectRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const eventListenersRef = useRef<Map<string, Function[]>>(new Map());

  // Socket接続の初期化
  const initializeSocket = () => {
    if (socketRef.current || !isAuthenticated || !token) {
      return;
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    const socket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay
    });

    socketRef.current = socket;

    // 接続イベント
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setState(prev => ({ 
        ...prev, 
        connected: true, 
        connecting: false, 
        error: null,
        lastActivity: Date.now()
      }));
      reconnectAttemptsRef.current = 0;

      // 現在のプロジェクトに再参加
      if (currentProjectRef.current) {
        socket.emit('join-project', currentProjectRef.current);
      }
    });

    // 切断イベント
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false,
        onlineUsers: new Map()
      }));
    });

    // 接続エラー
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false,
        error: `接続エラー: ${error.message}`
      }));
    });

    // 再接続試行
    socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      setState(prev => ({ ...prev, connecting: true }));
      reconnectAttemptsRef.current = attempt;
    });

    // 再接続成功
    socket.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
      setState(prev => ({ 
        ...prev, 
        connected: true, 
        connecting: false, 
        error: null 
      }));
    });

    // 再接続失敗
    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
      setState(prev => ({ 
        ...prev, 
        connecting: false,
        error: '再接続に失敗しました' 
      }));
    });

    // 登録済みのイベントリスナーを復元
    eventListenersRef.current.forEach((listeners, eventName) => {
      listeners.forEach(listener => {
        socket.on(eventName, listener as any);
      });
    });
  };

  // Socket切断
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({ 
      ...prev, 
      connected: false, 
      connecting: false,
      onlineUsers: new Map()
    }));
    currentProjectRef.current = null;
  };

  // プロジェクトに参加
  const joinProject = (projectId: string) => {
    if (!socketRef.current || !state.connected) {
      console.warn('Socket not connected');
      return;
    }

    // 前のプロジェクトから離脱
    if (currentProjectRef.current && currentProjectRef.current !== projectId) {
      socketRef.current.emit('leave-project', currentProjectRef.current);
    }

    currentProjectRef.current = projectId;
    socketRef.current.emit('join-project', projectId);
    
    console.log('Joined project:', projectId);
  };

  // プロジェクトから離脱
  const leaveProject = () => {
    if (!socketRef.current || !currentProjectRef.current) {
      return;
    }

    socketRef.current.emit('leave-project', currentProjectRef.current);
    currentProjectRef.current = null;
    setState(prev => ({ ...prev, onlineUsers: new Map() }));
    
    console.log('Left project');
  };

  // 描画更新の送信
  const sendDrawingUpdate = (data: {
    action: 'create' | 'update' | 'delete';
    element: DrawingElement;
    projectId: string;
  }) => {
    if (!socketRef.current || !state.connected || !user) {
      return;
    }

    socketRef.current.emit('drawing-update', {
      ...data,
      userId: user.id,
      timestamp: Date.now()
    });

    setState(prev => ({ ...prev, lastActivity: Date.now() }));
  };

  // カーソル位置の送信
  const sendCursorUpdate = (position: { x: number; y: number }) => {
    if (!socketRef.current || !state.connected || !user || !currentProjectRef.current) {
      return;
    }

    socketRef.current.emit('cursor-update', {
      userId: user.id,
      userName: user.name,
      position,
      projectId: currentProjectRef.current
    });
  };

  // イベントリスナーの追加
  const addEventListener = <K extends keyof SocketEvents>(
    event: K,
    listener: SocketEvents[K]
  ) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, []);
    }
    
    eventListenersRef.current.get(event)!.push(listener);

    if (socketRef.current) {
      socketRef.current.on(event, listener as any);
    }

    // クリーンアップ関数を返す
    return () => {
      const listeners = eventListenersRef.current.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }

      if (socketRef.current) {
        socketRef.current.off(event, listener as any);
      }
    };
  };

  // 初期化と認証状態の監視
  useEffect(() => {
    if (autoConnect && isAuthenticated && token) {
      initializeSocket();
    } else if (!isAuthenticated) {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, autoConnect]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    // 状態
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    onlineUsers: state.onlineUsers,
    lastActivity: state.lastActivity,
    currentProject: currentProjectRef.current,

    // アクション
    connect: initializeSocket,
    disconnect,
    joinProject,
    leaveProject,
    sendDrawingUpdate,
    sendCursorUpdate,
    addEventListener,

    // Socket インスタンス（高度な使用のため）
    socket: socketRef.current
  };
};