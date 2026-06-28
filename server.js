// server.js — zero-dependency HTTP server (Node built-ins only).
// Run:  node server.js   then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db } = require('./db');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.QC_SECRET || 'qcreator-dev-secret-change-me';
const STATIC_FILES = new Set(['/index.html', '/styles.css', '/app.js', '/editor.js']);

/* ---------- auth helpers ---------- */
const b64 = s => Buffer.from(s).toString('base64url');
const unb64 = s => Buffer.from(s, 'base64url').toString();
function hashPass(pw) { const salt = crypto.randomBytes(16).toString('hex'); const h = crypto.scryptSync(pw, salt, 32).toString('hex'); return salt + ':' + h; }
function checkPass(pw, stored) { const [salt, h] = stored.split(':'); const c = crypto.scryptSync(pw, salt, 32).toString('hex'); return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(c)); }
function signToken(user) { const payload = b64(JSON.stringify({ id: user.id, role: user.role, t: Date.now() })); const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url'); return payload + '.' + sig; }
function verifyToken(token) {
  if (!token) return null; const [payload, sig] = token.split('.'); if (!payload || !sig) return null;
  const exp = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (exp.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return null;
  try { const data = JSON.parse(unb64(payload)); return db().getUserById(data.id); } catch (e) { return null; }
}
const publicUser = u => u && ({ id: u.id, email: u.email, name: u.name, role: u.role, orgId: u.org_id });

/* ---------- http helpers ---------- */
function send(res, status, obj) { const body = JSON.stringify(obj); res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(body); }
function readBody(req) { return new Promise(resolve => { let d = ''; req.on('data', c => { d += c; if (d.length > 12e6) req.destroy(); }); req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch (e) { resolve({}); } }); }); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  if (!STATIC_FILES.has(p)) { res.writeHead(404); return res.end('Not found'); }
  const file = path.join(__dirname, p.slice(1));
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

/* ---------- route table ---------- */
const routes = [];
const R = (method, pattern, handler, opts = {}) => routes.push({ method, parts: pattern.split('/').filter(Boolean), handler, opts });
function match(method, url) {
  const segs = url.split('?')[0].split('/').filter(Boolean);
  for (const r of routes) {
    if (r.method !== method || r.parts.length !== segs.length) continue;
    const params = {}; let ok = true;
    for (let i = 0; i < r.parts.length; i++) { const pa = r.parts[i]; if (pa.startsWith(':')) params[pa.slice(1)] = decodeURIComponent(segs[i]); else if (pa !== segs[i]) { ok = false; break; } }
    if (ok) return { r, params };
  }
  return null;
}

/* ---------- auth routes ---------- */
R('POST', '/api/auth/register', async (req, res, ctx) => {
  const { email, password, name, role } = ctx.body;
  if (!email || !password || !name) return send(res, 400, { error: 'email, password, name обовʼязкові' });
  if (db().getUserByEmail(email)) return send(res, 409, { error: 'Користувач з таким email вже існує' });
  const org = db().createOrg({ name: name + "'s workspace" });
  const user = db().createUser({ orgId: org.id, email, pass: hashPass(password), name, role: role === 'designer' ? 'designer' : 'smm' });
  send(res, 200, { token: signToken(user), user: publicUser(user) });
});
R('POST', '/api/auth/login', async (req, res, ctx) => {
  const { email, password } = ctx.body; const u = db().getUserByEmail(email || '');
  if (!u || !checkPass(password || '', u.pass)) return send(res, 401, { error: 'Невірний email або пароль' });
  send(res, 200, { token: signToken(u), user: publicUser(u) });
});
R('GET', '/api/me', async (req, res, ctx) => send(res, 200, { user: publicUser(ctx.user) }), { auth: true });

/* ---------- projects ---------- */
R('GET', '/api/projects', async (req, res, ctx) => {
  const list = db().listProjects(ctx.user.org_id).map(p => ({ ...p, templates: db().listTemplates(p.id).length, designs: db().listDesigns(p.id).length }));
  send(res, 200, { projects: list });
}, { auth: true });
R('POST', '/api/projects', async (req, res, ctx) => {
  if (ctx.user.role !== 'designer') return send(res, 403, { error: 'Лише дизайнер може створювати проєкти' });
  const name = (ctx.body.name || '').trim(); if (!name) return send(res, 400, { error: 'Вкажи назву' });
  const hues = ['linear-gradient(135deg,#2D1B3D,#7A5C8E)', 'linear-gradient(135deg,#0f5e7a,#2bb5c9)', 'linear-gradient(135deg,#6d5ef6,#9b8cff)', 'linear-gradient(135deg,#e0588a,#ffb199)', 'linear-gradient(135deg,#16a34a,#7ee2a8)'];
  const n = db().listProjects(ctx.user.org_id).length;
  send(res, 200, { project: db().createProject({ orgId: ctx.user.org_id, name, hue: hues[n % hues.length], createdBy: ctx.user.id }) });
}, { auth: true });
R('DELETE', '/api/projects/:id', async (req, res, ctx) => {
  if (ctx.user.role !== 'designer') return send(res, 403, { error: 'Лише дизайнер' });
  const p = db().getProject(ctx.params.id); if (!p || p.org_id !== ctx.user.org_id) return send(res, 404, { error: 'not found' });
  db().deleteProject(p.id); send(res, 200, { ok: true });
}, { auth: true });

/* ---------- templates (designer manages) ---------- */
function ownProject(ctx, id) { const p = db().getProject(id); return p && p.org_id === ctx.user.org_id ? p : null; }
R('GET', '/api/projects/:id/templates', async (req, res, ctx) => {
  if (!ownProject(ctx, ctx.params.id)) return send(res, 404, { error: 'not found' });
  send(res, 200, { templates: db().listTemplates(ctx.params.id) });
}, { auth: true });
R('POST', '/api/projects/:id/templates', async (req, res, ctx) => {
  if (ctx.user.role !== 'designer') return send(res, 403, { error: 'Лише дизайнер створює шаблони' });
  if (!ownProject(ctx, ctx.params.id)) return send(res, 404, { error: 'not found' });
  const b = ctx.body; if (!b.name || !Array.isArray(b.formats) || !b.formats.length) return send(res, 400, { error: 'Вкажи назву і хоча б один формат' });
  const t = db().createTemplate({ projectId: ctx.params.id, name: b.name.trim(), formats: b.formats, brand: b.brand || {}, slots: b.slots || {}, createdBy: ctx.user.id });
  send(res, 200, { template: t });
}, { auth: true });
R('PUT', '/api/templates/:id', async (req, res, ctx) => {
  if (ctx.user.role !== 'designer') return send(res, 403, { error: 'Лише дизайнер' });
  const t = db().getTemplate(ctx.params.id); if (!t || !ownProject(ctx, t.project_id)) return send(res, 404, { error: 'not found' });
  const b = ctx.body; send(res, 200, { template: db().updateTemplate(t.id, { name: b.name ?? t.name, formats: b.formats ?? t.formats, brand: b.brand ?? t.brand, slots: b.slots ?? t.slots }) });
}, { auth: true });
R('DELETE', '/api/templates/:id', async (req, res, ctx) => {
  if (ctx.user.role !== 'designer') return send(res, 403, { error: 'Лише дизайнер' });
  const t = db().getTemplate(ctx.params.id); if (!t || !ownProject(ctx, t.project_id)) return send(res, 404, { error: 'not found' });
  db().deleteTemplate(t.id); send(res, 200, { ok: true });
}, { auth: true });

/* ---------- designs (smm + designer) ---------- */
R('GET', '/api/projects/:id/designs', async (req, res, ctx) => {
  if (!ownProject(ctx, ctx.params.id)) return send(res, 404, { error: 'not found' });
  send(res, 200, { designs: db().listDesigns(ctx.params.id) });
}, { auth: true });
R('POST', '/api/projects/:id/designs', async (req, res, ctx) => {
  if (!ownProject(ctx, ctx.params.id)) return send(res, 404, { error: 'not found' });
  const b = ctx.body; if (!b.name || !b.format || !Array.isArray(b.slides)) return send(res, 400, { error: 'bad design' });
  send(res, 200, { design: db().createDesign({ projectId: ctx.params.id, templateId: b.templateId || null, name: b.name, format: b.format, slides: b.slides, createdBy: ctx.user.id }) });
}, { auth: true });
R('PUT', '/api/designs/:id', async (req, res, ctx) => {
  const d = db().getDesign(ctx.params.id); if (!d || !ownProject(ctx, d.project_id)) return send(res, 404, { error: 'not found' });
  const b = ctx.body; send(res, 200, { design: db().updateDesign(d.id, { name: b.name ?? d.name, format: b.format ?? d.format, slides: b.slides ?? d.slides }) });
}, { auth: true });
R('DELETE', '/api/designs/:id', async (req, res, ctx) => {
  const d = db().getDesign(ctx.params.id); if (!d || !ownProject(ctx, d.project_id)) return send(res, 404, { error: 'not found' });
  db().deleteDesign(d.id); send(res, 200, { ok: true });
}, { auth: true });

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/api/')) return serveStatic(req, res);
  const m = match(req.method, req.url);
  if (!m) return send(res, 404, { error: 'Unknown endpoint' });
  const ctx = { params: m.params, body: {}, user: null };
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) ctx.body = await readBody(req);
  if (m.r.opts.auth) {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    ctx.user = verifyToken(token);
    if (!ctx.user) return send(res, 401, { error: 'Не авторизовано' });
  }
  try { await m.r.handler(req, res, ctx); }
  catch (e) { console.error(e); if (!res.headersSent) send(res, 500, { error: 'Server error' }); }
});

