# 拾光集 (Nav) — Project Knowledge Base

**Generated:** 2026-06-30
**Commit:** e57c9a7
**Branch:** master

## OVERVIEW

Bookmark/URL navigation site. Cloudflare Workers entry → server-rendered HTML + JSON API. D1 for data, KV for admin auth sessions. No build step, no package.json.

## STRUCTURE

```
./
├── src/index.js           # Worker entry — route dispatch (/api → /admin → frontend)
├── src/api/               # JSON API (sites CRUD, categories, pending submissions, import/export)
├── src/admin/             # Admin panel (login/logout, session auth, static page serving)
├── src/frontend/          # Public-facing SSR renderer
├── src/templates/         # HTML/CSS/JS templates (imported as text via Workers rules)
├── src/utils/             # Shared: HTML escaping, URL sanitization, SVG icons, sort normalization
├── schema.sql             # D1 schema (sites, pending_sites, category_orders)
├── wrangler.toml.example  # Template config (never commit real wrangler.toml)
└── old/                   # Archived legacy versions (worker.js, work_v1.js, work_v2.js) — DO NOT MODIFY
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `src/api/router.js` + relevant module | Route by `path` + `method`; auth via `isAdminAuthenticated()` |
| Change DB schema | `schema.sql` | Run `wrangler d1 execute book --remote --file=schema.sql` after change |
| Admin session logic | `src/admin/auth.js` | 12hr TTL, KV-backed, HttpOnly+Secure+SameSite=Strict cookie |
| Frontend page rendering | `src/frontend/renderer.js` | SSR with `{{PLACEHOLDER}}` template replacement |
| Template assets | `src/templates/` | Imported as text strings (Workers rules: `*.html`→Text, `*.css`→Text, `*.js.txt`→Text) |
| Admin page JS | `src/templates/admin.js.txt` | `.js.txt` extension avoids Workers treating as module |
| Feature flag | `ENABLE_PUBLIC_SUBMISSION` secret | `env.ENABLE_PUBLIC_SUBMISSION`; set via `wrangler secret put` |
| Data import/export | `src/api/sites.js` → `importConfig()` / `exportConfig()` | Import accepts array or `{data: [...]}`; export as JSON download |
| Category ordering | `src/utils/sort.js` + `src/api/categories.js` | Custom order stored in `category_orders` table, fallback to site-level sort |

## CONVENTIONS

- **`catelog`** (not `catalog`) used consistently across all code and schema
- **`desc`** column — SQLite reserved word; OK on D1, but rename to `description` if migrating to MySQL/Postgres
- **`sort_order`** defaults to `9999`; range clamped to ±2^31 via `normalizeSortOrder()`
- **`errorResponse(message, status)`** and **`jsonResponse(data, status)`** are defined per-file (not shared util) — uses `{ code: status, message }` shape
- **No package.json** — this is a script-mode Worker, not a Node.js project. Dependencies are Cloudflare platform bindings only.
- **Templates** imported via ES module `import` from `../templates/` — Workers rules in `wrangler.toml` declare them as Text modules
- **CSS** served as static files from memory (no CDN): `/static/admin.css`, `/static/frontend.css`, `/static/admin.js`
- **Password auth** — plaintext comparison against KV (`NAV_AUTH` namespace). Not hashed. Acceptable for single-admin use.
- **Session refresh** — cookie re-issued on every authenticated request (sliding expiration)
- **Commit convention**: `feat:`, `fix:`, `chore:` prefixes (from README contrib section)

## ANTI-PATTERNS (THIS PROJECT)

- **DO NOT** add `package.json` or npm dependencies — Workers run script-mode, no bundler
- **DO NOT** rename template files without updating `wrangler.toml` rules block
- **DO NOT** rename `catelog` without updating ALL code, schema, and templates
- **DO NOT** use `wrangler.toml` in production — it contains real resource IDs and is gitignored
- **DO NOT** modify files in `old/` — legacy archive, kept for reference only
- **DO NOT** hash admin passwords — the KV comparison is plaintext by design

## UNIQUE STYLES

- **Manual route dispatch** — no router library. `src/index.js` dispatches by `url.pathname.startsWith()`.
- **`{{UPPER_SNAKE_CASE}}` placeholders** in HTML templates, replaced via regex in `renderTemplate()`.
- **`.js.txt` extension** for admin JavaScript — circumvent Workers module detection while using Text import rules.
- **Fallback SVG icons** — `src/utils/icons.js` provides 3 gradient SVG icons used when a site has no logo.

## COMMANDS

```bash
# Development
wrangler dev                          # http://localhost:8787

# Deploy
wrangler deploy

# Database
wrangler d1 execute book --remote --file=schema.sql   # Apply schema
wrangler d1 export book --output backup.sql            # Backup

# Auth
wrangler kv key put --namespace-id=<KV_ID> admin_username "admin"
wrangler kv key put --namespace-id=<KV_ID> admin_password "your-password"

# Secrets
wrangler secret put ENABLE_PUBLIC_SUBMISSION   # "true" or "false"
```

## NOTES

- **Logout is POST-only** (`/admin/logout`, method check enforced) — Bug #26 fix
- **`schema.sql`** uses `CREATE TABLE IF NOT EXISTS` — safe to run idempotently
- **D1 binding** named `NAV_DB`, **KV binding** named `NAV_AUTH` — both referenced throughout as `env.NAV_DB` / `env.NAV_AUTH`
- **No CI/CD** — deployment is manual via `wrangler deploy`
- **TailwindCSS** loaded from CDN in templates (not bundled) — no PostCSS/build step
- **Font**: Noto Sans SC from Google Fonts CDN
