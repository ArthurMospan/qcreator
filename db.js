// db.js — persistence layer.
// Primary: real SQLite via Node's built-in node:sqlite (Node >= 22.5, zero install).
// Fallback: JSON file (works on any Node). Same repo API either way.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const uid = (p = '') => p + crypto.randomBytes(8).toString('hex');
const now = () => new Date().toISOString();

let backend = null;

/* ---------------- SQLite backend ---------------- */
function trySqlite() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(DATA_DIR, 'qcreator.db'));
    db.exec(`
      CREATE TABLE IF NOT EXISTS orgs(id TEXT PRIMARY KEY, name TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, org_id TEXT, email TEXT UNIQUE, pass TEXT, name TEXT, role TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, org_id TEXT, name TEXT, hue TEXT, created_by TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY, project_id TEXT, name TEXT, formats TEXT, brand TEXT, slots TEXT, created_by TEXT, created_at TEXT);
      CREATE TABLE IF NOT EXISTS designs(id TEXT PRIMARY KEY, project_id TEXT, template_id TEXT, name TEXT, format TEXT, slides TEXT, created_by TEXT, saved_at TEXT);
    `);
    const J = v => JSON.stringify(v);
    const P = v => (v == null ? null : JSON.parse(v));
    return {
      kind: 'sqlite',
      // orgs
      createOrg({ name }) { const o = { id: uid('org_'), name, created_at: now() }; db.prepare('INSERT INTO orgs VALUES(?,?,?)').run(o.id, o.name, o.created_at); return o; },
      // users
      createUser(u) { const r = { id: uid('usr_'), org_id: u.orgId, email: u.email.toLowerCase(), pass: u.pass, name: u.name, role: u.role, created_at: now() };
        db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?)').run(r.id, r.org_id, r.email, r.pass, r.name, r.role, r.created_at); return r; },
      getUserByEmail(email) { return db.prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase()) || null; },
      getUserById(id) { return db.prepare('SELECT * FROM users WHERE id=?').get(id) || null; },
      // projects
      listProjects(orgId) { return db.prepare('SELECT * FROM projects WHERE org_id=? ORDER BY created_at DESC').all(orgId); },
      getProject(id) { return db.prepare('SELECT * FROM projects WHERE id=?').get(id) || null; },
      createProject(p) { const r = { id: uid('prj_'), org_id: p.orgId, name: p.name, hue: p.hue, created_by: p.createdBy, created_at: now() };
        db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(r.id, r.org_id, r.name, r.hue, r.created_by, r.created_at); return r; },
      deleteProject(id) { db.prepare('DELETE FROM designs WHERE project_id=?').run(id); db.prepare('DELETE FROM templates WHERE project_id=?').run(id); db.prepare('DELETE FROM projects WHERE id=?').run(id); },
      // templates
      listTemplates(projectId) { return db.prepare('SELECT * FROM templates WHERE project_id=? ORDER BY created_at').all(projectId).map(t => ({ ...t, formats: P(t.formats), brand: P(t.brand), slots: P(t.slots) })); },
      getTemplate(id) { const t = db.prepare('SELECT * FROM templates WHERE id=?').get(id); return t ? { ...t, formats: P(t.formats), brand: P(t.brand), slots: P(t.slots) } : null; },
      createTemplate(t) { const r = { id: uid('tpl_'), project_id: t.projectId, name: t.name, formats: t.formats, brand: t.brand, slots: t.slots, created_by: t.createdBy, created_at: now() };
        db.prepare('INSERT INTO templates VALUES(?,?,?,?,?,?,?,?)').run(r.id, r.project_id, r.name, J(r.formats), J(r.brand), J(r.slots), r.created_by, r.created_at); return r; },
      updateTemplate(id, t) { db.prepare('UPDATE templates SET name=?,formats=?,brand=?,slots=? WHERE id=?').run(t.name, J(t.formats), J(t.brand), J(t.slots), id); return this.getTemplate(id); },
      deleteTemplate(id) { db.prepare('DELETE FROM templates WHERE id=?').run(id); },
      // designs
      listDesigns(projectId) { return db.prepare('SELECT * FROM designs WHERE project_id=? ORDER BY saved_at DESC').all(projectId).map(d => ({ ...d, slides: P(d.slides) })); },
      getDesign(id) { const d = db.prepare('SELECT * FROM designs WHERE id=?').get(id); return d ? { ...d, slides: P(d.slides) } : null; },
      createDesign(d) { const r = { id: uid('dsg_'), project_id: d.projectId, template_id: d.templateId, name: d.name, format: d.format, slides: d.slides, created_by: d.createdBy, saved_at: now() };
        db.prepare('INSERT INTO designs VALUES(?,?,?,?,?,?,?,?)').run(r.id, r.project_id, r.template_id, r.name, r.format, J(r.slides), r.created_by, r.saved_at); return r; },
      updateDesign(id, d) { db.prepare('UPDATE designs SET name=?,format=?,slides=?,saved_at=? WHERE id=?').run(d.name, d.format, J(d.slides), now(), id); return this.getDesign(id); },
      deleteDesign(id) { db.prepare('DELETE FROM designs WHERE id=?').run(id); },
      count(table) { return db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c; },
    };
  } catch (e) {
    console.warn('[db] node:sqlite unavailable (' + e.message + ') — using JSON file store.');
    return null;
  }
}

