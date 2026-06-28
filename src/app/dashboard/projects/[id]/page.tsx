"use client";

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Image as ImageIcon, LayoutTemplate, Loader2, Link as LinkIcon, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

type Template = { id: string; name: string; type: string };
type Design = { id: string; name: string; template_name: string; updated_at: string };
type Project = { id: string; name: string; hue: string };

export default function ProjectDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  // New Template state
  const [showNewTpl, setShowNewTpl] = useState(false);
  const [tplUrl, setTplUrl] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplType, setTplType] = useState('post');
  const [addingTpl, setAddingTpl] = useState(false);

  useEffect(() => {
    if (token && id) fetchData();
  }, [token, id]);

  const fetchData = async () => {
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
      if (tData.templates) setTemplates(tData.templates);
      if (dData.designs) setDesigns(dData.designs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingTpl(true);
    try {
      const figmaMatch = tplUrl.match(/node-id=([^&]+)/);
      if (!figmaMatch) {
        alert('Невірне посилання на Figma. Переконайтеся, що ви скопіювали посилання на конкретний фрейм (повинен містити node-id).');
        setAddingTpl(false);
        return;
      }
      
      const fileMatch = tplUrl.match(/file\/([^\/]+)/) || tplUrl.match(/design\/([^\/]+)/);
      if (!fileMatch) {
        alert('Не вдалося знайти File ID в посиланні.');
        setAddingTpl(false);
        return;
      }

      const nodeId = figmaMatch[1].replace('-', ':');
      const fileId = fileMatch[1];

      const res = await fetch(`/api/projects/${id}/templates`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: tplName,
          figma_url: tplUrl,
          figma_file_id: fileId,
          figma_node_id: nodeId,
          type: tplType
        })
      });

      if (res.ok) {
        setTplName('');
        setTplUrl('');
        setShowNewTpl(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTpl(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#888]" />
      </div>
    );
  }

  if (!project) return <div>Проєкт не знайдено</div>;

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={() => router.push('/dashboard')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2a2a2a] hover:bg-[#333] transition-colors border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{project.name}</h1>
          <p className="text-[#a1a1a1] text-sm mt-1">Керуйте шаблонами та дизайнами</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        
        {/* Templates Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" /> 
                Шаблони
              </h2>
              <p className="text-[#888] text-xs mt-1">Додані макети з Figma</p>
            </div>
            {user?.role === 'designer' && (
              <button 
                onClick={() => setShowNewTpl(true)}
                className="text-sm font-medium bg-[#2a2a2a] hover:bg-[#333] border border-white/5 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-white"
              >
                <Plus className="w-4 h-4" />
                Додати
              </button>
            )}
          </div>

          {showNewTpl && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#2a2a2a] p-5 rounded-2xl mb-6 border border-white/5"
            >
              <form onSubmit={addTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Назва шаблону</label>
                  <input type="text" value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Напр. Instagram Post" className="w-full bg-[#1f1f1f] border border-transparent rounded-xl px-4 py-2.5 text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-all text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Посилання на Figma Frame</label>
                  <input type="url" value={tplUrl} onChange={e => setTplUrl(e.target.value)} placeholder="https://www.figma.com/design/..." className="w-full bg-[#1f1f1f] border border-transparent rounded-xl px-4 py-2.5 text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-all text-sm" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Формат</label>
                  <select value={tplType} onChange={e => setTplType(e.target.value)} className="w-full bg-[#1f1f1f] border border-transparent rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#444] transition-all text-sm">
                    <option value="post">Post (1:1)</option>
                    <option value="story">Story (9:16)</option>
                    <option value="banner">Banner (16:9)</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowNewTpl(false)} className="px-4 py-2 rounded-xl text-[#a1a1a1] hover:text-white transition-colors text-sm font-medium">Скасувати</button>
                  <button type="submit" disabled={addingTpl} className="flex-1 bg-white hover:bg-[#e0e0e0] text-black font-medium py-2 rounded-xl transition-colors text-sm flex justify-center items-center">
                    {addingTpl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {templates.length === 0 ? (
            <div className="bg-[#2a2a2a]/30 border border-white/5 border-dashed rounded-2xl p-8 text-center">
              <p className="text-[#888] text-sm">У цьому проєкті ще немає шаблонів.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map(t => (
                <div key={t.id} className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center border border-white/5">
                      <LayoutTemplate className="w-5 h-5 text-[#888]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white text-sm">{t.name}</h4>
                      <p className="text-xs text-[#666] uppercase tracking-wider mt-0.5">{t.type}</p>
                    </div>
                  </div>
                  {user?.role === 'smm' && (
                    <Link 
                      href={`/dashboard/editor?templateId=${t.id}`}
                      className="opacity-0 group-hover:opacity-100 bg-white text-black px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-[#e0e0e0]"
                    >
                      Створити
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Designs Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5" /> 
                Створені Дизайни
              </h2>
              <p className="text-[#888] text-xs mt-1">Готові для публікації</p>
            </div>
          </div>

          {designs.length === 0 ? (
            <div className="bg-[#2a2a2a]/30 border border-white/5 border-dashed rounded-2xl p-8 text-center">
              <p className="text-[#888] text-sm">СММ ще не створював дизайнів.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {designs.map(d => (
                <Link 
                  key={d.id} 
                  href={`/dashboard/editor?designId=${d.id}`}
                  className="bg-[#2a2a2a] p-4 rounded-2xl border border-white/5 hover:border-white/20 transition-all group block"
                >
                  <div className="aspect-square bg-[#1f1f1f] rounded-xl border border-white/5 flex items-center justify-center mb-4 relative overflow-hidden">
                    <ImageIcon className="w-8 h-8 text-[#444] group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <h4 className="font-medium text-white text-sm truncate">{d.name}</h4>
                  <p className="text-xs text-[#666] mt-1 truncate">{d.template_name}</p>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
