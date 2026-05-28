'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { useSocket } from '../../hooks/useSocket';
import { UserCircle2, Bot, AlertCircle, HeadphonesIcon, Activity, Eye, ShieldAlert, MessageSquarePlus } from 'lucide-react';
import { getStoredUser, chatApi } from '../../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  status: 'bot' | 'pending_agent' | 'agent' | 'closed';
  messages: Message[];
  endUserId: string;
}

export default function SupervisorMonitoring() {
  const { socket, isConnected, joinAgentRoom, joinConversation } = useSocket();
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [whisperText, setWhisperText] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
    if (user.role !== 'supervisor' && user.role !== 'admin' && user.role !== 'super_admin') {
      window.location.href = '/dashboard'; // Kick out standard agents
      return;
    }
    setUserRole(user.role);
    setUserId(user.id);
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Supervisors also listen to the agent room to see new handoffs and whispers
    joinAgentRoom();

    // Listen for new handoffs
    socket.on('newInboxItem', (data: { conversationId: string; endUserId: string; lastMessage: string }) => {
      setConversations(prev => ({
        ...prev,
        [data.conversationId]: {
          id: data.conversationId,
          status: 'pending_agent',
          endUserId: data.endUserId,
          messages: prev[data.conversationId]?.messages || [],
        }
      }));
    });

    // Listen for agent or user messages if joined
    socket.on('newMessage', (data: { sender: any; content: string }) => {
      setConversations(prev => {
        return prev;
      });
    });

    // Listen for whispers
    socket.on('newWhisper', (data: { conversationId: string; authorId: string; content: string }) => {
      setConversations(prev => {
        const conv = prev[data.conversationId];
        if (!conv) return prev;
        return {
          ...prev,
          [data.conversationId]: {
            ...conv,
            messages: [...conv.messages, { id: Date.now().toString(), sender: 'system', content: `[Whisper]: ${data.content}`, timestamp: new Date().toISOString() }]
          }
        };
      });
    });

    // Load all conversations from REST API
    chatApi.listConversations().then(convos => {
      const convMap: Record<string, Conversation> = {};
      for (const c of convos) {
        if (c.status !== 'closed') {
          convMap[c.id] = {
            id: c.id,
            status: c.status,
            endUserId: c.endUserId || 'Customer',
            messages: [],
          };
        }
      }
      setConversations(convMap);
    }).catch(() => { });

    return () => {
      socket.off('newInboxItem');
      socket.off('newMessage');
      socket.off('newWhisper');
    };
  }, [socket, isConnected]);

  // When selecting a conversation, join its Socket.io room to spectate
  useEffect(() => {
    if (activeConvId && isConnected) {
      joinConversation(activeConvId);

      // Load messages
      chatApi.getMessages(activeConvId).then(msgs => {
        setConversations(prev => {
          const conv = prev[activeConvId];
          if (!conv) return prev;
          return {
            ...prev,
            [activeConvId]: {
              ...conv,
              messages: msgs.map((m: any) => ({
                id: m.id,
                sender: m.role,
                content: m.content,
                timestamp: m.createdAt,
              })),
            }
          };
        });
      }).catch(() => { });
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations[activeConvId || '']?.messages?.length]);

  const handleWhisper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whisperText.trim() || !activeConvId || !socket) return;

    socket.emit('whisper', { conversationId: activeConvId, content: whisperText, authorId: userId });
    setWhisperText('');
  };

  const handleForceAssign = async (convId: string) => {
    try {
      await chatApi.assignAgent(convId, userId);
      setConversations(prev => {
        const conv = prev[convId];
        return {
          ...prev,
          [convId]: { ...conv, status: 'agent' }
        };
      });
      alert('Assigned to yourself.');
    } catch (e) {
      console.error(e);
      alert('Failed to assign.');
    }
  };

  const activeConv = activeConvId ? conversations[activeConvId] : null;
  const convList = Object.values(conversations);

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Active Chats List */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.08)] bg-slate-900/40 flex flex-col">
          <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Live Monitoring
            </h2>
            <p className="text-xs text-slate-400 mt-1">Spectate all active sessions.</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <p>No active conversations across the platform.</p>
              </div>
            ) : (
              convList.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-4 border-b border-[rgba(255,255,255,0.05)] transition-colors ${activeConvId === conv.id ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : 'hover:bg-slate-800/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{conv.endUserId}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      conv.status === 'bot' ? 'bg-indigo-500/20 text-indigo-400' :
                      conv.status === 'pending_agent' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {conv.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Spectator Area */}
        <div className="flex-1 flex flex-col relative">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)] glass backdrop-blur-md z-10 sticky top-0 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400" />
                    Spectating: {activeConv.endUserId}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Status: {activeConv.status}</p>
                </div>
                {activeConv.status === 'pending_agent' && (
                  <button
                    onClick={() => handleForceAssign(activeConv.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Take Over Session
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConv.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 flex gap-3 shadow-md ${
                      msg.sender === 'user' ? 'bg-slate-800 text-slate-200' :
                      msg.sender === 'bot' ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100' :
                      msg.sender === 'system' ? 'bg-purple-900/20 border border-purple-500/30 text-purple-300 w-full justify-center text-xs italic' :
                      'bg-blue-600 text-white'
                    }`}>
                      {msg.sender !== 'agent' && msg.sender !== 'system' && (
                        <div className="mt-1">
                          {msg.sender === 'bot' ? <Bot className="w-4 h-4 text-indigo-400" /> : <UserCircle2 className="w-4 h-4 text-slate-400" />}
                        </div>
                      )}
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Whisper Input */}
              <div className="p-4 bg-slate-900/80 border-t border-[rgba(255,255,255,0.08)]">
                <form onSubmit={handleWhisper} className="flex gap-2">
                  <div className="flex-1 relative">
                    <MessageSquarePlus className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      type="text"
                      value={whisperText}
                      onChange={e => setWhisperText(e.target.value)}
                      placeholder="Whisper to the assigned agent (invisible to user)..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-purple-100 placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!whisperText.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Whisper
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <Eye className="w-12 h-12 mb-4 opacity-50 text-slate-600" />
              <p>Select a conversation to monitor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
