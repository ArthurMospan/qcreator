"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, Sparkles, User as UserIcon, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Close the avatar menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  // Close the menu whenever the route changes
  useEffect(() => { setMenuOpen(false); }, [pathname]);

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
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <Sparkles className="text-black w-4 h-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">qCreator</span>
          </Link>

          {/* Avatar dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-full hover:bg-white/5 transition-colors"
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-medium text-white text-sm leading-none">{user.name}</span>
                <span className="text-[#888] text-[10px] uppercase tracking-wider mt-1">{user.role}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center border border-white/5">
                <UserIcon className="w-4 h-4 text-[#a1a1a1]" />
              </div>
              <ChevronDown className={`w-4 h-4 text-[#888] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl bg-[#252525] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-[#888] truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#ccc] hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#888]" />
                      Налаштування
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-[#ccc] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Вийти
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
