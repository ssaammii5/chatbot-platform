'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Settings, Database, Activity, LogOut, Sparkles, Bot } from 'lucide-react';
import { authApi, clearStoredUser, getStoredUser } from '../lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string; role: string; tenantId: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const navItems = [
    { href: '/platform', label: 'Platform', icon: Activity, roles: ['super_admin'] },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { href: '/chatbots', label: 'Chatbots', icon: Bot, roles: ['admin'] },
    { href: '/knowledge', label: 'Knowledge Base', icon: Database, roles: ['admin'] },
    { href: '/inbox', label: 'Agent Inbox', icon: MessageSquare, roles: ['agent', 'admin'] },
  ];

  // Filter nav items by user role. Only calculate once mounted to avoid hydration mismatch.
  const visibleItems = mounted
    ? navItems.filter(item => !user?.role || item.roles.includes(user.role))
    : [];

  const handleLogout = async () => {
    try {
      // Call backend to invalidate session and clear the HttpOnly cookie server-side
      await authApi.logout();
    } catch {
      // Continue logout even if API call fails
    }
    // Clear local display info
    clearStoredUser();
    // Full redirect to clear all React state
    window.location.href = '/login';
  };

  return (
    <aside className="w-64 border-r border-[rgba(255,255,255,0.08)] bg-surface flex flex-col glass z-10 hidden md:flex">
      <div className="p-6 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Aura Chat
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">Platform Console</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[rgba(255,255,255,0.08)] space-y-2">
        {user && (
          <div className="px-4 py-2 text-xs text-slate-500 truncate">
            {user.email}
            <span className="block text-slate-600 capitalize">{user.role?.replace('_', ' ')}</span>
          </div>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all duration-200 text-left"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-left"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
