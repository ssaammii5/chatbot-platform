'use client';

import { useEffect } from 'react';
import { getStoredUser } from '../lib/api';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      // Redirect authenticated users to their dashboard
      const redirectMap: Record<string, string> = {
        super_admin: '/super-admin',
        admin: '/admin',
        agent: '/agent',
        user: '/admin',
      };
      window.location.href = redirectMap[user.role] || '/admin';
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl animate-[float_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-3xl animate-[float_6s_ease-in-out_infinite_reverse]" />

      <div className="relative z-10 text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <Sparkles className="w-10 h-10 text-blue-400" />
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Aura Chat
          </h1>
        </div>
        <p className="text-slate-400 text-lg mb-10 max-w-md mx-auto">
          Multi-tenant AI chatbot platform with human handoff
        </p>

        <a
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-medium transition-all duration-200 shadow-xl shadow-blue-500/20 text-lg group"
        >
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </main>
  );
}
