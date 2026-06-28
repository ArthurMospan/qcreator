# qCreator Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden qCreator for production: remove hardcoded secrets, delete dead code, add demo seeding, fix SMM editor flow, and restore documentation.

**Architecture:** Changes are isolated — each touches one file or adds one new file. The most cross-cutting change is the editor fix (adds GET /api/designs/[id] + updates editor page to handle designId param). Auto-seed runs via Next.js instrumentation.ts at startup; standalone seed script is identical logic invoked directly with Node.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, PostgreSQL (Render), db.js (CJS pg/SQLite/JSON), html-to-image for PNG export.

## Global Constraints

- Node ≥ 18 (engine constraint in package.json)
- db.js is CommonJS; TypeScript files import it via `import { db } from '../../db'`
- `QC_SECRET` env var MUST be set before the server starts (auth.ts throws if missing)
- Supported formats: `ig_portrait` | `ig_square` | `ig_story` | `carousel` — exactly these 4 keys
- All API routes use CORS helpers from `src/lib/cors.ts` (optionsResponse / withCors)
- No new npm dependencies — use only what's already in package.json

---

### Task 1: Remove hardcoded JWT secret from auth.ts

**Files:**
- Modify: `src/lib/auth.ts:4`

**Interfaces:**
- Produces: `SECRET` is a string, throws `Error('QC_SECRET env variable is required')` at module load if env var is absent

- [ ] **Step 1: Edit auth.ts line 4**

Replace:
```ts
const SECRET = process.env.QC_SECRET || 'qcreator-dev-secret-change-me';
```
With:
```ts
const rawSecret = process.env.QC_SECRET;
if (!rawSecret) throw new Error('QC_SECRET env variable is required');
const SECRET = rawSecret;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\Arthu\Creator\qcreator && npx tsc --noEmit`
Expected: 0 errors (SECRET is still string type)

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "security: require QC_SECRET env var, remove hardcoded fallback"
```

---

### Task 2: Delete src/proxy.ts (dead code)

**Files:**
- Delete: `src/proxy.ts`

**Notes:** This file exports `proxy()` but is never imported. Next.js middleware must be at `src/middleware.ts` with `export const middleware = ...` — this file name and export pattern are both wrong. CORS is already handled by `src/lib/cors.ts`. Safe to delete.

- [ ] **Step 1: Delete the file**

```bash
rm C:\Users\Arthu\Creator\qcreator\src\proxy.ts
```

- [ ] **Step 2: Verify nothing imports it**

```bash
grep -r "proxy" C:\Users\Arthu\Creator\qcreator\src --include="*.ts" --include="*.tsx"
```
Expected: no results importing `proxy.ts`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove dead proxy.ts (CORS handled by src/lib/cors.ts)"
```

---

### Task 3: Create seed script + npm run seed

**Files:**
- Create: `scripts/seed.js`
- Modify: `package.json` (add "seed" script)

**Interfaces:**
- Exports: `async function seedIfEmpty()` — used by instrumentation.ts
- When run directly (`node scripts/seed.js`): exits 0 on success, 1 on error

```js
// scripts/seed.js
'use strict';
const { db } = require('../db');
const crypto = require('crypto');

function hashPass(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 32).toString('hex');
  return salt + ':' + h;
}

async function seedIfEmpty() {
  const count = await db().count('users');
  if (count > 0) {
    console.log('[seed] DB not empty, skipping.');
    return;
  }
  const org = await db().createOrg({ name: 'AURA' });
  const designer = await db().createUser({
    orgId: org.id, email: 'designer@aura.co',
    pass: hashPass('demo1234'), name: 'AURA Designer', role: 'designer',
  });
  await db().createUser({
    orgId: org.id, email: 'smm@aura.co',
    pass: hashPass('demo1234'), name: 'AURA SMM', role: 'smm',
  });
  const project = await db().createProject({
    orgId: org.id, name: 'Соцмережі', hue: '270', createdBy: designer.id,
  });
  await db().createTemplate({
    projectId: project.id, name: 'Промо-пост',
    formats: ['ig_portrait', 'ig_square', 'ig_story', 'carousel'],
    brand: {
      bg: '#0f0f0f', primary: '#ffffff', accent: '#a78bfa',
      logoText: 'AURA', tagline: 'Бренд що надихає',
      palette: ['#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa'],
    },
    slots: {
      headline: { max: 80 },
      body: { enabled: true, max: 200, removable: true },
      photo: { enabled: true },
      cta: { enabled: true },
    },
    createdBy: designer.id,
  });
  console.log('[seed] Created: org AURA, designer@aura.co, smm@aura.co, template Промо-пост');
}

module.exports = { seedIfEmpty };

if (require.main === module) {
  seedIfEmpty().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
```

