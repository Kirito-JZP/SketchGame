import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { RoomState } from '../types';

interface SocketContextValue {
  connected: boolean;
  roomState: RoomState | null;
  liveDrawing: { data: string; sketchIndex: number } | null;
  joinRoom: (params: { roomId?: string; categoryId?: string; categoryFolder?: string; playerName?: string }) => Promise<{ roomId: string; state: RoomState }>;
  emit: (event: string, data?: unknown) => Promise<{ success?: boolean; error?: string; result?: string }>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [liveDrawing, setLiveDrawing] = useState<{ data: string; sketchIndex: number } | null>(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:update', (state: RoomState) => setRoomState(state));
    socket.on('drawing:live', (data: { data: string; sketchIndex: number }) => setLiveDrawing(data));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback(
    (params: { roomId?: string; categoryId?: string; categoryFolder?: string; playerName?: string }) =>
      new Promise<{ roomId: string; state: RoomState }>((resolve, reject) => {
        socketRef.current?.emit('room:join', params, (res: { roomId?: string; state?: RoomState; error?: string }) => {
          if (res.error) reject(new Error(res.error));
          else if (res.roomId && res.state) {
            setRoomState(res.state);
            resolve({ roomId: res.roomId, state: res.state });
          } else {
            reject(new Error('Failed to join room'));
          }
        });
      }),
    []
  );

  const emit = useCallback((event: string, data?: unknown) => {
    return new Promise<{ success?: boolean; error?: string; result?: string }>((resolve) => {
      socketRef.current?.emit(event, data ?? {}, resolve);
    });
  }, []);

  return (
    <SocketContext.Provider value={{ connected, roomState, liveDrawing, joinRoom, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
