/* app.js — qCreator frontend (auth, shells, designer cabinet, SMM cabinet). */
(function () {
  const FORMATS = window.QC_FORMATS;
  const ALL_FORMATS = ['ig_portrait', 'ig_square', 'ig_story', 'carousel'];
  const $ = sel => document.querySelector(sel);
  const root = $('#root');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let toastT;
  function toast(m, err) { const el = $('#toast'); el.textContent = m; el.className = 'toast show' + (err ? ' err' : ''); clearTimeout(toastT); toastT = setTimeout(() => el.className = 'toast', 2400); }

  /* ---------- session + api ---------- */
  let session = null;
  try { session = JSON.parse(localStorage.getItem('qc_session') || 'null'); } catch (e) {}
  function setSession(s) { session = s; if (s) localStorage.setItem('qc_session', JSON.stringify(s)); else localStorage.removeItem('qc_session'); }
  async function api(method, path, body) {
    const r = await fetch(path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, session ? { Authorization: 'Bearer ' + session.token } : {}), body: body ? JSON.stringify(body) : undefined });
    let data = {}; try { data = await r.json(); } catch (e) {}
    if (!r.ok) { if (r.status === 401 && session) { setSession(null); renderAuth(); } throw new Error(data.error || ('HTTP ' + r.status)); }
    return data;
  }

  /* ---------- boot ---------- */
  async function boot() {
    if (session) { try { const me = await api('GET', '/api/me'); session.user = me.user; setSession(session); return go('projects'); } catch (e) { setSession(null); } }
    renderAuth();
  }

  /* ---------- AUTH ---------- */
  let authMode = 'login', authRole = 'smm';
  function renderAuth() {
    const isReg = authMode === 'register';
    root.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="logo-q"><div class="mark">q</div>qCreator</div>
      <h2>${isReg ? 'Створити акаунт' : 'З поверненням 👋'}</h2>
      <p class="sub">${isReg ? 'Обери роль і зареєструйся' : 'Увійди, щоб працювати з шаблонами бренду'}</p>
      <div id="authErr"></div>
      ${isReg ? `<div class="field"><label>Імʼя</label><input type="text" id="aName" placeholder="Як до тебе звертатись"/></div>` : ''}
      ${isReg ? `<div class="field"><label>Роль</label><div class="role-pick" id="rolePick">
          <div class="rb ${authRole === 'designer' ? 'sel' : ''}" data-r="designer">🎨 Дизайнер<br><span style="font-size:11px">створює шаблони</span></div>
          <div class="rb ${authRole === 'smm' ? 'sel' : ''}" data-r="smm">📣 SMM<br><span style="font-size:11px">робить пости</span></div></div></div>` : ''}
      <div class="field"><label>Email</label><input type="text" id="aEmail" value="${isReg ? '' : 'designer@aura.co'}"/></div>
      <div class="field"><label>Пароль</label><input type="password" id="aPass" value="${isReg ? '' : 'demo1234'}"/></div>
      <button class="btn block" id="aSubmit">${isReg ? 'Зареєструватись' : 'Увійти'}</button>
      <div class="auth-switch">${isReg ? 'Вже є акаунт?' : 'Немає акаунта?'} <b id="aSwitch">${isReg ? 'Увійти' : 'Зареєструватись'}</b></div>
      ${isReg ? '' : `<div class="demo-hint"><b>Демо-акаунти:</b><br>🎨 designer@aura.co — кабінет дизайнера<br>📣 smm@aura.co — кабінет SMM<br>пароль для обох: <b>demo1234</b></div>`}
    </div></div>`;
    $('#aSwitch').onclick = () => { authMode = isReg ? 'login' : 'register'; renderAuth(); };
    if (isReg) $('#rolePick').querySelectorAll('.rb').forEach(b => b.onclick = () => { authRole = b.dataset.r; renderAuth(); });
    $('#aSubmit').onclick = submitAuth;
    [$('#aEmail'), $('#aPass'), $('#aName')].forEach(i => i && (i.onkeydown = e => { if (e.key === 'Enter') submitAuth(); }));
  }
  async function submitAuth() {
    const email = $('#aEmail').value.trim(), password = $('#aPass').value;
    try {
      let r;
      if (authMode === 'register') { const name = $('#aName').value.trim(); if (!name) throw new Error('Вкажи імʼя'); r = await api('POST', '/api/auth/register', { email, password, name, role: authRole }); }
      else r = await api('POST', '/api/auth/login', { email, password });
      setSession({ token: r.token, user: r.user }); go('projects');
    } catch (e) { $('#authErr').innerHTML = `<div class="auth-err">${esc(e.message)}</div>`; }
  }

  /* ---------- SHELL ---------- */
  function shell(inner) {
    const u = session.user, isDesigner = u.role === 'designer';
    root.innerHTML = `<div class="app">
      <aside class="sidebar">
        <div class="logo-q"><div class="mark">q</div>qCreator</div>
        <div class="role-chip ${u.role}">${isDesigner ? '🎨 Кабінет дизайнера' : '📣 Кабінет SMM'}</div>
        <nav class="nav">
          <a class="active" id="navProjects"><span class="ic">▦</span> Проєкти</a>
          <a id="navBrand"><span class="ic">◈</span> Бренд-кіт</a>
          ${isDesigner ? '<a id="navTeam"><span class="ic">◑</span> Команда</a>' : ''}
        </nav>
        <div class="side-foot">
          <div class="avatar">${esc((u.name || 'U')[0])}</div>
          <div style="min-width:0"><div style="color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</div>
          <div style="font-size:11px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.email)}</div></div>
          <span class="logout" id="logout">вийти</span>
        </div>
      </aside>
      <div class="main"><div id="screen">${inner || ''}</div></div></div>`;
    $('#navProjects').onclick = () => go('projects');
    $('#navBrand').onclick = () => toast('Бренд-кіт — наступна фаза');
    if ($('#navTeam')) $('#navTeam').onclick = () => toast('Команда/ролі — наступна фаза');
    $('#logout').onclick = () => { setSession(null); renderAuth(); };
  }

  /* ---------- ROUTER ---------- */
  function go(view, arg) { if (view === 'projects') renderProjects(); else if (view === 'project') renderProject(arg); }

  /* ---------- PROJECTS ---------- */
  async function renderProjects() {
    shell(`<div class="topbar"><h1 class="h-title">Проєкти</h1><div class="spacer"></div>
      ${session.user.role === 'designer' ? '<button class="btn sm" id="newProj">＋ Новий проєкт</button>' : ''}</div>
      <div class="content"><div class="spin"></div></div>`);
    if ($('#newProj')) $('#newProj').onclick = createProject;
    try {
      const { projects } = await api('GET', '/api/projects');
      let cards = projects.map(p => `<div class="pcard click" data-id="${p.id}">
          <div class="pcover" style="background:${p.hue}"></div>
          <div class="pbody"><div class="pname">${esc(p.name)}</div>
          <div class="pmeta">${p.templates} шаблонів · ${p.designs} макетів</div></div></div>`).join('');
      if (session.user.role === 'designer') cards += `<div class="pcard new-card" id="newProjCard"><div style="font-size:26px">＋</div>Новий проєкт</div>`;
      if (!projects.length && session.user.role !== 'designer') cards = `<div class="empty">Поки немає проєктів. Їх створює дизайнер.</div>`;
      $('#screen .content').innerHTML = `<div class="grid proj">${cards}</div>`;
      document.querySelectorAll('.pcard.click').forEach(c => c.onclick = () => go('project', c.dataset.id));
      if ($('#newProjCard')) $('#newProjCard').onclick = createProject;
    } catch (e) { $('#screen .content').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
  }
  async function createProject() {
    const name = prompt('Назва проєкту:'); if (!name) return;
    try { await api('POST', '/api/projects', { name }); toast('Проєкт створено'); renderProjects(); } catch (e) { toast(e.message, true); }
  }

  /* ---------- PROJECT ---------- */
  let curTab = 'tpl';
  async function renderProject(id) {
    const isDesigner = session.user.role === 'designer';
    shell(`<div class="topbar"><div class="crumb"><span id="bcProjects">Проєкти</span> / <b id="bcName">…</b></div>
        <div class="spacer"></div>${isDesigner ? '<button class="btn danger sm" id="delProj">Видалити проєкт</button>' : ''}</div>
      <div class="content"><h1 class="h-title" id="pTitle" style="margin-bottom:18px">…</h1>
        <div class="tabs">
          <div class="tab ${curTab === 'tpl' ? 'active' : ''}" id="tabTpl">Шаблони</div>
          <div class="tab ${curTab === 'my' ? 'active' : ''}" id="tabMy">${isDesigner ? 'Макети' : 'Мої макети'}</div>
        </div><div id="tabBody"><div class="spin"></div></div></div>`);
    $('#bcProjects').onclick = () => go('projects');
    let project, templates = [], designs = [];
    try {
      const pj = await api('GET', '/api/projects');
      project = pj.projects.find(p => p.id === id); if (!project) throw new Error('Проєкт не знайдено');
      $('#bcName').textContent = project.name; 
      $('#pTitle').innerHTML = `${esc(project.name)} <span style="font-size:12px;color:var(--muted);font-weight:normal;user-select:all;cursor:pointer;background:#eee;padding:2px 6px;border-radius:4px" title="Клікни 2 рази, щоб скопіювати ID для Figma">ID: ${project.id}</span>`;
      templates = (await api('GET', `/api/projects/${id}/templates`)).templates;
      designs = (await api('GET', `/api/projects/${id}/designs`)).designs;
    } catch (e) { $('#tabBody').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    const tplById = tid => templates.find(t => t.id === tid);
    if ($('#delProj')) $('#delProj').onclick = async () => { if (!confirm('Видалити проєкт з усіма шаблонами й макетами?')) return; try { await api('DELETE', '/api/projects/' + id); toast('Проєкт видалено'); go('projects'); } catch (e) { toast(e.message, true); } };
    $('#tabTpl').onclick = () => { curTab = 'tpl'; drawTab(); };
    $('#tabMy').onclick = () => { curTab = 'my'; drawTab(); };
    drawTab();

    function drawTab() {
      $('#tabTpl').classList.toggle('active', curTab === 'tpl');
      $('#tabMy').classList.toggle('active', curTab === 'my');
      const box = $('#tabBody');
      if (curTab === 'tpl') {
        let cards = templates.map(t => {
          const badges = t.formats.map(f => `<span class="tg ${f === 'carousel' ? '' : 'gray'}">${FORMATS[f].label}</span>`).join('');
          const designerCtrls = isDesigner ? `<button class="iconbtn" data-edit="${t.id}" title="Редагувати шаблон">✎</button><button class="iconbtn del" data-deltpl="${t.id}" title="Видалити">🗑</button>` : '';
          return `<div class="pcard"><div class="thumb" data-use="${t.id}">${miniTpl(t)}</div>
            <div class="cardfoot"><div><div class="pname">${esc(t.name)}</div><div class="tag-badges">${badges}</div></div>
              <div class="dactions">${designerCtrls}</div></div>
            <div style="padding:0 14px 14px"><button class="btn sm block" data-use="${t.id}">＋ Створити макет</button></div></div>`;
        }).join('');
        if (isDesigner) cards += `<div class="pcard new-card" id="newTpl"><div style="font-size:26px">＋</div>Новий шаблон</div>`;
        if (!templates.length && !isDesigner) cards = `<div class="empty">Дизайнер ще не додав шаблонів у цей проєкт.</div>`;
        box.innerHTML = `<div class="grid tpl">${cards}</div>`;
        box.querySelectorAll('[data-use]').forEach(b => b.onclick = () => openEditor(tplById(b.dataset.use), null));
        box.querySelectorAll('[data-edit]').forEach(b => b.onclick = e => { e.stopPropagation(); openBuilder(project, tplById(b.dataset.edit)); });
        box.querySelectorAll('[data-deltpl]').forEach(b => b.onclick = async e => { e.stopPropagation(); if (!confirm('Видалити шаблон?')) return; try { await api('DELETE', '/api/templates/' + b.dataset.deltpl, ); toast('Шаблон видалено'); renderProject(id); } catch (er) { toast(er.message, true); } });
        if ($('#newTpl')) $('#newTpl').onclick = () => openBuilder(project, null);
      } else {
        if (!designs.length) { box.innerHTML = `<div class="empty"><div style="font-size:34px;margin-bottom:8px">🗂</div>Поки порожньо. Відкрий шаблон і збережи макет.</div>`; return; }
        box.innerHTML = `<div class="grid tpl">` + designs.map(d => {
          const t = tplById(d.template_id);
          return `<div class="pcard"><div class="thumb" data-open="${d.id}">${miniDesign(d, t)}</div>
            <div class="cardfoot"><div><div class="pname" style="font-size:14px">${esc(d.name)}</div>
              <div class="pmeta">${FORMATS[d.format].label} · ${fmtDate(d.saved_at)}</div></div>
              <div class="dactions">
                <button class="iconbtn" data-open="${d.id}" title="Редагувати">✎</button>
                <button class="iconbtn" data-dup="${d.id}" title="Дублювати">⧉</button>
                <button class="iconbtn del" data-del="${d.id}" title="Видалити">🗑</button></div></div></div>`;
        }).join('') + `</div>`;
        box.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const d = designs.find(x => x.id === b.dataset.open); openEditor(tplById(d.template_id), d); });
        box.querySelectorAll('[data-dup]').forEach(b => b.onclick = async () => { const d = designs.find(x => x.id === b.dataset.dup); try { await api('POST', `/api/projects/${id}/designs`, { name: d.name + ' (копія)', format: d.format, slides: d.slides, templateId: d.template_id }); toast('Дубльовано'); renderProject(id); } catch (e) { toast(e.message, true); } });
        box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Видалити макет?')) return; try { await api('DELETE', '/api/designs/' + b.dataset.del); toast('Видалено'); renderProject(id); } catch (e) { toast(e.message, true); } });
      }
    }
    function openEditor(template, design) {
      if (!template) { template = { id: design && design.template_id, name: (design && design.name) || 'Шаблон', formats: [design ? design.format : 'ig_portrait'], brand: {}, slots: {} }; }
      window.Editor.open({ template, design, projectId: id, api, toast, onExit: () => renderProject(id) });
    }
  }
  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' }); } catch (e) { return ''; } }

  /* ---------- mini previews ---------- */
  function miniBrand(t) { const b = (t && t.brand) || {}; return { bg: b.bg || '#F5EFE6', primary: b.primary || '#2D1B3D', accent: b.accent || '#E8B04B', logoText: b.logoText || 'BRAND' }; }
  function miniTpl(t) { const f = FORMATS[t.formats[0]], s = 170 / f.h, w = f.w * s, h = f.h * s, b = miniBrand(t);
    return `<div style="width:${w}px;height:${h}px;background:${b.bg};border-radius:6px;position:relative;box-shadow:0 4px 12px rgba(0,0,0,.12)">
      <div style="position:absolute;top:8%;left:8%;font-weight:800;font-family:Manrope;letter-spacing:1px;color:${b.primary};font-size:9px">${esc(b.logoText).slice(0, 8)}</div>
      <div style="position:absolute;left:8%;right:8%;top:24%;bottom:38%;background:#d9cfc0;border-radius:5px"></div>
      <div style="position:absolute;left:8%;bottom:20%;background:${b.primary};color:#fff;font-size:7px;padding:3px 5px;border-radius:4px">Заголовок</div>
      ${t.formats.includes('carousel') ? '<div style="position:absolute;right:6px;bottom:6px;font-size:9px;color:' + b.primary + '">›››</div>' : ''}</div>`; }
  function miniDesign(d, t) { const f = FORMATS[d.format], s = 170 / f.h, w = f.w * s, h = f.h * s, b = miniBrand(t), sl = d.slides[0] || {};
    const bg = sl.img ? `background:url(${sl.img}) center/cover` : 'background:#d9cfc0';
    return `<div style="width:${w}px;height:${h}px;background:${b.bg};border-radius:6px;position:relative;box-shadow:0 4px 12px rgba(0,0,0,.12)">
      <div style="position:absolute;left:8%;right:8%;top:22%;height:36%;border-radius:5px;${bg}"></div>
      <div style="position:absolute;left:8%;bottom:16%;background:${sl.plate || b.primary};color:#fff;font-size:7px;padding:3px 5px;border-radius:4px;max-width:82%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(sl.headline || '')}</div></div>`; }

  /* ---------- TEMPLATE BUILDER (designer) ---------- */
  function openBuilder(project, tpl) {
    const editing = !!tpl;
    const b = (tpl && tpl.brand) || { logoText: 'AURA', tagline: 'skincare', bg: '#F5EFE6', primary: '#2D1B3D', accent: '#E8B04B', palette: ['#2D1B3D', '#E8B04B', '#7A5C8E', '#1A1A1A', '#FFFFFF'], font: 'Manrope' };
    const sl = (tpl && tpl.slots) || { headline: { enabled: true, removable: false, max: 42 }, body: { enabled: true, removable: true, max: 150 }, cta: { enabled: true, removable: true, max: 30 }, photo: { enabled: true, removable: false } };
    const selFormats = new Set(tpl ? tpl.formats : ['ig_portrait', 'ig_square', 'ig_story']);
    let palette = (b.palette || []).slice();

    const mr = $('#modalRoot');
    mr.innerHTML = `<div class="modal-bg"><div class="modal">
      <div class="modal-h"><h3>${editing ? 'Редагувати шаблон' : 'Новий шаблон'}</h3><span class="mclose" id="mClose">✕</span></div>
      <div class="modal-b">
        <label class="flbl">Назва шаблону</label>
        <input type="text" id="bName" value="${esc(tpl ? tpl.name : '')}" placeholder="напр. Промо-пост"/>

        <label class="flbl">Формати (що зможе робити SMM)</label>
        <div class="fmt-pick" id="bFormats">${ALL_FORMATS.map(f => `<div class="fp ${selFormats.has(f) ? 'sel' : ''}" data-f="${f}"><b>${FORMATS[f].ratio}</b>${FORMATS[f].label}</div>`).join('')}</div>

        <label class="flbl">Фірмовий стиль (бренд)</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><div class="hint">Текст лого</div><input type="text" id="bLogo" value="${esc(b.logoText)}"/></div>
          <div style="flex:1;min-width:140px"><div class="hint">Підпис (tagline)</div><input type="text" id="bTag" value="${esc(b.tagline || '')}"/></div>
        </div>
        <div class="colorline" style="margin-top:12px">
          <div class="ci">Фон<input type="color" id="bBg" value="${b.bg}"></div>
          <div class="ci">Основний<input type="color" id="bPrimary" value="${b.primary}"></div>
          <div class="ci">Акцент<input type="color" id="bAccent" value="${b.accent}"></div>
        </div>
        <div class="hint" style="margin-top:14px">Палітра плашок (кольори, з яких SMM зможе обирати)</div>
        <div class="palette-edit" id="bPalette"></div>

        <label class="flbl">Слоти, які зможе редагувати SMM</label>
        <div id="bSlots">
          ${slotRow('headline', 'Заголовок', sl.headline, false)}
          ${slotRow('body', 'Опис', sl.body, true)}
          ${slotRow('cta', 'Кнопка (CTA)', sl.cta, true)}
          ${slotRowPhoto(sl.photo)}
        </div>
      </div>
      <div class="modal-f">
        <button class="btn ghost" id="mCancel">Скасувати</button>
        <button class="btn" id="mSave">${editing ? 'Зберегти зміни' : 'Створити шаблон'}</button>
      </div>
    </div></div>`;

    function drawPalette() { $('#bPalette').innerHTML = palette.map((c, i) => `<input type="color" value="${c}" data-pi="${i}">`).join('') + `<button class="padd" id="palAdd" title="Додати колір">＋</button>`;
      $('#bPalette').querySelectorAll('input[data-pi]').forEach(inp => { inp.oninput = () => palette[+inp.dataset.pi] = inp.value; inp.ondblclick = () => { if (palette.length > 1) { palette.splice(+inp.dataset.pi, 1); drawPalette(); } }; });
      $('#palAdd').onclick = () => { palette.push('#888888'); drawPalette(); }; }
    drawPalette();
    $('#bPalette').insertAdjacentHTML('afterend', '<div class="hint">Подвійний клік по кольору — видалити</div>');

    $('#bFormats').querySelectorAll('.fp').forEach(fp => fp.onclick = () => { const f = fp.dataset.f; if (selFormats.has(f)) selFormats.delete(f); else selFormats.add(f); fp.classList.toggle('sel'); });
    const close = () => mr.innerHTML = '';
    $('#mClose').onclick = close; $('#mCancel').onclick = close; $('.modal-bg').onclick = e => { if (e.target.classList.contains('modal-bg')) close(); };

    $('#mSave').onclick = async () => {
      const name = $('#bName').value.trim(); if (!name) return toast('Вкажи назву шаблону', true);
      const formats = ALL_FORMATS.filter(f => selFormats.has(f)); if (!formats.length) return toast('Обери хоча б один формат', true);
      const brand = { logoText: $('#bLogo').value || 'BRAND', tagline: $('#bTag').value, bg: $('#bBg').value, primary: $('#bPrimary').value, accent: $('#bAccent').value, palette: palette.slice(), font: 'Manrope' };
      const slots = {
        headline: { enabled: true, removable: false, max: +($('#max_headline').value) || 42 },
        body: { enabled: $('#en_body').checked, removable: $('#rm_body').checked, max: +($('#max_body').value) || 150 },
        cta: { enabled: $('#en_cta').checked, removable: $('#rm_cta').checked, max: +($('#max_cta').value) || 30 },
        photo: { enabled: $('#en_photo').checked, removable: false },
      };
      try {
        if (editing) await api('PUT', '/api/templates/' + tpl.id, { name, formats, brand, slots });
        else await api('POST', `/api/projects/${project.id}/templates`, { name, formats, brand, slots });
        toast(editing ? 'Шаблон оновлено' : 'Шаблон створено'); close(); renderProject(project.id);
      } catch (e) { toast(e.message, true); }
    };

    function slotRow(key, label, cfg, canDisable) { cfg = cfg || {};
      return `<div class="slot-row"><span class="sname">${label}</span>
        ${canDisable ? `<label><input type="checkbox" id="en_${key}" ${cfg.enabled !== false ? 'checked' : ''}> увімкнено</label>` : `<input type="checkbox" id="en_${key}" checked style="display:none">`}
        <label><input type="checkbox" id="rm_${key}" ${cfg.removable ? 'checked' : ''} ${key === 'headline' ? 'disabled' : ''}> можна ховати</label>
        <label>макс <input type="number" id="max_${key}" value="${cfg.max || (key === 'headline' ? 42 : key === 'body' ? 150 : 30)}" min="5" max="500"></label></div>`;
    }
    function slotRowPhoto(cfg) { cfg = cfg || {};
      return `<div class="slot-row"><span class="sname">Фото</span>
        <label><input type="checkbox" id="en_photo" ${cfg.enabled !== false ? 'checked' : ''}> увімкнено</label>
        <span class="hint">SMM завантажує своє зображення</span></div>`;
    }
  }

  boot();
})();
