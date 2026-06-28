/* editor.js — SMM editor. Renders a design from a designer-made template config. */
(function () {
  const FORMATS = {
    ig_portrait: { w: 1080, h: 1350, label: 'Пост', ratio: '4:5' },
    ig_square: { w: 1080, h: 1080, label: 'Квадрат', ratio: '1:1' },
    ig_story: { w: 1080, h: 1920, label: 'Сторіс', ratio: '9:16' },
    carousel: { w: 1080, h: 1350, label: 'Каруселя', ratio: '4:5' },
  };
  window.QC_FORMATS = FORMATS;
  const clone = v => JSON.parse(JSON.stringify(v));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function lum(hex) { const c = hex.replace('#', ''); const r = parseInt(c.substr(0, 2), 16) / 255, g = parseInt(c.substr(2, 2), 16) / 255, b = parseInt(c.substr(4, 2), 16) / 255; const f = v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); }
  function contrast(a, b) { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); }
  function readable(bg) { return contrast('#FFFFFF', bg) >= contrast('#1A1A1A', bg) ? '#FFFFFF' : '#1A1A1A'; }

  let ctx, cur, brand, slots, activeSlide = 0, el;

  function baseSlide() {
    return { headline: 'Заголовок поста', body: 'Короткий опис, який легко змінити.', cta: 'Дізнатись більше',
      showBody: true, showCta: true, plate: brand.primary, img: null, imgRes: null, zoom: 120 };
  }
  function newDesignFromTemplate() {
    const fmt = ctx.template.formats[0];
    const d = { id: null, name: ctx.template.name, templateId: ctx.template.id, format: fmt };
    if (fmt === 'carousel') d.slides = [
      Object.assign(baseSlide(), { headline: '3 кроки до результату', body: 'Зберігай гайд ✨', showCta: false }),
      Object.assign(baseSlide(), { headline: 'Крок 1', body: 'Опис кроку.' }),
      Object.assign(baseSlide(), { headline: 'Крок 2', body: 'Опис кроку.' }),
    ];
    else d.slides = [baseSlide()];
    return d;
  }

  const Editor = {
    open(c) {
      ctx = c; brand = ctx.template.brand || {}; slots = ctx.template.slots || {};
      brand = Object.assign({ logoText: 'BRAND', tagline: '', bg: '#F5EFE6', primary: '#2D1B3D', accent: '#E8B04B', palette: ['#2D1B3D', '#E8B04B', '#1A1A1A', '#FFFFFF'], font: 'Manrope' }, brand);
      slots = Object.assign({ headline: { enabled: true, removable: false, max: 42 }, body: { enabled: true, removable: true, max: 150 }, cta: { enabled: true, removable: true, max: 30 }, photo: { enabled: true, removable: false } }, slots);
      cur = ctx.design ? clone(ctx.design) : newDesignFromTemplate();
      if (!cur.slides) cur.slides = [baseSlide()];
      activeSlide = 0;
      mount();
    },
  };
  window.Editor = Editor;

  function mount() {
    const fmtBtns = ctx.template.formats.map(f => `<div class="fb" data-f="${f}"><b>${FORMATS[f].ratio}</b>${FORMATS[f].label}</div>`).join('');
    const wrap = document.createElement('div');
    wrap.className = 'editor'; wrap.id = 'qcEditor';
    wrap.innerHTML = `
      <div class="etop">
        <button class="btn ghost sm" id="eBack">← Назад</button>
        <input class="dname" id="dname"/>
        <span class="tg gray">${esc(ctx.template.name)}</span>
        <div class="spacer"></div>
        <button class="btn soft sm" id="eSave">💾 Зберегти</button>
        <button class="btn sm" id="eDownload">⬇ Завантажити</button>
      </div>
      <div class="ebody">
        <div class="epanel left">
          <div class="sec"><div class="lbl">Формат</div><div class="fmt" id="fmt">${fmtBtns}</div></div>
          <div class="sec" id="carouselSec" style="display:none">
            <div class="lbl">Слайди каруселі <span class="count" id="slideCount"></span></div>
            <div class="filmstrip" id="filmstrip"></div>
          </div>
          <div class="sec" id="secHeadline"><div class="fieldhead"><div class="nm">Заголовок</div><span class="count"><span id="hCount">0</span>/<span id="hMax"></span></span></div>
            <textarea id="headline" rows="2" maxlength="200"></textarea></div>
          <div class="sec fieldwrap" id="wrapBody"><div class="fieldhead"><div class="nm">Опис</div>
            <div class="row"><span class="count"><span id="bCount">0</span>/<span id="bMax"></span></span>
            <button class="eye" id="eyeBody" title="Показати/приховати">👁</button></div></div>
            <textarea id="body" rows="3" maxlength="400"></textarea></div>
          <div class="sec fieldwrap" id="wrapCta"><div class="fieldhead"><div class="nm">Кнопка (CTA)</div>
            <button class="eye" id="eyeCta" title="Показати/приховати">👁</button></div>
            <input type="text" id="cta" maxlength="60"/></div>
          <div class="sec" id="secPhoto"><div class="lbl">Фото</div>
            <input type="file" id="img" accept="image/*" style="font-size:12px"/>
            <div class="lbl" style="margin:10px 0 4px">Масштаб у рамці <span class="count" id="zoomVal">120%</span></div>
            <input type="range" id="zoom" min="100" max="240" value="120"/></div>
          <div class="sec"><div class="lbl">Колір плашки <span class="count">палітра бренду</span></div>
            <div class="row" id="plateColors"></div></div>
          <div class="sec"><div class="lockbox">🔒 <b>Заблоковано дизайнером</b>
            <div class="lockrow"><span class="dot" style="background:${brand.primary}"></span> Лого «${esc(brand.logoText)}» + позиція</div>
            <div class="lockrow"><span class="dot" style="background:${brand.accent}"></span> Кольори / шрифт</div>
            <div class="lockrow"><span class="dot" style="background:${brand.bg};border:1px solid #ccc"></span> Сітка / відступи</div></div></div>
        </div>
        <div class="estage-wrap">
          <div class="viewport" id="viewport">
            <div class="stage" id="stage">
              <div class="s-deco" id="deco1"></div><div class="s-deco" id="deco2"></div>
              <div class="s-grad"></div><div class="safe" id="safeBottom"></div>
              <div class="s-pad" id="spad">
                <div class="s-brand"><div class="s-logo" id="sLogo"></div><div class="s-tag" id="sTag"></div></div>
                <div class="s-photo" id="photo"><span id="photoPh">🖼 фото</span></div>
                <div class="s-copy" id="copy">
                  <div class="s-plate" id="plate"></div>
                  <div class="s-body" id="bodyEl"></div>
                  <div class="s-cta" id="ctaEl"></div>
                </div>
              </div>
            </div>
          </div>
          <div style="font-size:11px;color:var(--muted)" id="dimLabel"></div>
        </div>
        <div class="epanel right">
          <div style="font-weight:700;font-size:14px;margin-bottom:3px">Перевірки наживо</div>
          <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Підказують, що піде не так</div>
          <div class="vstatus go" id="vstatus">✓ Готово</div>
          <div id="checks"></div>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    el = id => wrap.querySelector('#' + id);

    // static brand bits
    el('sLogo').textContent = brand.logoText; el('sLogo').style.color = brand.primary;
    el('sTag').textContent = brand.tagline; el('sTag').style.color = brand.primary;
    el('dname').value = cur.name;
    el('hMax').textContent = slots.headline.max; el('bMax').textContent = slots.body.max;
    if (!slots.body.enabled) el('wrapBody').style.display = 'none';
    if (!slots.cta.enabled) el('wrapCta').style.display = 'none';
    if (!slots.photo.enabled) el('secPhoto').style.display = 'none';
    el('eyeBody').style.display = slots.body.removable ? '' : 'none';
    el('eyeCta').style.display = slots.cta.removable ? '' : 'none';

    buildSwatches(); buildFormat(); bind(); loadSlide(); render();
  }
  function exit() { const n = document.getElementById('qcEditor'); if (n) n.remove(); window.removeEventListener('resize', onResize); if (ctx.onExit) ctx.onExit(); }

  function buildFormat() {
    el('fmt').querySelectorAll('.fb').forEach(b => {
      b.classList.toggle('sel', b.dataset.f === cur.format);
      b.onclick = () => { cur.format = b.dataset.f; activeSlide = 0; buildFormat(); loadSlide(); render(); };
    });
  }
  function buildSwatches() {
    const pc = el('plateColors'); pc.innerHTML = '';
    (brand.palette || []).forEach(c => { const s = document.createElement('div'); s.className = 'swatch'; s.dataset.c = c; s.style.background = c;
      if (c.toUpperCase() === '#FFFFFF') s.style.border = '2px solid #ccc';
      s.onclick = () => { slide().plate = c; markSwatch(); render(); }; pc.appendChild(s); });
  }
  function markSwatch() { el('plateColors').querySelectorAll('.swatch').forEach(s => s.classList.toggle('sel', s.dataset.c === slide().plate)); }
  function slide() { return cur.slides[activeSlide]; }

  function bind() {
    el('eBack').onclick = exit;
    el('eSave').onclick = save;
    el('eDownload').onclick = download;
    el('dname').oninput = e => cur.name = e.target.value;
    el('headline').oninput = e => { slide().headline = e.target.value; el('hCount').textContent = e.target.value.length; render(); };
    el('body').oninput = e => { slide().body = e.target.value; el('bCount').textContent = e.target.value.length; render(); };
    el('cta').oninput = e => { slide().cta = e.target.value; render(); };
    el('zoom').oninput = e => { slide().zoom = +e.target.value; el('zoomVal').textContent = e.target.value + '%'; render(); };
    el('img').onchange = e => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader();
      fr.onload = () => { const im = new Image(); im.onload = () => { slide().imgRes = { w: im.naturalWidth, h: im.naturalHeight }; slide().img = fr.result; render(); }; im.src = fr.result; }; fr.readAsDataURL(f); };
    el('eyeBody').onclick = () => { slide().showBody = !slide().showBody; updateEyes(); render(); };
    el('eyeCta').onclick = () => { slide().showCta = !slide().showCta; updateEyes(); render(); };
    window.addEventListener('resize', onResize);
  }
  function onResize() { if (document.getElementById('qcEditor')) render(); }

  function loadSlide() {
    const s = slide();
    el('headline').value = s.headline; el('hCount').textContent = (s.headline || '').length;
    el('body').value = s.body; el('bCount').textContent = (s.body || '').length;
    el('cta').value = s.cta;
    el('zoom').value = s.zoom; el('zoomVal').textContent = s.zoom + '%';
    el('img').value = ''; markSwatch(); updateEyes();
    const isCar = cur.format === 'carousel';
    el('carouselSec').style.display = isCar ? 'block' : 'none';
    if (isCar) buildFilmstrip();
  }
  function updateEyes() {
    const s = slide();
    el('eyeBody').classList.toggle('off', !s.showBody); el('eyeBody').textContent = s.showBody ? '👁' : '🚫';
    el('wrapBody').classList.toggle('hiddenEl', !s.showBody);
    el('eyeCta').classList.toggle('off', !s.showCta); el('eyeCta').textContent = s.showCta ? '👁' : '🚫';
    el('wrapCta').classList.toggle('hiddenEl', !s.showCta);
  }
  function buildFilmstrip() {
    const fs = el('filmstrip'); el('slideCount').textContent = cur.slides.length + ' / 10';
    fs.innerHTML = cur.slides.map((s, i) => `<div class="slide-thumb ${i === activeSlide ? 'sel' : ''}" data-i="${i}">
        <span class="num">${i + 1}</span>${cur.slides.length > 1 ? `<span class="x" data-x="${i}">×</span>` : ''}${miniSlide(s)}</div>`).join('')
      + (cur.slides.length < 10 ? `<button class="slide-add" id="slideAdd">＋</button>` : '');
    fs.querySelectorAll('.slide-thumb').forEach(t => t.onclick = ev => { if (ev.target.dataset.x !== undefined) return; activeSlide = +t.dataset.i; loadSlide(); render(); });
    fs.querySelectorAll('.x').forEach(x => x.onclick = ev => { ev.stopPropagation(); rmSlide(+x.dataset.x); });
    const add = el('slideAdd'); if (add) add.onclick = addSlide;
  }
  function miniSlide(s) { const bg = s.img ? `background:url(${s.img}) center/cover` : `background:#d9cfc0`;
    return `<div style="position:absolute;inset:0;background:${brand.bg}">
      <div style="position:absolute;left:6%;right:6%;top:16%;height:36%;border-radius:3px;${bg}"></div>
      <div style="position:absolute;left:6%;bottom:12%;right:14%;height:13%;background:${s.plate};border-radius:3px"></div></div>`; }
  function addSlide() { cur.slides.push(Object.assign(baseSlide(), { headline: 'Новий слайд', body: 'Текст слайда', showCta: false })); activeSlide = cur.slides.length - 1; loadSlide(); render(); }
  function rmSlide(i) { if (cur.slides.length <= 1) return; cur.slides.splice(i, 1); if (activeSlide >= cur.slides.length) activeSlide = cur.slides.length - 1; loadSlide(); render(); }

  /* ---- render (pixel-exact) ---- */
  function render() {
    const f = FORMATS[cur.format], s = slide(), stage = el('stage'), vp = el('viewport');
    const isStory = cur.format === 'ig_story';
    stage.classList.toggle('story', isStory);
    stage.style.background = brand.bg;
    stage.style.width = f.w + 'px'; stage.style.height = f.h + 'px';
    const maxW = Math.min(window.innerWidth - 640, 440), maxH = window.innerHeight - 180;
    const scale = Math.max(.05, Math.min(maxW / f.w, maxH / f.h));
    stage.style.transform = `scale(${scale})`;
    vp.style.width = Math.round(f.w * scale) + 'px'; vp.style.height = Math.round(f.h * scale) + 'px';
    el('dimLabel').textContent = `${f.w} × ${f.h} px · ${f.ratio}`;
    const u = f.w / 1080, pad = el('spad');
    pad.style.padding = (isStory ? 70 : 64) * u + 'px';
    el('sLogo').style.fontSize = 38 * u + 'px'; el('sTag').style.fontSize = 17 * u + 'px';
    el('deco1').style.cssText = `position:absolute;width:${520 * u}px;height:${520 * u}px;top:${-160 * u}px;right:${-160 * u}px;background:${brand.primary};opacity:.08;border-radius:50%;z-index:1`;
    el('deco2').style.cssText = `position:absolute;width:${360 * u}px;height:${360 * u}px;bottom:${-120 * u}px;left:${-120 * u}px;background:${brand.accent};opacity:.12;border-radius:50%;z-index:1`;
    const photo = el('photo'), hasPhoto = slots.photo.enabled;
    photo.style.display = hasPhoto ? 'flex' : 'none';
    photo.style.backgroundImage = s.img ? `url(${s.img})` : 'none';
    photo.style.backgroundSize = s.zoom + '%';
    el('photoPh').style.display = s.img ? 'none' : 'block';
    if (hasPhoto && isStory) { photo.style.cssText = `position:absolute;inset:0;flex:none;z-index:0;border-radius:0;margin:0;background:${s.img ? `url(${s.img})` : '#d9cfc0'} center/${s.zoom}% no-repeat`; pad.style.justifyContent = 'flex-end'; }
    else if (hasPhoto) { photo.style.position = 'relative'; photo.style.inset = 'auto'; photo.style.flex = '1'; photo.style.zIndex = 'auto'; photo.style.borderRadius = 24 * u + 'px'; photo.style.margin = (30 * u) + 'px 0 0'; pad.style.justifyContent = 'flex-start'; }
    else { pad.style.justifyContent = isStory ? 'flex-end' : 'flex-start'; }
    const copy = el('copy'); copy.style.gap = 20 * u + 'px'; copy.style.marginTop = isStory ? 'auto' : (hasPhoto ? 30 * u : 'auto') + 'px';
    const plate = el('plate'); plate.textContent = s.headline || ' '; plate.style.background = s.plate;
    plate.style.color = readable(s.plate); plate.style.fontSize = 58 * u + 'px'; plate.style.lineHeight = '1.08';
    plate.style.padding = `${20 * u}px ${28 * u}px`; plate.style.borderRadius = 16 * u + 'px';
    const bodyEl = el('bodyEl'); bodyEl.textContent = s.body; bodyEl.style.fontSize = 26 * u + 'px'; bodyEl.style.lineHeight = '1.4';
    bodyEl.style.color = isStory ? '#fff' : brand.primary;
    bodyEl.style.display = (slots.body.enabled && s.showBody) ? 'block' : 'none';
    const ctaEl = el('ctaEl'); ctaEl.textContent = s.cta; ctaEl.style.background = brand.accent; ctaEl.style.color = readable(brand.accent);
    ctaEl.style.fontSize = 25 * u + 'px'; ctaEl.style.padding = `${15 * u}px ${32 * u}px`; ctaEl.style.borderRadius = '999px';
    ctaEl.style.display = (slots.cta.enabled && s.showCta) ? 'inline-block' : 'none';
    el('safeBottom').style.cssText = `left:0;right:0;bottom:0;height:${300 * u}px;display:${isStory ? 'block' : 'none'}`;
    validate(s, isStory);
    if (cur.format === 'carousel') buildFilmstrip();
  }

  function validate(s, isStory) {
    const out = []; let blocking = false;
    const hmax = slots.headline.max, bmax = slots.body.max;
    if (!s.headline.trim()) { out.push(['err', 'Заголовок порожній', 'Обовʼязкове поле']); blocking = true; }
    else if (s.headline.length > hmax) out.push(['warn', 'Забагато тексту в заголовку', `${s.headline.length}/${hmax} — скороти`, 'shortenH']);
    else out.push(['ok', 'Заголовок ок', `${s.headline.length}/${hmax}`]);
    const plate = el('plate'); const lh = parseFloat(getComputedStyle(plate).lineHeight) || 1; const lines = Math.round(plate.scrollHeight / lh);
    if (lines > 3) out.push(['warn', `Заголовок у ${lines} рядки`, 'Плашка росте під текст, але >3 рядків забагато']);
    if (slots.body.enabled && s.showBody) { if (s.body.length > bmax) out.push(['warn', 'Опис задовгий', `${s.body.length}/${bmax}`, 'shortenB']); else out.push(['ok', 'Опис ок', `${s.body.length}/${bmax}`]); }
    else out.push(['ok', 'Опис вимкнено', 'Не в макеті']);
    if (slots.cta.enabled && !s.showCta) out.push(['ok', 'Кнопка прихована', 'Не в макеті']);
    const ratio = contrast(readable(s.plate), s.plate);
    out.push(['ok', 'Контраст тексту', `${ratio.toFixed(1)}:1`]);
    if (slots.photo.enabled) { if (!s.imgRes) out.push(['warn', 'Фото не додано', 'Слот фото порожній']);
      else if (s.imgRes.w < FORMATS[cur.format].w * 0.9) out.push(['warn', 'Фото замале', `${s.imgRes.w}px при ~${FORMATS[cur.format].w}px`]);
      else out.push(['ok', 'Якість фото ок', `${s.imgRes.w}×${s.imgRes.h}px`]); }
    if (isStory) { const sb = el('safeBottom').getBoundingClientRect(); const ref = el((slots.cta.enabled && s.showCta) ? 'ctaEl' : 'bodyEl').getBoundingClientRect();
      if (ref.bottom > sb.top + 2) out.push(['warn', 'Контент у зоні інтерфейсу', 'Низ Stories перекриють кнопки Instagram']);
      else out.push(['ok', 'Safe-zone Stories', 'Контент поза зоною']); }
    out.push(['ok', 'Формат під мережу', FORMATS[cur.format].ratio + (cur.format === 'ig_portrait' ? ' — пріоритет Meta' : cur.format === 'carousel' ? ' — каруселя' : '')]);
    if (cur.format === 'carousel') out.push(['ok', `Слайд ${activeSlide + 1} з ${cur.slides.length}`, 'Кожен слайд окремо']);
    const box = el('checks'); box.innerHTML = ''; const order = { err: 0, warn: 1, ok: 2 }; out.sort((a, b) => order[a[0]] - order[b[0]]);
    out.forEach(([lvl, ttl, ds, fix]) => { const d = document.createElement('div'); d.className = 'check ' + lvl;
      const icon = lvl === 'ok' ? '✓' : lvl === 'warn' ? '!' : '×';
      d.innerHTML = `<div class="ic">${icon}</div><div style="flex:1"><span class="ttl">${esc(ttl)}</span><span class="ds">${esc(ds || '')}</span>${fix ? `<br><button class="fixbtn" data-fix="${fix}">Виправити</button>` : ''}</div>`;
      box.appendChild(d); });
    box.querySelectorAll('.fixbtn').forEach(b => b.onclick = () => doFix(b.dataset.fix));
    const st = el('vstatus'); st.className = 'vstatus ' + (blocking ? 'no' : 'go');
    st.textContent = blocking ? '✕ Є помилки — виправ перед експортом' : '✓ Готово до експорту';
  }
  function doFix(k) { const s = slide();
    if (k === 'shortenH') { s.headline = s.headline.slice(0, slots.headline.max); el('headline').value = s.headline; el('hCount').textContent = s.headline.length; }
    if (k === 'shortenB') { s.body = s.body.slice(0, slots.body.max); el('body').value = s.body; el('bCount').textContent = s.body.length; }
    render();
  }

  /* ---- save / export ---- */
  async function save() {
    const payload = { name: cur.name, format: cur.format, slides: cur.slides, templateId: cur.templateId || ctx.template.id };
    try {
      if (cur.id) { await ctx.api('PUT', '/api/designs/' + cur.id, payload); }
      else { const r = await ctx.api('POST', `/api/projects/${ctx.projectId}/designs`, payload); cur.id = r.design.id; }
      ctx.toast('Збережено в «Мої макети»');
    } catch (e) { ctx.toast('Помилка збереження', true); }
  }
  async function download() {
    if (typeof htmlToImage === 'undefined') { ctx.toast('Нема доступу до CDN бібліотеки', true); return; }
    const stage = el('stage'), f = FORMATS[cur.format], t = stage.style.transform;
    const shoot = async (name) => { stage.style.transform = 'scale(1)'; const url = await htmlToImage.toPng(stage, { width: f.w, height: f.h, pixelRatio: 1 }); stage.style.transform = t; const a = document.createElement('a'); a.download = name; a.href = url; a.click(); };
    try {
      if (cur.format === 'carousel') { const start = activeSlide;
        for (let i = 0; i < cur.slides.length; i++) { activeSlide = i; loadSlide(); render(); await new Promise(r => setTimeout(r, 130)); await shoot(`${cur.name}_slide${i + 1}.png`); await new Promise(r => setTimeout(r, 180)); }
        activeSlide = start; loadSlide(); render(); ctx.toast('Каруселю завантажено (' + cur.slides.length + ' слайдів)');
      } else { await shoot(`${cur.name}_${f.w}x${f.h}.png`); ctx.toast('PNG завантажено'); }
    } catch (e) { stage.style.transform = t; ctx.toast('Помилка експорту', true); }
  }
})();
