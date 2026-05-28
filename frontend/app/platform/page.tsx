'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Building2, Plus, MoreVertical, Search, Loader2, Trash2, X, Activity, Database as DbIcon, Zap } from 'lucide-react';
import { superAdminApi, getStoredUser } from '../../lib/api';

interface Tenant {
  id: string;
  name: string;
  domain: string | null;
  createdAt: string;
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [health, setHealth] = useState<{ status: string; database: string } | null>(null);
  const [usage, setUsage] = useState<{ totalTokens: number; totalTenants: number } | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { window.location.href = '/login'; return; }
    loadTenants();
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      const [h, u] = await Promise.all([
        superAdminApi.getHealth(),
        superAdminApi.getGlobalUsage()
      ]);
      setHealth(h);
      setUsage(u);
    } catch {
      // Ignore errors for metrics
    }
  }

  async function loadTenants() {
    try {
      const data = await superAdminApi.listTenants();
      setTenants(data);
    } catch {
      // API may not be ready
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.domain && t.domain.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await superAdminApi.createTenant({ name: newName, domain: newDomain || undefined });
      setNewName('');
      setNewDomain('');
      setShowCreateModal(false);
      await loadTenants();
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete tenant "${name}"? This action is irreversible and will delete all associated data.`)) {
      return;
    }
    try {
      await superAdminApi.deleteTenant(id);
      await loadTenants();
    } catch (err: any) {
      setError(err.message || 'Failed to delete tenant');
    }
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-0">
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Platform Tenants</h1>
              <p className="text-slate-400 mt-1">Manage and provision new tenants across the platform.</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Provision Tenant
            </button>
          </header>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">Platform Health</span>
              </div>
              <div className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                {health ? (
                  <><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> All Systems Operational</>
                ) : (
                  <span className="text-slate-500">Checking...</span>
                )}
              </div>
              {health && <p className="text-xs text-slate-500 mt-2">Database: {health.database}</p>}
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">Total Tenants</span>
              </div>
              <div className="text-3xl font-bold text-slate-100">
                {usage ? usage.totalTenants.toLocaleString() : '...'}
              </div>
              <p className="text-xs text-blue-400 mt-2">Active organizations</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">Global Token Usage</span>
              </div>
              <div className="text-3xl font-bold text-slate-100">
                {usage ? usage.totalTokens.toLocaleString() : '...'}
              </div>
              <p className="text-xs text-purple-400 mt-2">Total platform consumption</p>
            </div>
          </div>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="glass-card p-6 max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Provision New Tenant</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tenant Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Domain (optional)</label>
                  <input
                    type="text"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g., acme.com"
                  />
                </div>
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                )}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Tenant'}
                </button>
              </form>
            </div>
          )}

          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tenants by name or domain..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-[rgba(255,255,255,0.1)] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading tenants...
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <p>No tenants found. Click "Provision Tenant" to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.1)] text-slate-400 text-sm">
                      <th className="pb-3 font-medium">Tenant Name</th>
                      <th className="pb-3 font-medium">Domain</th>
                      <th className="pb-3 font-medium">Created At</th>
                      <th className="pb-3 font-medium">ID</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenants.map(tenant => (
                      <tr key={tenant.id} className="border-b border-[rgba(255,255,255,0.05)] hover:bg-white/[0.02] transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-slate-200">{tenant.name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-slate-400">{tenant.domain || '—'}</td>
                        <td className="py-4 text-slate-400">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 text-slate-500 text-xs font-mono">{tenant.id.slice(0, 8)}...</td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDelete(tenant.id, tenant.name)}
                            className="p-2 text-red-400/50 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Delete tenant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
