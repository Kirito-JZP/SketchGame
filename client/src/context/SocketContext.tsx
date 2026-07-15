import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LiveDrawing, RoomState } from '../types';
import { saveSession } from '../utils/session';

interface SocketContextValue {
  connected: boolean;
  roomState: RoomState | null;
  liveDrawing: LiveDrawing | null;
  joinRoom: (params: { roomId?: string; playerName?: string; createNew?: boolean }) => Promise<{ roomId: string; state: RoomState }>;
  emit: (event: string, data?: unknown) => Promise<{ success?: boolean; error?: string; result?: string }>;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [liveDrawing, setLiveDrawing] = useState<LiveDrawing | null>(null);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:update', (state: RoomState) => setRoomState(state));
    socket.on('drawing:live', (data: LiveDrawing) => setLiveDrawing(data));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback(
    (params: { roomId?: string; playerName?: string; createNew?: boolean }) =>
      new Promise<{ roomId: string; state: RoomState }>((resolve, reject) => {
        socketRef.current?.emit('room:join', params, (res: { roomId?: string; state?: RoomState; error?: string }) => {
          if (res.error) reject(new Error(res.error));
          else if (res.roomId && res.state) {
            setRoomState(res.state);
            const me = res.state.players.find((p) => p.id === res.state!.myId);
            if (me?.name) {
              saveSession({ roomId: res.roomId, playerName: me.name });
            } else if (params.playerName) {
              saveSession({ roomId: res.roomId, playerName: params.playerName });
            }
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
