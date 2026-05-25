'use client';

import { Settings, Save, Palette, Globe, Shield, Lock, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

type Tab = 'general' | 'branding' | 'security';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Tenant Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage your platform configuration and branding.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Settings Sidebar */}
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Form */}
          <div className="md:col-span-2 space-y-6 bg-slate-900/50 border border-[rgba(255,255,255,0.08)] p-6 rounded-2xl glass">
            {activeTab === 'general' && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-400" />
                    General Configuration
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Update your basic tenant information.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Tenant Name</label>
                    <input
                      type="text"
                      defaultValue="Demo Workspace"
                      className="w-full bg-slate-800/50 border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Custom Domain</label>
                    <input
                      type="text"
                      defaultValue="app.demo.com"
                      className="w-full bg-slate-800/50 border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'branding' && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-400" />
                    Branding & Appearance
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Customize the look and feel of your chatbot widget.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Primary Color</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        defaultValue="#3b82f6"
                        className="w-12 h-12 rounded bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        defaultValue="#3b82f6"
                        className="flex-1 bg-slate-800/50 border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Bot Avatar URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-slate-800/50 border border-[rgba(255,255,255,0.1)] rounded-xl pl-12 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Welcome Message</label>
                    <textarea
                      defaultValue="Hello! How can I help you today?"
                      rows={3}
                      className="w-full bg-slate-800/50 border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    Security Settings
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">Manage access controls and security policies.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <div>
                      <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        Require Two-Factor Authentication (2FA)
                      </label>
                      <p className="text-xs text-slate-500 mt-1">Enforce 2FA for all agents and admins.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  <div className="space-y-2 flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Disable Knowledge Base Downloads</label>
                      <p className="text-xs text-slate-500 mt-1">Prevent agents from downloading raw document files.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="pt-6 mt-6 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              {success && <span className="text-green-400 text-sm">Settings saved successfully!</span>}
              {!success && <span className="text-slate-500 text-sm">Unsaved changes</span>}
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
