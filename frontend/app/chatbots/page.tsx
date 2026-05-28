'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import {
  Bot,
  Plus,
  Globe,
  Database,
  Users,
  Loader2,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  X,
  Sparkles,
} from 'lucide-react';
import { chatbotsApi, knowledgeApi, getStoredUser, type ChatbotSummary } from '../../../lib/api';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
}

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<ChatbotSummary[]>([]);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newKbId, setNewKbId] = useState('');

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [bots, bases] = await Promise.all([
        chatbotsApi.list(),
        knowledgeApi.listBases(),
      ]);
      setChatbots(bots);
      setKbs(bases);
    } catch {
      // silently show empty state
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await chatbotsApi.create({
        name: newName.trim(),
        domain: newDomain.trim() || undefined,
        knowledgeBaseId: newKbId || undefined,
      });
      setShowCreate(false);
      setNewName('');
      setNewDomain('');
      setNewKbId('');
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create chatbot');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(bot: ChatbotSummary) {
    try {
      await chatbotsApi.update(bot.id, { isActive: !bot.isActive });
      setChatbots(prev => prev.map(b => b.id === bot.id ? { ...b, isActive: !b.isActive } : b));
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this chatbot? This cannot be undone.')) return;
    try {
      await chatbotsApi.remove(id);
      setChatbots(prev => prev.filter(b => b.id !== id));
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Bot className="w-7 h-7" />
                </div>
                Chatbots
              </h1>
              <p className="text-slate-400 mt-2 text-sm">
                Each chatbot is scoped to a website, knowledge base, and set of agents.
              </p>
            </div>
            <button
              id="create-chatbot-btn"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            >
              <Plus className="w-4 h-4" />
              New Chatbot
            </button>
          </header>

          {/* Create Modal */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="glass-card w-full max-w-lg p-8 space-y-6 animate-fade-in shadow-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Create New Chatbot
                  </h2>
                  <button onClick={() => { setShowCreate(false); setCreateError(''); }} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Chatbot Name *</label>
                    <input
                      id="chatbot-name-input"
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Shop Support Bot"
                      required
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Website Domain
                      <span className="text-slate-500 font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="chatbot-domain-input"
                        type="text"
                        value={newDomain}
                        onChange={e => setNewDomain(e.target.value)}
                        placeholder="shop.example.com"
                        className="w-full bg-slate-800/60 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Knowledge Base
                      <span className="text-slate-500 font-normal ml-1">(optional)</span>
                    </label>
                    <select
                      id="chatbot-kb-select"
                      value={newKbId}
                      onChange={e => setNewKbId(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="">None — uses tenant-wide fallback</option>
                      {kbs.map(kb => (
                        <option key={kb.id} value={kb.id}>{kb.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">You can also assign a knowledge base later.</p>
                  </div>

                  {createError && (
                    <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{createError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      id="chatbot-create-submit"
                      disabled={creating || !newName.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Create Chatbot
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCreate(false); setCreateError(''); }}
                      className="px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Chatbots Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : chatbots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 glass-card">
              <Bot className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-400">No chatbots yet</p>
              <p className="text-sm mt-1 mb-6">Create your first chatbot to get started.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Chatbot
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {chatbots.map(bot => (
                <div
                  key={bot.id}
                  className={`glass-card p-6 flex flex-col gap-4 transition-all duration-200 hover:border-blue-500/30 group ${!bot.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl flex-shrink-0 ${bot.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'}`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{bot.name}</p>
                        {bot.domain ? (
                          <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3" />
                            {bot.domain}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-600 mt-0.5">No domain set</p>
                        )}
                      </div>
                    </div>
                    <button
                      id={`toggle-chatbot-${bot.id}`}
                      onClick={() => handleToggleActive(bot)}
                      title={bot.isActive ? 'Deactivate' : 'Activate'}
                      className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {bot.isActive
                        ? <ToggleRight className="w-6 h-6 text-blue-400" />
                        : <ToggleLeft className="w-6 h-6" />
                      }
                    </button>
                  </div>

                  {/* Meta */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Database className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">
                        {bot.knowledgeBaseName
                          ? <span className="text-emerald-400">{bot.knowledgeBaseName}</span>
                          : <span className="text-slate-600">No knowledge base</span>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span>
                        {bot.isActive
                          ? <span className="text-blue-400">Active</span>
                          : <span className="text-slate-500">Inactive</span>
                        }
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.06)] mt-auto">
                    <Link
                      href={`/admin/chatbots/${bot.id}`}
                      id={`edit-chatbot-${bot.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-blue-500/10 hover:text-blue-400 text-slate-400 text-xs font-medium transition-all"
                    >
                      Configure
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      id={`delete-chatbot-${bot.id}`}
                      onClick={() => handleDelete(bot.id)}
                      className="py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-red-500/10 hover:text-red-400 text-slate-500 text-xs font-medium transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
