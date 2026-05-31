# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Schedule Notify** is a personal WhatsApp reminder bot. This repo is the **static HTML/JS frontend only** — no build step, no package manager, no bundler. The backend (FastAPI + SQLite) runs separately at `https://painel.danilosn.work` and is not in this repo.

Deployment: GitHub Pages at `https://danilosn.work` (CNAME).

## Priority rule

**Work on `admin.html` first.** `meu-painel.html` is a raw WIP — do not refactor or redesign it unless explicitly asked.

## No build system

There are no `npm install`, `build`, `lint`, or `test` commands. To develop:
- Edit HTML/CSS/JS files directly.
- Open in browser or push to GitHub Pages to see changes live.
- External dependencies (jQuery, Firebase SDK, Font Awesome) are loaded from CDNs inside the HTML files.

## Key files

| File | Role |
|------|------|
| `admin.html` | Admin control panel — primary development target |
| `scripts/admin.js` | All admin panel logic (~1000 lines) |
| `style/admin.css` | Admin dark theme and CSS variables |
| `auth.js` | Global auth check — included on every protected page |
| `login.html` | Site login page |
| `api_operacoes.md` | Operations endpoints reference |
| `user-panel-api.md` | User panel API contract (for when that work begins) |

## Authentication

- **Admin:** cookie `admin_token`, set via `POST /admin/api/login`
- **Site users:** cookie `user_session`, checked via `GET /api.danilosn.work/site/me`
- `auth.js` runs on page load, hides the page body until auth is confirmed, then appends a logout button. It must be loaded **before** page-specific scripts (especially `to-do.js` in hub pages).

## CORS / fetch requirements

Frontend is on `danilosn.work`, backend on `painel.danilosn.work` — all fetch calls must include:

```javascript
credentials: "include"
```

If a fetch fails with `Failed to fetch`, check CORS/cookies/preflight before blaming the HTML. Test with:

```bash
curl -i -X OPTIONS "https://painel.danilosn.work/admin/api/login" \
  -H "Origin: https://danilosn.work" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

Expected response headers: `access-control-allow-origin: https://danilosn.work` and `access-control-allow-credentials: true`.

## Admin panel rules

**Theme:** Always dark. CSS variables are defined in `style/admin.css`:

```css
--bg: #0f172a; --card: #111827; --text: #e5e7eb; --muted: #9ca3af;
--border: #263244; --primary: #3b82f6; --danger: #dc2626;
--warning: #f59e0b; --success: #22c55e;
```
Inputs, selects, and textareas must use dark backgrounds — no white fields in modals.

**Modals:** Never use `alert()`, `confirm()`, or `prompt()`. Reuse the existing modal functions:
```javascript
openFormModal()
openConfirmModal()
showModalMessage()
```

**Do not implement:** resend reminder, duplicate reminder.

## Reminder data rules

**Channel display priority:**
```javascript
item.display_tag || item.source_tag || item.channel_tag
```

**Multi-channel grouping key** (multiple DB rows = same reminder on different channels):
```javascript
[item.user_id, item.description, item.remind_at || "", item.recurrence_type || "", item.sent ? "1" : "0"].join("||")
```

**Recurrence types and `recurrence_value`:**

| `recurrence_type` | `recurrence_value` | Modal behavior |
|---|---|---|
| `null` / `""` | null | hide value field |
| `daily` | null | hide value field |
| `business_days` | null | hide value field |
| `weekly` | 0=Mon … 6=Sun | show weekday hint |
| `monthly` | day number (e.g. `5`) | show day-of-month hint |
| `yearly` | `DD/MM` (e.g. `12/10`) | show format hint |
| `task` | null | hide date/time and value fields |
| `countdown` | null | hide value field |

**Task type** — `recurrence_type = "task"` requires a far-future `remind_at` (backend needs a date):
```javascript
const remindAt = values.recurrence_type === "task"
  ? `${new Date().getFullYear() + 20}-01-01T00:00`
  : values.remind_at;
```

## Admin API base

```javascript
const backendUrl = "https://painel.danilosn.work";
```

Full endpoint list is in `CONTEXT.md` §3. Do not invent endpoints — if an endpoint's contract is unclear, ask for the backend source rather than guessing.

## Hub task lists

Pages under `hub/` each have a local `to-do.js`. Most use `localStorage`; `hub/trabalho/` uses Firebase Firestore (config with API key is hardcoded in that file — do not move it to a shared location without considering scope).
