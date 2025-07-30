import React, { useEffect, useState } from 'react';
import { Group, Text, Indicator, Avatar, Tooltip, Badge } from '@mantine/core';
import { IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useSocket } from '../../hooks/useSocket';
import { useDrawingStore } from '../drawing/DrawingStore';
import { useAuth } from '../../hooks/useAuth';
import { DrawingElement } from '../../types/drawing';

interface RealtimeSyncProps {
  projectId: string | null;
  onSyncError?: (error: string) => void;
}

interface OnlineUser {
  userId: string;
  userName: string;
  socketId: string;
  cursor?: { x: number; y: number };
  lastActivity: number;
}

export const RealtimeSync = React.forwardRef<
  {
    syncDrawingChange: (action: 'create' | 'update' | 'delete', element: DrawingElement) => void;
    syncCursorPosition: (position: { x: number; y: number }) => void;
  },
  RealtimeSyncProps
>(({ projectId, onSyncError }, ref) => {
  const { user } = useAuth();
  const { addElement, updateElement, removeElement } = useDrawingStore();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const {
    connected,
    connecting,
    error,
    joinProject,
    leaveProject,
    sendDrawingUpdate,
    sendCursorUpdate,
    addEventListener
  } = useSocket({
    autoConnect: true,
    reconnectAttempts: 5
  });

  // プロジェクト参加・離脱の管理
  useEffect(() => {
    if (projectId && connected) {
      joinProject(projectId);
    } else if (!projectId) {
      leaveProject();
    }

    return () => {
      if (projectId) {
        leaveProject();
      }
    };
  }, [projectId, connected]);

  // 描画更新イベントのリスナー
  useEffect(() => {
    const unsubscribeDrawingUpdate = addEventListener('drawing-update', (data) => {
      // 自分自身の更新は無視
      if (data.userId === user?.id) {
        return;
      }

      console.log('Received drawing update:', data);
      
      try {
        switch (data.action) {
          case 'create':
            addElement(data.element);
            break;
          case 'update':
            updateElement(data.element.id, data.element);
            break;
          case 'delete':
            removeElement(data.element.id);
            break;
        }
        
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('Failed to apply drawing update:', error);
        onSyncError?.('図形の同期に失敗しました');
      }
    });

    return unsubscribeDrawingUpdate;
  }, [user?.id, addElement, updateElement, removeElement, onSyncError]);

  // カーソル更新イベントのリスナー
  useEffect(() => {
    const unsubscribeCursorUpdate = addEventListener('cursor-update', (data) => {
      // 自分自身のカーソルは無視
      if (data.userId === user?.id) {
        return;
      }

      setOnlineUsers(prev => {
        const updated = new Map(prev);
        const existingUser = updated.get(data.userId);
        
        updated.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          socketId: data.socketId,
          cursor: data.position,
          lastActivity: Date.now(),
          ...existingUser
        });
        
        return updated;
      });
    });

    return unsubscribeCursorUpdate;
  }, [user?.id]);

  // ユーザー参加イベントのリスナー
  useEffect(() => {
    const unsubscribeUserJoined = addEventListener('user-joined', (data) => {
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        updated.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          socketId: '',
          lastActivity: Date.now()
        });
        return updated;
      });
    });

    return unsubscribeUserJoined;
  }, []);

  // ユーザー離脱イベントのリスナー
  useEffect(() => {
    const unsubscribeUserLeft = addEventListener('user-left', (data) => {
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    return unsubscribeUserLeft;
  }, []);

  // 同期エラーイベントのリスナー
  useEffect(() => {
    const unsubscribeSyncError = addEventListener('sync-error', (data) => {
      console.error('Sync error:', data);
      onSyncError?.(data.error);
    });

    return unsubscribeSyncError;
  }, [onSyncError]);

  // 描画要素の変更を他のユーザーに送信
  const syncDrawingChange = React.useCallback((
    action: 'create' | 'update' | 'delete',
    element: DrawingElement
  ) => {
    if (!projectId || !connected) {
      return;
    }

    sendDrawingUpdate({
      action,
      element,
      projectId
    });
  }, [projectId, connected, sendDrawingUpdate]);

  // カーソル位置の送信（スロットル処理付き）
  const syncCursorPosition = React.useCallback(
    throttle((position: { x: number; y: number }) => {
      if (connected) {
        sendCursorUpdate(position);
      }
    }, 100),
    [connected, sendCursorUpdate]
  );

  // 外部からアクセスできるように参照を公開
  React.useImperativeHandle(ref, () => ({
    syncDrawingChange,
    syncCursorPosition
  }), [syncDrawingChange, syncCursorPosition]);

  // エラーがある場合は表示
  useEffect(() => {
    if (error) {
      onSyncError?.(error);
    }
  }, [error, onSyncError]);

  // 非アクティブなユーザーの削除（5分後）
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setOnlineUsers(prev => {
        const updated = new Map(prev);
        for (const [userId, userData] of updated) {
          if (now - userData.lastActivity > 5 * 60 * 1000) { // 5分
            updated.delete(userId);
          }
        }
        return updated;
      });
    }, 60000); // 1分間隔でチェック

    return () => clearInterval(cleanup);
  }, []);

  const getConnectionStatus = () => {
    if (connecting) return { color: 'yellow', label: '接続中...' };
    if (connected) return { color: 'green', label: '接続済み' };
    return { color: 'red', label: '切断' };
  };

  const status = getConnectionStatus();
  const onlineUsersList = Array.from(onlineUsers.values())
    .filter(u => u.userId !== user?.id); // 自分自身を除外

  return (
    <Group spacing="xs" align="center">
      {/* 接続状態インジケーター */}
      <Tooltip label={`リアルタイム同期: ${status.label}`}>
        <Group spacing="xs">
          <Indicator color={status.color} size={8}>
            {connected ? <IconWifi size={16} /> : <IconWifiOff size={16} />}
          </Indicator>
          <Text size="xs" c="dimmed">
            {status.label}
          </Text>
        </Group>
      </Tooltip>

      {/* オンラインユーザー表示 */}
      {onlineUsersList.length > 0 && (
        <>
          <Text size="xs" c="dimmed">|</Text>
          <Group spacing="xs">
            <Text size="xs" c="dimmed">
              共同編集中:
            </Text>
            {onlineUsersList.slice(0, 3).map((onlineUser) => (
              <Tooltip 
                key={onlineUser.userId}
                label={`${onlineUser.userName} (アクティブ)`}
              >
                <Avatar
                  size="xs"
                  color="blue"
                  radius="xl"
                >
                  {onlineUser.userName.charAt(0).toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
            {onlineUsersList.length > 3 && (
              <Badge size="xs" color="gray">
                +{onlineUsersList.length - 3}
              </Badge>
            )}
          </Group>
        </>
      )}

      {/* 最終同期時刻 */}
      {lastSyncTime && (
        <>
          <Text size="xs" c="dimmed">|</Text>
          <Text size="xs" c="dimmed">
            最終同期: {lastSyncTime.toLocaleTimeString()}
          </Text>
        </>
      )}
    </Group>
  );
});

RealtimeSync.displayName = 'RealtimeSync';

// スロットル関数
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

// エクスポート用のヘルパー関数
export const useRealtimeSync = (projectId: string | null) => {
  const syncRef = React.useRef<{
    syncDrawingChange: (action: 'create' | 'update' | 'delete', element: DrawingElement) => void;
    syncCursorPosition: (position: { x: number; y: number }) => void;
  } | null>(null);

  return {
    setSyncRef: (ref: typeof syncRef.current) => {
      syncRef.current = ref;
    },
    syncDrawingChange: (action: 'create' | 'update' | 'delete', element: DrawingElement) => {
      syncRef.current?.syncDrawingChange(action, element);
    },
    syncCursorPosition: (position: { x: number; y: number }) => {
      syncRef.current?.syncCursorPosition(position);
    }
  };
};