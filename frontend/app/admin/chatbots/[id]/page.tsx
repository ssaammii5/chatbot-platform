'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '../../../../components/Sidebar';
import {
  Bot,
  Globe,
  Database,
  Users,
  Save,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  UserPlus,
  UserMinus,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  User,
  Circle,
} from 'lucide-react';
import {
  chatbotsApi,
  knowledgeApi,
  getStoredUser,
  type ChatbotDetail,
  type ChatbotAgent,
} from '../../../../lib/api';

interface KnowledgeBase {
  id: string;
  name: string;
}

interface TenantAgent {
  id: string;
  userId: string;
  email: string;
  status: string;
  role: string;
}

const STATUS_COLOR: Record<string, string> = {
  online: 'text-emerald-400',
  busy: 'text-amber-400',
  offline: 'text-slate-500',
};

export default function ChatbotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;

  const [chatbot, setChatbot] = useState<ChatbotDetail | null>(null);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [allAgents, setAllAgents] = useState<TenantAgent[]>([]);
  const [assignedAgents, setAssignedAgents] = useState<ChatbotAgent[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [assigning, setAssigning] = useState<string | null>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [selectedKbId, setSelectedKbId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const user = getStoredUser();
      if (!user) { window.location.href = '/login'; return; }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      const [bot, bases, assignedList, agentsRes] = await Promise.all([
        chatbotsApi.get(chatbotId),
        knowledgeApi.listBases(),
        chatbotsApi.listAgents(chatbotId),
        // Fetch tenant agents from the agents endpoint
        fetch(`${API_BASE}/agents`, {
          credentials: 'include',
        }).then(r => r.ok ? r.json() : []),
      ]);

      setChatbot(bot);
      setName(bot.name);
      setDomain(bot.domain ?? '');
      setSelectedKbId(bot.knowledgeBaseId ?? '');
      setIsActive(bot.isActive);
      setKbs(bases);
      setAssignedAgents(assignedList);
      setAllAgents(agentsRes || []);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const updated = await chatbotsApi.update(chatbotId, {
        name: name.trim(),
        domain: domain.trim() || undefined,
        knowledgeBaseId: selectedKbId || null,
        isActive,
      });
      setChatbot(prev => prev ? { ...prev, ...updated } : prev);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign(agentId: string) {
    setAssigning(agentId);
    try {
      await chatbotsApi.assignAgent(chatbotId, agentId);
      const updated = await chatbotsApi.listAgents(chatbotId);
      setAssignedAgents(updated);
    } catch {
      // ignore duplicate errors silently
    } finally {
      setAssigning(null);
    }
  }

  async function handleUnassign(agentId: string) {
    setAssigning(agentId);
    try {
      await chatbotsApi.unassignAgent(chatbotId, agentId);
      setAssignedAgents(prev => prev.filter(a => a.agentId !== agentId));
    } catch {
      // ignore
    } finally {
      setAssigning(null);
    }
  }

  const assignedAgentIds = new Set(assignedAgents.map(a => a.agentId));

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </main>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="flex h-screen w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <AlertCircle className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-lg">Chatbot not found</p>
          <Link href="/admin/chatbots" className="mt-4 text-blue-400 text-sm hover:underline">← Back to Chatbots</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/admin/chatbots" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Chatbots
            </Link>
            <span>/</span>
            <span className="text-slate-300 font-medium truncate">{chatbot.name}</span>
          </div>

          {/* Page Header */}
          <header className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700/50 text-slate-500'}`}>
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{chatbot.name}</h1>
              {chatbot.domain && (
                <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {chatbot.domain}
                </p>
              )}
            </div>
            <div className="ml-auto">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-700/50 text-slate-500 border-slate-600/30'
              }`}>
                <Circle className="w-2 h-2 fill-current" />
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </header>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Settings Form */}
            <div className="lg:col-span-3 space-y-6">
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                  <Bot className="w-4.5 h-4.5 text-blue-400" />
                  Configuration
                </h2>

                <form id="chatbot-settings-form" onSubmit={handleSave} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label htmlFor="edit-name" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Chatbot Name *
                    </label>
                    <input
                      id="edit-name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>

                  {/* Domain */}
                  <div>
                    <label htmlFor="edit-domain" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Website Domain
                      <span className="text-slate-500 font-normal ml-1">(optional)</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        id="edit-domain"
                        type="text"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        placeholder="shop.example.com"
                        className="w-full bg-slate-800/60 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5">The domain this chatbot widget is embedded on.</p>
                  </div>

                  {/* Knowledge Base */}
                  <div>
                    <label htmlFor="edit-kb" className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      Knowledge Base
                    </label>
                    <select
                      id="edit-kb"
                      value={selectedKbId}
                      onChange={e => setSelectedKbId(e.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    >
                      <option value="">None — tenant-wide fallback</option>
                      {kbs.map(kb => (
                        <option key={kb.id} value={kb.id}>{kb.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5">
                      Select a knowledge base for this chatbot. Multiple chatbots can share the same knowledge base.
                    </p>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-[rgba(255,255,255,0.06)]">
                    <div>
                      <p className="text-sm font-medium text-slate-300">Active Status</p>
                      <p className="text-xs text-slate-500 mt-0.5">Inactive chatbots won't respond to new conversations.</p>
                    </div>
                    <button
                      id="edit-active-toggle"
                      type="button"
                      onClick={() => setIsActive(v => !v)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {isActive
                        ? <ToggleRight className="w-8 h-8 text-blue-400" />
                        : <ToggleLeft className="w-8 h-8" />
                      }
                    </button>
                  </div>

                  {/* Feedback */}
                  {saveError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {saveError}
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      Changes saved successfully!
                    </div>
                  )}

                  <button
                    id="save-chatbot-btn"
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Widget Embed Snippet */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  Widget Embed Code
                </h3>
                <pre className="text-xs bg-slate-900/60 border border-slate-700 rounded-lg p-4 overflow-x-auto text-emerald-300 select-all">
{`<script src="https://your-platform.com/widget.js"></script>
<ai-chat-widget
  tenant-id="${chatbot.tenantId}"
  chatbot-id="${chatbot.id}"
></ai-chat-widget>`}
                </pre>
                <p className="text-xs text-slate-500 mt-2">
                  Add this to any page on <span className="text-slate-400">{chatbot.domain || 'your website'}</span> to embed this chatbot.
                </p>
              </div>
            </div>

            {/* Agent Assignment Panel */}
            <div className="lg:col-span-2">
              <div className="glass-card p-6 sticky top-8">
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-purple-400" />
                  Assigned Agents
                </h2>
                <p className="text-xs text-slate-500 mb-5">
                  These agents handle human handoffs for this chatbot.
                </p>

                {allAgents.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No agents in this tenant yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allAgents.map(agent => {
                      const isAssigned = assignedAgentIds.has(agent.id);
                      const isLoading = assigning === agent.id;

                      return (
                        <div
                          key={agent.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            isAssigned
                              ? 'bg-purple-500/10 border-purple-500/20'
                              : 'bg-slate-800/40 border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-200 truncate">{agent.email}</p>
                            <p className={`text-xs capitalize ${STATUS_COLOR[agent.status] ?? 'text-slate-500'}`}>
                              {agent.status}
                            </p>
                          </div>
                          <button
                            id={`agent-toggle-${agent.id}`}
                            onClick={() => isAssigned ? handleUnassign(agent.id) : handleAssign(agent.id)}
                            disabled={isLoading}
                            title={isAssigned ? 'Remove from chatbot' : 'Assign to chatbot'}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${
                              isAssigned
                                ? 'text-purple-400 hover:text-red-400 hover:bg-red-500/10'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {isLoading
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : isAssigned
                                ? <UserMinus className="w-4 h-4" />
                                : <UserPlus className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {assignedAgents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)] text-xs text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {assignedAgents.length} agent{assignedAgents.length !== 1 ? 's' : ''} assigned
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
