# qCreator

Brand-locked template editor for SMM teams. Designers push templates from Figma; SMM managers fill only the permitted slots and export PNG.

## Quick start

```bash
npm install
npm run build
npm start
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Production | PostgreSQL connection string (Render managed DB) |
| `QC_SECRET` | **Yes** | Random string used to sign JWT tokens — generate with `openssl rand -hex 32` |

Without `DATABASE_URL` the server falls back to SQLite (Node ≥ 22.5) or a local JSON file — useful for local dev.

## Demo data

```bash
npm run seed
```

Creates org **AURA** with two demo accounts:

| Email | Password | Role |
|---|---|---|
| `designer@aura.co` | `demo1234` | Designer |
| `smm@aura.co` | `demo1234` | SMM |

The seed also creates project **Соцмережі** with a **Промо-пост** template covering all four formats.

The server auto-seeds on startup if the database is empty (via Next.js `instrumentation.ts`).

## Roles

| Role | Permissions |
|---|---|
| **Designer** | Create projects, push templates via Figma plugin, update/delete templates |
| **SMM** | Open templates, fill editable slots (headline, body, photo, CTA), save designs, export PNG |

## Figma plugin

1. Open the **qCreator** plugin inside Figma
2. Enter your backend URL (`https://qcreator.onrender.com`) and credentials
3. Select a project, choose supported formats, then push the selected frame
4. The template appears in the dashboard within 15 s (auto-poll)

## Supported formats

| Key | Dimensions | Label |
|---|---|---|
| `ig_portrait` | 1080 × 1350 px | Пост 4:5 |
| `ig_square` | 1080 × 1080 px | Квадрат 1:1 |
| `ig_story` | 1080 × 1920 px | Сторіс 9:16 |
| `carousel` | 1080 × 1350 px | Каруселя |

Templates pushed with unknown format keys are silently filtered; the server rejects a push where *all* formats are unknown.

## API overview

All routes are under `/api/`. Auth via `Authorization: Bearer <token>`.

```
POST /api/auth/login          — email + password → token
POST /api/auth/register       — create org + user
GET  /api/me                  — current user
GET  /api/projects            — list org's projects
POST /api/projects            — create project (designer)
GET  /api/projects/:id/templates  — list templates
POST /api/projects/:id/templates  — push template (designer / Figma plugin)
GET  /api/templates/:id       — get single template
GET  /api/projects/:id/designs    — list designs
POST /api/projects/:id/designs    — save new design
GET  /api/designs/:id         — get single design
PUT  /api/designs/:id         — update design
```
