'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Send, User, Bot, Headset, Loader2, Minus, Maximize2 } from 'lucide-react';

// Note: Ensure `uuid` is installed, or fallback to crypto
function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Message {
  id: string;
  sender: 'user' | 'bot' | 'agent' | 'system';
  content: string;
}

function WidgetContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams?.get('tenantId');
  const chatbotId = searchParams?.get('chatbotId');

  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId] = useState(generateId());
  const [isMinimized, setIsMinimized] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;

    // Connect to WebSocket server
    const socketInstance = io(API_BASE, {
      query: { tenantId, ...(chatbotId ? { chatbotId } : {}) },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('joinConversation', { conversationId });
      
      // Initial greeting
      setMessages([{
        id: generateId(),
        sender: 'bot',
        content: 'Hello! I am your AI assistant. How can I help you today?'
      }]);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('newMessage', (msg: { sender: 'user' | 'bot' | 'agent' | 'system', content: string }) => {
      setMessages(prev => [...prev, { id: generateId(), ...msg }]);
    });

    // Handle streaming chunks
    let currentStreamId = '';
    socketInstance.on('messageChunk', ({ chunk }) => {
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.sender === 'bot' && lastMsg.id === currentStreamId) {
          // Append to existing stream
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: lastMsg.content + chunk }
          ];
        } else {
          // New stream started
          currentStreamId = generateId();
          return [...prev, { id: currentStreamId, sender: 'bot', content: chunk }];
        }
      });
    });

    socketInstance.on('agentJoined', (data: { agentName: string }) => {
      setMessages(prev => [...prev, {
        id: generateId(),
        sender: 'system',
        content: `${data.agentName} has joined the chat.`
      }]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [tenantId, chatbotId, conversationId]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    const sanitizedContent = input.trim();
    
    // Optimistically add user message
    setMessages(prev => [...prev, { id: generateId(), sender: 'user', content: sanitizedContent }]);
    
    // Emit to backend
    socket.emit('sendMessage', { conversationId, content: sanitizedContent });
    setInput('');
  };

  const requestHandoff = () => {
    if (!socket) return;
    socket.emit('handoffRequest', { conversationId });
  };

  if (!tenantId) {
    return <div className="p-4 text-red-500 bg-white shadow-xl rounded-2xl">Error: Missing tenantId in query string.</div>;
  }

  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all z-50 flex items-center justify-center group"
      >
        <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="w-6 h-6" />
            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-blue-600 ${isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-blue-100 text-[10px]">{isConnected ? 'Online' : 'Connecting...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-blue-700 rounded-lg transition-colors text-blue-100 hover:text-white">
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              {msg.sender !== 'system' && (
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1
                  ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 
                    msg.sender === 'bot' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}
                `}>
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : 
                   msg.sender === 'bot' ? <Bot className="w-3.5 h-3.5" /> : <Headset className="w-3.5 h-3.5" />}
                </div>
              )}

              {/* Bubble */}
              <div className={`
                ${msg.sender === 'system' 
                  ? 'bg-slate-200/50 text-slate-500 text-xs px-3 py-1 rounded-full w-full text-center my-2'
                  : msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm px-4 py-2 shadow-sm'}
              `}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Input */}
      <div className="p-3 bg-white border-t border-slate-100">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={!isConnected}
            className="flex-1 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl px-4 py-2 text-sm text-slate-700 transition-all outline-none disabled:opacity-50"
          />
          <button 
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-center">
          <button 
            type="button"
            onClick={requestHandoff}
            className="text-[11px] text-slate-400 hover:text-blue-600 font-medium transition-colors"
          >
            Request Human Agent
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WidgetContent />
    </Suspense>
  );
}
