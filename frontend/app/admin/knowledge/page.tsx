'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../../components/Sidebar';
import { Database, UploadCloud, Loader2, Plus, FileText, Trash2 } from 'lucide-react';
import { knowledgeApi, getStoredUser } from '../../../lib/api';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [newBaseName, setNewBaseName] = useState('');
  const [newBaseDesc, setNewBaseDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
    loadBases();
  }, []);

  async function loadBases() {
    try {
      const data = await knowledgeApi.listBases();
      setBases(data);
    } catch {
      // Start with empty list if API not ready
      setBases([]);
    }
  }

  const handleCreateBase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaseName.trim()) return;
    setStatus({ type: 'loading', message: 'Creating knowledge base...' });
    try {
      await knowledgeApi.createBase({ name: newBaseName, description: newBaseDesc || undefined });
      setNewBaseName('');
      setNewBaseDesc('');
      setShowCreateForm(false);
      await loadBases();
      setStatus({ type: 'success', message: 'Knowledge base created!' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Failed to create knowledge base' });
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedBase) {
      setStatus({ type: 'error', message: 'Please select a knowledge base and choose a file.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Uploading document...' });

    try {
      await knowledgeApi.upload(selectedBase, file);
      setStatus({ type: 'success', message: 'Document successfully queued for AI processing!' });
      setFile(null);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message || 'Upload failed' });
    }
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-0">
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
              <p className="text-slate-400 mt-1">Upload and manage documents for your AI agents.</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Base
            </button>
          </header>

          {/* Create Knowledge Base Form */}
          {showCreateForm && (
            <div className="glass-card p-6 max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Create Knowledge Base</h2>
              <form onSubmit={handleCreateBase} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={newBaseName}
                    onChange={e => setNewBaseName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g., Product Documentation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
                  <input
                    type="text"
                    value={newBaseDesc}
                    onChange={e => setNewBaseDesc(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="What kind of documents will be in this base?"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  Create
                </button>
              </form>
            </div>
          )}

          {/* Knowledge Bases List */}
          {bases.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold mb-4">Your Knowledge Bases</h2>
              <div className="space-y-3">
                {bases.map(kb => (
                  <div
                    key={kb.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedBase === kb.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-slate-900/30 border-[rgba(255,255,255,0.05)] hover:bg-slate-800/50'
                    }`}
                    onClick={() => setSelectedBase(kb.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{kb.name}</h3>
                        {kb.description && <p className="text-xs text-slate-500">{kb.description}</p>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(kb.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Form */}
          <div className="glass-card p-6 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold">Upload Document</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Knowledge Base</label>
                <select
                  value={selectedBase}
                  onChange={e => setSelectedBase(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">Select a knowledge base...</option>
                  {bases.map(kb => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Document File</label>
                <p className="text-xs text-slate-500 mb-2">Accepted formats: PDF, TXT, MD, DOCX (max 10MB)</p>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.txt,.md,.docx"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={status.type === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {status.type === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
                {status.type === 'loading' ? 'Processing...' : 'Upload Document'}
              </button>

              {status.message && (
                <div className={`p-4 rounded-lg text-sm ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {status.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
