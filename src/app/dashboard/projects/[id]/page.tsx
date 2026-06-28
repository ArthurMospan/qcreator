"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, PenTool, Image as ImageIcon, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProjectDetail() {
  const params = useParams();
  const id = params.id as string;
  const { token, user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);

  useEffect(() => {
    if (token && id) fetchData();
  }, [token, id]);

  const fetchData = async () => {
    try {
      const [tRes, dRes] = await Promise.all([
        fetch(`/api/projects/${id}/templates`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/projects/${id}/designs`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const tData = await tRes.json();
      const dData = await dRes.json();
      
      if (tData.templates) setTemplates(tData.templates);
      if (dData.designs) setDesigns(dData.designs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Деталі проєкту</h1>
        <p className="text-gray-400">Шаблони та створені дизайни</p>
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-primary" />
            Шаблони
          </h2>
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center py-12 bg-card/30 rounded-3xl border border-white/5 border-dashed">
            <p className="text-gray-400">Немає шаблонів. Створіть їх через Figma плагін.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(t => (
              <motion.div
                key={t.id}
                whileHover={{ y: -4 }}
                className="bg-card rounded-2xl border border-white/5 p-6 hover:shadow-xl transition-all"
              >
                <h3 className="font-bold text-lg mb-2">{t.name}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {t.formats?.map((f: string) => (
                    <span key={f} className="text-xs px-2 py-1 bg-white/5 rounded-md">{f}</span>
                  ))}
                </div>
                <a 
                  href={`/dashboard/editor?template=${t.id}`}
                  className="w-full bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium py-2 rounded-lg flex justify-center transition-colors"
                >
                  Створити дизайн
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#ffb199]" />
            Готові дизайни
          </h2>
        </div>
        
        {designs.length === 0 ? (
          <div className="text-center py-12 bg-card/30 rounded-3xl border border-white/5 border-dashed">
            <p className="text-gray-400">Ще немає готових дизайнів.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {designs.map(d => (
              <motion.div
                key={d.id}
                whileHover={{ scale: 1.02 }}
                className="bg-card rounded-2xl border border-white/5 overflow-hidden flex flex-col group cursor-pointer"
              >
                <div className="aspect-square bg-black/40 flex items-center justify-center relative">
                  {/* Quick preview placeholder */}
                  {d.slides?.[0]?.bg ? (
                    <div 
                      className="w-full h-full" 
                      style={{ background: d.slides[0].bg }}
                    >
                      <div className="w-full h-full p-4 flex flex-col justify-center items-center text-center">
                        <span className="font-bold" style={{ color: d.slides[0].color || '#fff' }}>
                          {d.slides[0].text || d.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-white/20" />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium">
                      Завантажити
                    </button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm truncate" title={d.name}>{d.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{d.format}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
