"use client";

import { useState, useEffect, use, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Image as ImageIcon, LayoutTemplate, Loader2, Figma, RefreshCw, ExternalLink, Pencil } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

type Template = { id: string; name: string; formats: string[]; created_at: string };
type Design = { id: string; name: string; saved_at: string };
type Project = { id: string; name: string; hue: string };

const FORMAT_LABELS: Record<string, string> = {
  ig_portrait: '4:5',
  ig_square: '1:1',
  ig_story: '9:16',
  carousel: '⊞',
};

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prevTemplateCount, setPrevTemplateCount] = useState(0);
  const [newBadge, setNewBadge] = useState(false);

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [pRes, tRes, dRes] = await Promise.all([
        fetch(`/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/projects/${id}/templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/projects/${id}/designs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const pData = await pRes.json();
      const tData = await tRes.json();
      const dData = await dRes.json();
      if (pData.project) setProject(pData.project);
      if (tData.templates) {
        const newCount = tData.templates.length;
        setTemplates(prev => {
          if (quiet && newCount > prev.length) setNewBadge(true);
          return tData.templates;
        });
      }
      if (dData.designs) setDesigns(dData.designs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (token && id) fetchData();
  }, [token, id, fetchData]);

  // Auto-poll every 15s so new templates appear without manual refresh
  useEffect(() => {
    if (!token || !id) return;
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [token, id, fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#888]" />
      </div>
    );
  }

  if (!project) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-[#888]">Проєкт не знайдено</p>
      <button onClick={() => router.push('/dashboard')} className="text-sm text-white underline">← Назад</button>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2a2a2a] hover:bg-[#333] transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight text-white">{project.name}</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">Шаблони та готові дизайни</p>
        </div>
        <button
          onClick={() => { setNewBadge(false); fetchData(true); }}
          title="Оновити"
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {newBadge && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#1f1f1f]" />
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">

        {/* ── Templates ── */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" />
                Шаблони
                {newBadge && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">New!</span>
                )}
              </h2>
              <p className="text-[#888] text-xs mt-1">Додаються через Figma-плагін · оновлюється кожні 15с</p>
            </div>
          </div>

          {/* Plugin hint for designers */}
          {user?.role === 'designer' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1e1e1e] border border-dashed border-white/10 rounded-2xl p-5 mb-5 flex gap-4 items-start"
            >
              <div className="w-9 h-9 rounded-xl bg-[#2a2a2a] flex items-center justify-center flex-shrink-0 border border-white/5">
                <Figma className="w-4 h-4 text-[#a78bfa]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Додати шаблон з Figma</h4>
                <ol className="text-xs text-[#888] space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Відкрийте плагін <span className="text-[#ccc]">qCreator</span> у Figma</li>
                  <li>Виберіть проєкт <span className="text-white font-semibold">{project.name}</span></li>
                  <li>Виділіть фрейм → введіть назву → «Запушити»</li>
                  <li>Шаблон з'явиться тут автоматично</li>
                </ol>
              </div>
            </motion.div>
          )}

          {templates.length === 0 ? (
            <div className="bg-[#2a2a2a]/30 border border-white/5 border-dashed rounded-2xl p-8 text-center">
              <p className="text-[#888] text-sm">Шаблонів ще немає.</p>
              {user?.role === 'smm' && (
                <p className="text-[#666] text-xs mt-2">Попросіть дизайнера додати шаблон через Figma-плагін.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {templates.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/dashboard/editor?templateId=${t.id}`}
                    className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1f1f1f] flex items-center justify-center border border-white/5 flex-shrink-0">
                        <LayoutTemplate className="w-5 h-5 text-[#666] group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm group-hover:text-white transition-colors">{t.name}</h4>
                        <div className="flex gap-1 mt-1">
                          {(t.formats || []).map(f => (
                            <span key={f} className="text-[10px] font-bold bg-[#333] text-[#888] px-1.5 py-0.5 rounded-md">
                              {FORMAT_LABELS[f] || f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user?.role === 'smm' ? (
                        <span className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold">
                          Створити →
                        </span>
                      ) : (
                        <span className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Відкрити
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── Designs ── */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Готові дизайни
              </h2>
              <p className="text-[#888] text-xs mt-1">Зроблені СММ-менеджером</p>
            </div>
          </div>

          {designs.length === 0 ? (
            <div className="bg-[#2a2a2a]/30 border border-white/5 border-dashed rounded-2xl p-8 text-center">
              <p className="text-[#888] text-sm">Дизайнів ще немає.</p>
              {user?.role === 'smm' && templates.length > 0 && (
                <p className="text-[#666] text-xs mt-2">Оберіть шаблон зліва і натисніть «Створити».</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {designs.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/dashboard/editor?designId=${d.id}`}
                    className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all group block"
                  >
                    <div className="aspect-square bg-[#1f1f1f] rounded-xl border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                      <ImageIcon className="w-8 h-8 text-[#444] group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h4 className="font-medium text-white text-sm truncate">{d.name}</h4>
                    <p className="text-xs text-[#666] mt-1">
                      {d.saved_at ? new Date(d.saved_at).toLocaleDateString('uk-UA') : ''}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