/* ---------------- JSON file backend ---------------- */
function jsonBackend() {
  const FILE = path.join(DATA_DIR, 'qcreator.json');
  let s = { orgs: [], users: [], projects: [], templates: [], designs: [] };
  if (fs.existsSync(FILE)) { try { s = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {} }
  const save = () => fs.writeFileSync(FILE, JSON.stringify(s));
  const clone = v => JSON.parse(JSON.stringify(v));
  return {
    kind: 'json',
    createOrg({ name }) { const o = { id: uid('org_'), name, created_at: now() }; s.orgs.push(o); save(); return o; },
    createUser(u) { const r = { id: uid('usr_'), org_id: u.orgId, email: u.email.toLowerCase(), pass: u.pass, name: u.name, role: u.role, created_at: now() }; s.users.push(r); save(); return r; },
    getUserByEmail(email) { return s.users.find(u => u.email === String(email).toLowerCase()) || null; },
    getUserById(id) { return s.users.find(u => u.id === id) || null; },
    listProjects(orgId) { return s.projects.filter(p => p.org_id === orgId).reverse(); },
    getProject(id) { return s.projects.find(p => p.id === id) || null; },
    createProject(p) { const r = { id: uid('prj_'), org_id: p.orgId, name: p.name, hue: p.hue, created_by: p.createdBy, created_at: now() }; s.projects.push(r); save(); return r; },
    deleteProject(id) { s.designs = s.designs.filter(d => d.project_id !== id); s.templates = s.templates.filter(t => t.project_id !== id); s.projects = s.projects.filter(p => p.id !== id); save(); },
    listTemplates(projectId) { return clone(s.templates.filter(t => t.project_id === projectId)); },
    getTemplate(id) { const t = s.templates.find(x => x.id === id); return t ? clone(t) : null; },
    createTemplate(t) { const r = { id: uid('tpl_'), project_id: t.projectId, name: t.name, formats: t.formats, brand: t.brand, slots: t.slots, created_by: t.createdBy, created_at: now() }; s.templates.push(r); save(); return clone(r); },
    updateTemplate(id, t) { const r = s.templates.find(x => x.id === id); Object.assign(r, { name: t.name, formats: t.formats, brand: t.brand, slots: t.slots }); save(); return clone(r); },
    deleteTemplate(id) { s.templates = s.templates.filter(t => t.id !== id); save(); },
    listDesigns(projectId) { return clone(s.designs.filter(d => d.project_id === projectId).reverse()); },
    getDesign(id) { const d = s.designs.find(x => x.id === id); return d ? clone(d) : null; },
    createDesign(d) { const r = { id: uid('dsg_'), project_id: d.projectId, template_id: d.templateId, name: d.name, format: d.format, slides: d.slides, created_by: d.createdBy, saved_at: now() }; s.designs.push(r); save(); return clone(r); },
    updateDesign(id, d) { const r = s.designs.find(x => x.id === id); Object.assign(r, { name: d.name, format: d.format, slides: d.slides, saved_at: now() }); save(); return clone(r); },
    deleteDesign(id) { s.designs = s.designs.filter(d => d.id !== id); save(); },
    count(table) { return s[table].length; },
  };
}

function db() { if (!backend) backend = trySqlite() || jsonBackend(); return backend; }

module.exports = { db, uid };