In package.json add:
```json
"seed": "node scripts/seed.js"
```

---

### Task 4: Create src/instrumentation.ts (auto-seed on startup)

**Files:**
- Create: `src/instrumentation.ts`

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { seedIfEmpty } = require('../scripts/seed') as { seedIfEmpty: () => Promise<void> };
      await seedIfEmpty();
    } catch (e) {
      console.error('[instrumentation] seed error:', e);
    }
  }
}
```

---

### Task 5: Add GET /api/designs/[id]

**Files:**
- Modify: `src/app/api/designs/[id]/route.ts` (add GET export)

**Interfaces:**
- `GET /api/designs/:id` → `{ design: Design }` or 404

Add before the existing `PUT`:
```ts
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
    const d = await db().getDesign(id);
    if (!d || !(await ownProject(user, d.project_id))) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ design: d }, { status: 200 });
  } catch (error) {
    console.error('Get design error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

---

### Task 6: Fix editor — designId flow + FORMATS safety

**Files:**
- Modify: `src/app/dashboard/editor/page.tsx`

**Issues to fix:**
1. When only `?designId=xxx` is in URL (clicking a saved design), `fetchContext` redirects to dashboard because `templateId` is null — should load the existing design + its template
2. `FORMATS[fmt].ratio` / `FORMATS[fmt].label` in format selector (line ~242) crash if `fmt` is unknown — need `?.`
3. `FORMATS[design.format]` in `handleDownload` (line ~140) throws if format unknown — need `?? FORMATS['ig_square']`
4. `normalizeTemplate` should filter unknown format keys

**Fixes in normalizeTemplate:**
```ts
const knownFormats = (Array.isArray(t.formats) ? t.formats : []).filter(
  (f: string) => f in FORMATS
);
// ...
formats: knownFormats.length > 0 ? knownFormats : ['ig_square'],
```

**Fix fetchContext to handle designId:**
```ts
const fetchContext = async () => {
  try {
    // Case 1: editing an existing design by designId
    if (designId && !templateId) {
      const dRes = await fetch(`/api/designs/${designId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!dRes.ok) { router.push('/dashboard'); return; }
      const { design: existingDesign } = await dRes.json();
      // Find its template
      const tRes = await fetch(`/api/templates/${existingDesign.template_id}`, ...);
      // ... etc
    }
  }
}
```

Wait — there's no `/api/templates/[id]` route! Let me check...

From exploration: `src/app/api/templates/[id]/route.ts` — "Template details". Let me read this in the execution step.

Actually from exploration report: `src/app/api/templates/[id]/route.ts` exists. Use `fetch(`/api/templates/${existingDesign.template_id}`, ...)` to get the template.

**Fix format selector rendering:**
```tsx
<div className="text-[10px] font-bold mb-0.5">{FORMATS[fmt]?.ratio ?? fmt}</div>
<div className="text-xs">{FORMATS[fmt]?.label ?? fmt}</div>
```

**Fix handleDownload:**
```ts
const f = FORMATS[design.format] ?? FORMATS['ig_square'];
```

---

### Task 7: Add format validation in POST /api/projects/[id]/templates

**Files:**
- Modify: `src/app/api/projects/[id]/templates/route.ts`

After the existing validation:
```ts
const VALID_FORMATS = new Set(['ig_portrait', 'ig_square', 'ig_story', 'carousel']);
const validFormats = body.formats.filter((f: string) => VALID_FORMATS.has(f));
if (!validFormats.length) {
  return NextResponse.json({ error: 'Жоден формат не підтримується' }, { status: 400 });
}
// Use validFormats instead of body.formats
```

---

### Task 8: Write README.md

**Files:**
- Modify: `README.md`

Full content in execution step.

---

### Task 9: Generate QC_SECRET + set on Render

Generate a random 32-byte hex string. Include instructions to set it in Render dashboard under **Environment** → **Environment Variables** → Add `QC_SECRET`.

The value to set: generated during execution.

---
