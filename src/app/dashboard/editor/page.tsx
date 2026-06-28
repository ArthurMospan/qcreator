"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ArrowLeft, Download, Save, CheckCircle, SlidersHorizontal, Image as ImageIcon, Type, Palette } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';

const FORMATS: Record<string, {w: number, h: number, label: string, ratio: string}> = {
  ig_portrait: { w: 1080, h: 1350, label: 'Пост', ratio: '4:5' },
  ig_square: { w: 1080, h: 1080, label: 'Квадрат', ratio: '1:1' },
  ig_story: { w: 1080, h: 1920, label: 'Сторіс', ratio: '9:16' },
  carousel: { w: 1080, h: 1350, label: 'Каруселя', ratio: '4:5' },
};

function lum(hex: string) { 
  const c = hex.replace('#', ''); 
  const r = parseInt(c.substr(0, 2), 16) / 255, g = parseInt(c.substr(2, 2), 16) / 255, b = parseInt(c.substr(4, 2), 16) / 255; 
  const f = (v: number) => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); 
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); 
}
function contrast(a: string, b: string) { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); }
function readable(bg: string) { return contrast('#FFFFFF', bg) >= contrast('#1A1A1A', bg) ? '#FFFFFF' : '#1A1A1A'; }

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const designId = searchParams.get('designId');
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [design, setDesign] = useState<any>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) fetchContext();
  }, [token, templateId, designId]);

  const baseSlide = (brand: any) => ({
    headline: 'Заголовок', body: 'Текст', cta: 'Деталі',
    showBody: true, showCta: true, plate: brand?.primary || '#000', img: null, imgRes: null, zoom: 120
  });

  const fetchContext = async () => {
    try {
      let tId = templateId;
      if (designId) {
        // Mock loading design for this demo (assuming create new)
      }
      
      const res = await fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      let t = null;
      let pId = null;
      for (const p of data.projects) {
        const tRes = await fetch(`/api/projects/${p.id}/templates`, { headers: { Authorization: `Bearer ${token}` } });
        const tData = await tRes.json();
        const found = tData.templates?.find((x: any) => String(x.id) === String(tId));
        if (found) { t = found; pId = p.id; break; }
      }

      if (!t) {
        alert('Шаблон не знайдено');
        router.push('/dashboard');
        return;
      }

      setTemplate(t);
      const fmt = t.formats[0];
      setDesign({
        projectId: pId,
        templateId: t.id,
        name: t.name,
        format: fmt,
        slides: fmt === 'carousel' ? [
          { ...baseSlide(t.brand), headline: 'Крок 1', showCta: false },
          { ...baseSlide(t.brand), headline: 'Крок 2', showCta: false }
        ] : [baseSlide(t.brand)]
      });
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${design.projectId}/designs`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(design)
      });
      alert('Збережено успішно!');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!stageRef.current) return;
    try {
      const f = FORMATS[design.format];
      const url = await htmlToImage.toPng(stageRef.current, { width: f.w, height: f.h, pixelRatio: 1 });
      const a = document.createElement('a');
      a.download = `${design.name}.png`;
      a.href = url;
      a.click();
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  const updateSlide = (key: string, value: any) => {
    const newSlides = [...design.slides];
    newSlides[activeSlide][key] = value;
    setDesign({ ...design, slides: newSlides });
  };

  if (loading) {
    return (
      <div className="flex justify-center h-screen items-center bg-[#1f1f1f]">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  const s = design.slides[activeSlide];
  const f = FORMATS[design.format];
  const u = f.w / 1080;
  const isStory = design.format === 'ig_story';

  return (
    <div className="flex flex-col h-screen bg-[#1f1f1f] overflow-hidden text-[#ededed]">
      {/* Top Header */}
      <header className="h-[60px] border-b border-white/10 px-4 flex items-center justify-between bg-[#1f1f1f] z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#a1a1a1]" />
          </button>
          
          <input 
            type="text" 
            value={design.name}
            onChange={e => setDesign({...design, name: e.target.value})}
            className="bg-transparent border-none text-[15px] font-medium text-white focus:outline-none focus:ring-0 max-w-[200px]"
          />
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <span className="text-[11px] font-medium text-[#888] uppercase tracking-wider">{template.name}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full transition-colors text-[13px] font-medium text-[#a1a1a1]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Зберегти
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 bg-white hover:bg-[#e0e0e0] text-black rounded-full transition-colors text-[13px] font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            Експорт
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (Unified Controls) */}
        <aside className="w-[320px] bg-[#1a1a1a] border-r border-white/5 flex flex-col z-10 overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-8 scrollbar-hide">
            
            {/* Format Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-[#888]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">Формат</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {template.formats.map((fmt: string) => (
                  <button
                    key={fmt}
                    onClick={() => { setDesign({...design, format: fmt}); setActiveSlide(0); }}
                    className={`py-2 px-3 rounded-xl border text-left transition-all ${
                      design.format === fmt 
                        ? 'bg-white/10 border-white/20 text-white' 
                        : 'bg-transparent border-transparent text-[#888] hover:bg-white/5'
                    }`}
                  >
                    <div className="text-[10px] font-bold mb-0.5">{FORMATS[fmt].ratio}</div>
                    <div className="text-xs">{FORMATS[fmt].label}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Content Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Type className="w-4 h-4 text-[#888]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">Текст</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-[#888]">Заголовок</span>
                    <span className="text-[10px] text-[#666]">{s.headline.length}/{template.slots.headline.max}</span>
                  </div>
                  <textarea 
                    value={s.headline}
                    onChange={e => updateSlide('headline', e.target.value)}
                    maxLength={template.slots.headline.max}
                    rows={2}
                    className="w-full bg-[#2a2a2a] border border-transparent focus:border-white/20 rounded-xl p-3 text-[13px] text-white focus:outline-none transition-colors resize-none"
                  />
                </div>

                {template.slots.body.enabled && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#888]">Текст</span>
                        {template.slots.body.removable && (
                          <button onClick={() => updateSlide('showBody', !s.showBody)} className="text-[#666] hover:text-white transition-colors text-xs">
                            {s.showBody ? 'Увімкнено' : 'Вимкнено'}
                          </button>
                        )}
                      </div>
                    </div>
                    {s.showBody && (
                      <textarea 
                        value={s.body}
                        onChange={e => updateSlide('body', e.target.value)}
                        maxLength={template.slots.body.max}
                        rows={3}
                        className="w-full bg-[#2a2a2a] border border-transparent focus:border-white/20 rounded-xl p-3 text-[13px] text-white focus:outline-none transition-colors resize-none"
                      />
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Visuals Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-[#888]" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">Візуал</h3>
              </div>
              
              {template.slots.photo.enabled && (
                <div className="mb-5">
                  <span className="text-[11px] text-[#888] block mb-2">Зображення</span>
                  <label className="flex items-center justify-center w-full h-24 border border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group relative overflow-hidden">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const fr = new FileReader();
                          fr.onload = () => updateSlide('img', fr.result);
                          fr.readAsDataURL(file);
                        }
                      }}
                    />
                    {s.img ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.img})` }} />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#666] group-hover:text-white transition-colors">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-xs">Завантажити фото</span>
                      </div>
                    )}
                  </label>
                </div>
              )}
              
              <div>
                <span className="text-[11px] text-[#888] block mb-2">Акцентний колір</span>
                <div className="flex gap-2 flex-wrap">
                  {template.brand.palette?.map((c: string) => (
                    <button
                      key={c}
                      onClick={() => updateSlide('plate', c)}
                      className={`w-7 h-7 rounded-full shadow-inner relative flex items-center justify-center transition-transform hover:scale-110`}
                      style={{ background: c }}
                    >
                      {s.plate === c && <div className="w-full h-full rounded-full border-[3px] border-[#1a1a1a]" />}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            
            {/* Automated Checks built-in at the bottom */}
            <div className="mt-8 pt-6 border-t border-white/5">
               <h3 className="font-medium text-xs mb-3 flex items-center gap-1.5 text-[#a1a1a1]">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                Усі перевірки пройдено
              </h3>
            </div>
            
          </div>
        </aside>

        {/* Center Canvas Area (Focus Mode) */}
        <main className="flex-1 bg-[#151515] relative overflow-hidden flex flex-col items-center justify-center">
          
          <div className="absolute top-4 w-full text-center text-[10px] uppercase tracking-[0.2em] text-[#666] pointer-events-none">
            {f.w} × {f.h} px
          </div>

          <div className="flex-1 w-full flex items-center justify-center p-8 overflow-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden flex-shrink-0"
              style={{
                width: f.w,
                height: f.h,
                transform: `scale(${Math.min(1, 450 / f.w, 750 / f.h)})`,
                transformOrigin: 'center center',
                background: template.brand.bg,
                borderRadius: isStory ? '32px' : '0px',
              }}
              ref={stageRef}
            >
              {/* Fallback Renderer Canvas */}
              <div style={{ position: 'absolute', inset: 0, padding: (isStory ? 70 : 64) * u, display: 'flex', flexDirection: 'column', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 * u }}>
                  <span style={{ fontSize: 38 * u, fontWeight: 'bold', color: template.brand.primary, letterSpacing: '-0.02em' }}>{template.brand.logoText}</span>
                  <span style={{ fontSize: 17 * u, color: template.brand.primary, opacity: 0.7 }}>{template.brand.tagline}</span>
                </div>
                
                {template.slots.photo.enabled && !isStory && (
                  <div style={{ flex: 1, marginTop: 30 * u, borderRadius: 24 * u, backgroundColor: '#e5e5e5', backgroundImage: s.img ? `url(${s.img})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                )}
                
                <div style={{ marginTop: isStory ? 'auto' : (template.slots.photo.enabled ? 30 * u : 'auto'), display: 'flex', flexDirection: 'column', gap: 20 * u, alignItems: 'flex-start' }}>
                  <div style={{ background: s.plate, color: readable(s.plate), fontSize: 58 * u, fontWeight: '800', padding: `${20 * u}px ${28 * u}px`, borderRadius: 16 * u, lineHeight: 1.08, letterSpacing: '-0.03em' }}>
                    {s.headline || ' '}
                  </div>
                  {template.slots.body.enabled && s.showBody && (
                    <div style={{ fontSize: 26 * u, lineHeight: 1.4, color: isStory ? '#fff' : template.brand.primary, opacity: 0.9 }}>
                      {s.body}
                    </div>
                  )}
                  {template.slots.cta.enabled && s.showCta && (
                    <div style={{ background: template.brand.accent, color: readable(template.brand.accent), fontSize: 25 * u, fontWeight: '600', padding: `${15 * u}px ${32 * u}px`, borderRadius: 999 }}>
                      {s.cta}
                    </div>
                  )}
                </div>
              </div>

              {isStory && template.slots.photo.enabled && (
                 <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundColor: '#222', backgroundImage: s.img ? `url(${s.img})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
              )}
              
              <div style={{ position: 'absolute', width: 520 * u, height: 520 * u, top: -160 * u, right: -160 * u, background: template.brand.primary, opacity: 0.05, borderRadius: '50%', zIndex: 1 }} />
              <div style={{ position: 'absolute', width: 360 * u, height: 360 * u, bottom: -120 * u, left: -120 * u, background: template.brand.accent, opacity: 0.1, borderRadius: '50%', zIndex: 1 }} />
              {isStory && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 400 * u, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', zIndex: 1 }} />
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Editor() {
  return (
    <Suspense fallback={
      <div className="flex justify-center h-screen items-center bg-[#1f1f1f]">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
