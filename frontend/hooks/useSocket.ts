'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredUser } from '../lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;

    const newSocket = io(WS_URL, {
      query: { tenantId: user.tenantId },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  const joinAgentRoom = useCallback(() => {
    socketRef.current?.emit('joinAgentRoom');
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('joinConversation', { conversationId });
  }, []);

  const sendAgentReply = useCallback((conversationId: string, content: string) => {
    socketRef.current?.emit('agentReply', { conversationId, content });
  }, []);

  return {
    socket,
    isConnected,
    joinAgentRoom,
    joinConversation,
    sendAgentReply,
  };
}
