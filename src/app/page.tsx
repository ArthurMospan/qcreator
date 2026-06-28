"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, login, loading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('designer@aura.co');
  const [password, setPassword] = useState('demo1234');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { email, password, name, role: 'designer' };
        
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Щось пішло не так');
      }
      
      login(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 relative bg-[#1f1f1f] text-[#ededed]">
      {/* Ultra minimalist background noise or nothing, just pure #1f1f1f */}
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[400px]"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">qCreator</h1>
          <p className="text-[#a1a1a1] mt-2 text-sm">
            Генерація бренд-контенту
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Ім'я компанії</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#2a2a2a] border border-transparent rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#444] focus:bg-[#333] transition-all"
                placeholder="AURA Skincare"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Електронна пошта</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-transparent rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#444] focus:bg-[#333] transition-all"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5 uppercase tracking-wider">Пароль</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-transparent rounded-xl px-4 py-3 text-white placeholder-[#666] focus:outline-none focus:border-[#444] focus:bg-[#333] transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-white text-black hover:bg-[#e0e0e0] font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Увійти' : 'Зареєструватися'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#888]">
          {isLogin ? 'Не маєте акаунту? ' : 'Вже зареєстровані? '}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-white hover:underline transition-all font-medium"
          >
            {isLogin ? 'Створити' : 'Увійти'}
          </button>
        </div>
        
        {isLogin && (
          <div className="mt-8 p-4 bg-[#2a2a2a]/50 rounded-xl border border-white/5 text-xs text-[#888] text-center flex flex-col gap-1">
            <span className="font-medium text-[#a1a1a1] uppercase tracking-wider text-[10px] mb-1">Демо доступ</span>
            <span>designer@aura.co</span>
            <span>demo1234</span>
          </div>
        )}
      </motion.div>
    </main>
  );
}
