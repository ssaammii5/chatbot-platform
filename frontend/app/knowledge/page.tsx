'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import {
  Database,
  UploadCloud,
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  FolderOpen,
} from 'lucide-react';
import { knowledgeApi, getStoredUser } from '../../lib/api';

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

interface Document {
  id: string;
  filename: string;
  fileType: string;
  createdAt: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function KnowledgePage() {
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [selectedBase, setSelectedBase] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingBases, setLoadingBases] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Create KB state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
    loadBases();
  }, []);

  useEffect(() => {
    if (selectedBase) {
      loadDocuments(selectedBase.id);
    }
  }, [selectedBase]);

  async function loadBases() {
    setLoadingBases(true);
    try {
      const data = await knowledgeApi.listBases();
      setBases(data);
      if (data.length > 0 && !selectedBase) setSelectedBase(data[0]);
    } catch {
      // silently ignore — will show empty state
    } finally {
      setLoadingBases(false);
    }
  }

  async function loadDocuments(baseId: string) {
    setLoadingDocs(true);
    try {
      const data = await knowledgeApi.listDocuments(baseId);
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleCreateKb(e: React.FormEvent) {
    e.preventDefault();
    if (!newKbName.trim()) return;
    setCreating(true);
    try {
      const kb = await knowledgeApi.createBase({ name: newKbName.trim(), description: newKbDesc.trim() || undefined });
      setBases(prev => [...prev, kb]);
      setSelectedBase(kb);
      setShowCreateForm(false);
      setNewKbName('');
      setNewKbDesc('');
    } catch (err: any) {
      // show error inline
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(file: File) {
    if (!selectedBase) return;
    setUploadStatus('uploading');
    setUploadError('');

    try {
      await knowledgeApi.upload(selectedBase.id, file);
      setUploadStatus('success');
      // Reload documents list
      await loadDocuments(selectedBase.id);
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (err: any) {
      setUploadStatus('error');
      setUploadError(err.message || 'Upload failed. Please try again.');
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getMimeLabel(mime: string) {
    const map: Record<string, string> = {
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'text/markdown': 'MD',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    };
    return map[mime] || mime.split('/')[1]?.toUpperCase() || 'FILE';
  }

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {/* KB List Sidebar */}
        <div className="w-72 border-r border-[rgba(255,255,255,0.08)] bg-slate-900/40 flex flex-col">
          <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <h2 className="text-lg font-semibold">Knowledge Bases</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-slate-200"
              title="New Knowledge Base"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] bg-slate-800/50">
              <form onSubmit={handleCreateKb} className="space-y-3">
                <input
                  autoFocus
                  type="text"
                  value={newKbName}
                  onChange={e => setNewKbName(e.target.value)}
                  placeholder="Knowledge base name"
                  required
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newKbDesc}
                  onChange={e => setNewKbDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newKbName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); setNewKbName(''); }}
                    className="px-3 py-2 text-sm rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">
            {loadingBases ? (
              <div className="p-6 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" />
              </div>
            ) : bases.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No knowledge bases yet.</p>
                <button onClick={() => setShowCreateForm(true)} className="text-blue-400 text-xs mt-1 hover:underline">
                  Create your first one
                </button>
              </div>
            ) : (
              bases.map(kb => (
                <button
                  key={kb.id}
                  onClick={() => setSelectedBase(kb)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2 ${
                    selectedBase?.id === kb.id
                      ? 'bg-blue-500/10 border-l-blue-500 text-slate-100'
                      : 'border-l-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selectedBase?.id === kb.id ? 'text-blue-400' : ''}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{kb.name}</p>
                    {kb.description && (
                      <p className="text-xs text-slate-500 truncate">{kb.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {selectedBase ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
              <header>
                <h1 className="text-2xl font-bold">{selectedBase.name}</h1>
                {selectedBase.description && (
                  <p className="text-slate-400 mt-1 text-sm">{selectedBase.description}</p>
                )}
              </header>

              {/* Upload Zone */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Upload Document</h2>
                    <p className="text-xs text-slate-500">PDF, TXT, MD, DOCX — Max 10MB</p>
                  </div>
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    dragOver
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {uploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                      <p className="text-sm text-slate-400">Processing and embedding document...</p>
                    </>
                  ) : uploadStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <p className="text-sm text-emerald-400 font-medium">Document queued for embedding!</p>
                      <p className="text-xs text-slate-500">It will be searchable once processing completes.</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-slate-500" />
                      <div className="text-center">
                        <p className="text-sm text-slate-300 font-medium">Drop a file here or click to browse</p>
                        <p className="text-xs text-slate-500 mt-1">Supports PDF, TXT, Markdown, DOCX</p>
                      </div>
                    </>
                  )}
                </div>

                {uploadStatus === 'error' && (
                  <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Documents List */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="font-semibold">
                    Documents
                    {!loadingDocs && (
                      <span className="ml-2 text-xs text-slate-500 font-normal">
                        ({documents.length} files)
                      </span>
                    )}
                  </h2>
                </div>

                {loadingDocs ? (
                  <div className="py-6 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No documents yet.</p>
                    <p className="text-xs mt-1">Upload a file above to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/40 border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-blue-400">
                            {getMimeLabel(doc.fileType)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200 truncate">{doc.filename}</p>
                          <p className="text-xs text-slate-500">Added {formatDate(doc.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          Indexed
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Database className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-lg font-medium">No knowledge base selected</p>
              <p className="text-sm mt-1">Create or select a knowledge base from the sidebar.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Knowledge Base
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
