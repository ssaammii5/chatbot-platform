'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { Database, UploadCloud, Loader2, TrendingUp, MessageSquare, Activity } from 'lucide-react';
import { analyticsApi, getStoredUser } from '../../lib/api';

export default function TenantAdminPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }

    async function loadMetrics() {
      try {
        const data = await analyticsApi.getMetrics();
        setMetrics(data);
      } catch {
        // If metrics fail, show defaults
        setMetrics({
          totalTokens: 0,
          ragQueries: 0,
          dailyUsage: [],
        });
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, []);

  const totalTokens = metrics?.totalTokens ?? 0;
  const ragQueries = metrics?.ragQueries ?? 0;

  return (
    <div className="flex h-screen w-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-0">
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
          <header>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-slate-400 mt-1">Monitor usage and manage your AI chatbot configuration.</p>
          </header>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Stat Cards */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">Total Tokens</span>
              </div>
              <div className="text-3xl font-bold text-slate-100">
                {loading ? '...' : totalTokens.toLocaleString()}
              </div>
              <p className="text-xs text-emerald-400 mt-2">This billing period</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">RAG Queries</span>
              </div>
              <div className="text-3xl font-bold text-slate-100">
                {loading ? '...' : ragQueries.toLocaleString()}
              </div>
              <p className="text-xs text-emerald-400 mt-2">This billing period</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-400">Avg Response</span>
              </div>
              <div className="text-3xl font-bold text-slate-100">1.2s</div>
              <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
            </div>
          </div>

          {/* Usage Chart */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold">Token Usage (Last 7 Days)</h2>
            </div>

            <div className="h-40 flex items-end gap-2 border-b border-slate-800 pb-2 pt-4 px-2">
              {[30, 40, 25, 60, 80, 100, 45].map((h, i) => (
                <div
                  key={i}
                  className="w-full bg-gradient-to-t from-blue-500/30 to-blue-400/10 hover:from-blue-500/50 hover:to-blue-400/20 transition-all rounded-t cursor-pointer relative group"
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-slate-200 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {Math.round(h * 45)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2 px-2">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
