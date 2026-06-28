"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Folder, Loader2 } from 'lucide-react';
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
    return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Проєкти</h1>
          <p className="text-gray-400 mt-1">Оберіть проєкт або створіть новий</p>
        </div>
        
        {user?.role === 'designer' && (
          <button 
            onClick={() => setShowNew(true)}
            className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Створити проєкт
          </button>
        )}
      </div>

      {showNew && (
        <motion.div 
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
          className="bg-card/50 border border-white/10 p-6 rounded-2xl"
        >
          <form onSubmit={createProject} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Назва проєкту..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowNew(false)}
                className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              >
                Скасувати
              </button>
              <button 
                type="submit" 
                disabled={creating || !newName.trim()}
                className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 min-w-[120px] flex justify-center"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Створити'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-card/30 rounded-3xl border border-white/5 border-dashed">
          <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">Немає проєктів</h3>
          <p className="text-gray-400">У вас поки що немає жодного проєкту.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <motion.a
              key={p.id}
              href={`/dashboard/projects/${p.id}`}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="group relative overflow-hidden bg-card rounded-3xl border border-white/5 p-6 hover:shadow-2xl transition-all block cursor-pointer"
            >
              <div 
                className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                style={{ background: p.hue }}
              />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner" style={{ background: p.hue }}>
                  <Folder className="w-6 h-6 text-white drop-shadow-md" />
                </div>
                <h3 className="text-xl font-bold mb-2">{p.name}</h3>
                <div className="flex gap-4 text-sm text-gray-400">
                  <span>{p.templates} шаблонів</span>
                  <span>{p.designs} дизайнів</span>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
