"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Shield, Bell, Palette, ChevronRight, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Паролі не збігаються'); return; }
    if (newPw.length < 6) { setPwError('Мінімум 6 символів'); return; }
    setPwSaving(true);
    try {
      const res = await fetch('/api/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw })
      });
      if (!res.ok) { const d = await res.json(); setPwError(d.error || 'Помилка'); return; }
      setPwSaved(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => setPwSaved(false), 3000);
    } catch {
      setPwError('Помилка мережі');
    } finally {
      setPwSaving(false);
    }
  };

  const ROLE_LABELS: Record<string, { label: string; desc: string; color: string }> = {
    designer: { label: 'Дизайнер', desc: 'Створює проєкти та шаблони через Figma плагін', color: '#a78bfa' },
    smm: { label: 'СММ-менеджер', desc: 'Наповнює шаблони контентом та публікує', color: '#34d399' },
    admin: { label: 'Адміністратор', desc: 'Повний доступ до системи', color: '#fb923c' },
  };

  const roleInfo = ROLE_LABELS[user?.role ?? ''] ?? { label: user?.role ?? '—', desc: '', color: '#888' };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Налаштування</h1>
        <p className="text-[#a1a1a1] text-sm">Управління акаунтом та профілем</p>
      </div>

      <div className="flex flex-col gap-4">

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#2a2a2a] rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <User className="w-4 h-4 text-[#888]" />
            <h2 className="text-sm font-semibold text-white">Профіль</h2>
          </div>
          <div className="p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#1f1f1f] border border-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{user?.name ?? '—'}</h3>
              <p className="text-sm text-[#888] truncate">{user?.email ?? '—'}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: roleInfo.color + '22', color: roleInfo.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: roleInfo.color }} />
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-[#666] mt-1">{roleInfo.desc}</p>
            </div>
          </div>
        </motion.div>

        {/* Password card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#2a2a2a] rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#888]" />
            <h2 className="text-sm font-semibold text-white">Безпека</h2>
          </div>
          <form onSubmit={savePassword} className="p-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#777] uppercase tracking-wider mb-2">Поточний пароль</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1f1f1f] border border-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#777] uppercase tracking-wider mb-2">Новий пароль</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1f1f1f] border border-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#777] uppercase tracking-wider mb-2">Підтвердження</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1f1f1f] border border-white/5 rounded-xl px-4 py-3 text-white text-sm placeholder-[#555] focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>
            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-[#e0e0e0] transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : pwSaved ? <><Check className="w-4 h-4" /> Збережено</> : 'Змінити пароль'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Figma Plugin card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#2a2a2a] rounded-2xl border border-white/5 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <Palette className="w-4 h-4 text-[#888]" />
            <h2 className="text-sm font-semibold text-white">Figma Плагін</h2>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <p className="text-sm text-[#888] leading-relaxed">
              Для завантаження шаблонів використовуйте плагін <span className="text-white font-medium">qCreator</span> у Figma. Введіть ваш email та пароль прямо в плагіні — він автоматично під'єднається до вашого акаунту.
            </p>
            <div className="bg-[#1f1f1f] rounded-xl p-4 border border-white/5">
              <p className="text-xs text-[#666] mb-1 font-medium uppercase tracking-wider">Backend URL для плагіна</p>
              <p className="text-sm font-mono text-[#a78bfa] select-all">https://qcreator.onrender.com</p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
