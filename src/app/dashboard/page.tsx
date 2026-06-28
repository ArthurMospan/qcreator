"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Folder, Loader2, MoreVertical, LayoutTemplate, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type Project = {
  id: string;
  name: string;
  hue: string;
  templates: number;
  designs: number;
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setNewName('');
        setShowNew(false);
        fetchProjects();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#888]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Ваші проєкти</h1>
          <p className="text-[#a1a1a1] text-sm">Організуйте свої шаблони та дизайни по брендах.</p>
        </div>
        
        {user?.role === 'designer' && (
          <button 
            onClick={() => setShowNew(true)}
            className="bg-white text-black hover:bg-[#e0e0e0] px-5 py-2.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Новий проєкт
          </button>
        )}
      </div>

      {showNew && (
        <motion.div 
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          className="bg-[#2a2a2a] p-6 rounded-2xl mb-8 border border-white/5"
        >
          <form onSubmit={createProject} className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Назва бренду чи проєкту..."
              className="flex-1 bg-[#1f1f1f] border border-transparent rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-all"
            />
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowNew(false)}
                className="px-5 py-3 rounded-xl border border-transparent hover:bg-white/5 text-[#a1a1a1] hover:text-white transition-colors font-medium text-sm"
              >
                Скасувати
              </button>
              <button 
                type="submit" 
                disabled={creating || !newName.trim()}
                className="px-5 py-3 rounded-xl bg-white hover:bg-[#e0e0e0] text-black font-medium transition-colors disabled:opacity-50 min-w-[120px] flex justify-center text-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Створити'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-24 bg-[#2a2a2a]/30 rounded-3xl border border-white/5 border-dashed">
          <Folder className="w-12 h-12 text-[#444] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Немає проєктів</h3>
          <p className="text-[#888] text-sm">Створіть свій перший проєкт, щоб почати роботу.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((p, i) => (
            <motion.a
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="group bg-[#2a2a2a] rounded-2xl p-5 border border-white/5 hover:border-white/20 transition-all block cursor-pointer relative overflow-hidden"
            >
              {/* Subtle accent line on top */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 opacity-60"
                style={{ background: p.hue }}
              />
              
              <div className="flex justify-between items-start mb-8">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#1f1f1f] shadow-inner border border-white/5"
                >
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <button className="text-[#666] hover:text-white transition-colors p-1" onClick={(e) => e.preventDefault()}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-4 truncate">{p.name}</h3>
              
              <div className="flex items-center gap-4 text-xs font-medium text-[#a1a1a1]">
                <div className="flex items-center gap-1.5 bg-[#1f1f1f] px-2.5 py-1.5 rounded-lg border border-white/5">
                  <LayoutTemplate className="w-3.5 h-3.5 text-[#666]" />
                  <span>{p.templates}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#1f1f1f] px-2.5 py-1.5 rounded-lg border border-white/5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#666]" />
                  <span>{p.designs}</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
