'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import { useSocket } from '../../hooks/useSocket';
import { Send, UserCircle2, Bot, AlertCircle, MessageSquare, HeadphonesIcon } from 'lucide-react';
import { getStoredUser, chatApi } from '../../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'bot' | 'agent';
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  status: 'bot' | 'pending_agent' | 'agent' | 'closed';
  messages: Message[];
  endUserId: string;
}

export default function AgentWorkspace() {
  const { socket, isConnected, joinAgentRoom, joinConversation, sendAgentReply } = useSocket();
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join the agent room for this tenant
    joinAgentRoom();

    // Listen for new handoff requests
    socket.on('newInboxItem', (data: { conversationId: string; endUserId: string; lastMessage: string }) => {
      setConversations(prev => ({
        ...prev,
        [data.conversationId]: {
          id: data.conversationId,
          status: 'pending_agent',
          endUserId: data.endUserId,
          messages: prev[data.conversationId]?.messages || [
            { id: Date.now().toString(), sender: 'user', content: data.lastMessage, timestamp: new Date().toISOString() }
          ],
        }
      }));
    });

    // Listen for user messages in active conversations
    socket.on('agentMessage', (data: { conversationId: string; sender: 'user'; content: string }) => {
      setConversations(prev => {
        const conv = prev[data.conversationId] || { id: data.conversationId, status: 'agent', endUserId: 'User', messages: [] };
        return {
          ...prev,
          [data.conversationId]: {
            ...conv,
            messages: [...conv.messages, { id: Date.now().toString(), sender: data.sender, content: data.content, timestamp: new Date().toISOString() }]
          }
        };
      });
    });

    // Load existing conversations from REST API
    chatApi.listConversations().then(convos => {
      const convMap: Record<string, Conversation> = {};
      for (const c of convos) {
        if (c.status === 'pending_agent' || c.status === 'agent') {
          convMap[c.id] = {
            id: c.id,
            status: c.status,
            endUserId: c.endUserId || 'Customer',
            messages: [],
          };
        }
      }
      setConversations(prev => ({ ...convMap, ...prev }));
    }).catch(() => {
      // API may not be ready; start with empty
    });

    return () => {
      socket.off('newInboxItem');
      socket.off('agentMessage');
    };
  }, [socket, isConnected]);

  // Scroll to bottom when active conversation messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvId, conversations[activeConvId || '']?.messages?.length]);

  // When selecting a conversation, join its Socket.io room
  useEffect(() => {
    if (activeConvId && isConnected) {
      joinConversation(activeConvId);

      // Load messages for this conversation
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
      }).catch(() => {
        // Messages may fail to load if API is not ready
      });
    }
  }, [activeConvId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConvId) return;

    sendAgentReply(activeConvId, replyText);

    // Optimistically update UI
    setConversations(prev => {
      const conv = prev[activeConvId];
      return {
        ...prev,
        [activeConvId]: {
          ...conv,
          status: 'agent',
          messages: [...conv.messages, { id: Date.now().toString(), sender: 'agent', content: replyText, timestamp: new Date().toISOString() }]
        }
      };
    });

    setReplyText('');
  };

  const handleCloseSession = async (convId: string) => {
    try {
      await chatApi.updateStatus(convId, 'closed');
      setConversations(prev => {
        const copy = { ...prev };
        delete copy[convId];
        return copy;
      });
      setActiveConvId(null);
    } catch (e) {
      console.error('Failed to close session', e);
    }
  };

  const activeConv = activeConvId ? conversations[activeConvId] : null;
  const convList = Object.values(conversations);

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Inbox List */}
        <div className="w-80 border-r border-[rgba(255,255,255,0.08)] bg-slate-900/40 flex flex-col">
          <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
            <h2 className="text-lg font-semibold">Agent Inbox</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <p className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Connecting...'}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No conversations yet.</p>
                <p className="text-xs mt-1">New handoff requests will appear here.</p>
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
                    <span className={`text-xs flex items-center gap-1 ${conv.status === 'pending_agent' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {conv.status === 'pending_agent' ? (
                        <><AlertCircle className="w-3 h-3" /> Waiting</>
                      ) : (
                        <><HeadphonesIcon className="w-3 h-3" /> Active</>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {conv.messages[conv.messages.length - 1]?.content || 'No messages'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConv ? (
            <>
              <div className="p-4 border-b border-[rgba(255,255,255,0.08)] glass backdrop-blur-md z-10 sticky top-0 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{activeConv.endUserId}</h3>
                  <p className={`text-xs ${activeConv.status === 'pending_agent' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {activeConv.status === 'pending_agent' ? 'Waiting for your response' : 'Agent Hand-off Active'}
                  </p>
                </div>
                <button
                  onClick={() => handleCloseSession(activeConv.id)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg text-sm transition-colors"
                >
                  Close Session
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConv.messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 flex gap-3 shadow-md ${
                      msg.sender === 'user' ? 'bg-slate-800 text-slate-200' :
                      msg.sender === 'bot' ? 'bg-indigo-900/40 border border-indigo-500/30 text-indigo-100' :
                      'bg-blue-600 text-white'
                    }`}>
                      {msg.sender !== 'agent' && (
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

              <div className="p-4 bg-slate-900/80 border-t border-[rgba(255,255,255,0.08)]">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your reply to the user..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
              <p>Select a conversation from the inbox to start replying.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