/* ---------- seed demo data on first run ---------- */
function seed() {
  if (db().count('users') > 0) return;
  console.log('[seed] creating demo org, accounts, project & template…');
  const org = db().createOrg({ name: 'AURA' });
  const designer = db().createUser({ orgId: org.id, email: 'designer@aura.co', pass: hashPass('demo1234'), name: 'Дизайнер AURA', role: 'designer' });
  db().createUser({ orgId: org.id, email: 'smm@aura.co', pass: hashPass('demo1234'), name: 'SMM AURA', role: 'smm' });
  const proj = db().createProject({ orgId: org.id, name: 'AURA Skincare', hue: 'linear-gradient(135deg,#2D1B3D,#7A5C8E)', createdBy: designer.id });
  const brand = { name: 'AURA', logoText: 'AURA', tagline: 'skincare', bg: '#F5EFE6', primary: '#2D1B3D', accent: '#E8B04B', palette: ['#2D1B3D', '#E8B04B', '#7A5C8E', '#1A1A1A', '#FFFFFF'], font: 'Manrope' };
  const slots = { headline: { enabled: true, removable: false, max: 42 }, body: { enabled: true, removable: true, max: 150 }, cta: { enabled: true, removable: true, max: 30 }, photo: { enabled: true, removable: false } };
  db().createTemplate({ projectId: proj.id, name: 'Промо-пост', formats: ['ig_portrait', 'ig_square', 'ig_story'], brand, slots, createdBy: designer.id });
  db().createTemplate({ projectId: proj.id, name: 'Каруселя-гайд', formats: ['carousel'], brand, slots: { ...slots, cta: { enabled: true, removable: true, max: 24 } }, createdBy: designer.id });
}

seed();
server.listen(PORT, () => console.log(`\n  qCreator running →  http://localhost:${PORT}\n  DB backend: ${db().kind}\n  Demo logins: designer@aura.co / smm@aura.co  (pass: demo1234)\n`));
