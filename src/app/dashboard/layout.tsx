"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutGrid, Settings, Sparkles, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // If we are in the editor, we don't show the dashboard layout topnav, 
  // because we want a pure focus mode.
  const isEditor = pathname.includes('/dashboard/editor');

  if (isEditor) {
    return <div className="min-h-screen bg-[#1f1f1f] text-[#ededed] font-sans antialiased">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#1f1f1f] text-[#ededed] font-sans antialiased flex flex-col selection:bg-white/20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#1f1f1f]/80 border-b border-white/[0.08]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <Sparkles className="text-black w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-white">qCreator</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                href="/dashboard"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  pathname === '/dashboard' || pathname.startsWith('/dashboard/projects')
                    ? 'bg-white/10 text-white' 
                    : 'text-[#888] hover:text-white hover:bg-white/5'
                }`}
              >
                Проєкти
              </Link>
              <Link 
                href="/dashboard/settings"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  pathname === '/dashboard/settings' 
                    ? 'bg-white/10 text-white' 
                    : 'text-[#888] hover:text-white hover:bg-white/5'
                }`}
              >
                Налаштування
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-sm border-r border-white/10 pr-4 mr-2">
              <div className="flex flex-col items-end">
                <span className="font-medium text-white leading-none">{user.name}</span>
                <span className="text-[#888] text-[10px] uppercase tracking-wider mt-1">{user.role}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-white/5">
                <UserIcon className="w-4 h-4 text-[#a1a1a1]" />
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-[#888] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              title="Вийти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto p-6 md:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
