# Bari Vara Backend — Skill Guide

Use this file whenever you change code in the **backend** repo. Match existing patterns; do not invent new architecture.

Cursor loads `.cursor/skills/bari-vara/` automatically when relevant. This file is the canonical overview (easy to `@skills.md`).

---

## Project

```
bari-vara-api   Express 5 + Mongoose + Redis → Render / Railway / Fly
```

- Package manager: **pnpm**
- Schemas/types: `src/shared` → import `#shared` (`package.json` `"imports"`)
- Sister frontend repo owns `src/shared` as `@/shared`. After a contract change, update **both** copies.
- Manual API examples live in the separate **bruno** repo (cookie jar; demo password `Password123`).
- **No** Firebase; do **not** host this API on Vercel serverless

### Demo accounts (after `pnpm seed`)

Password for all: `Password123`

| Role | Email |
| --- | --- |
| Admin | `admin@barivara.dev` |
| Owner | `owner@barivara.dev` |
| Tenant | `tenant@barivara.dev` |

---

## Hard rules (always)

1. **Read before write** — open 1–2 similar existing modules; copy naming and nesting.
2. **Schemas** — validate with `#shared` zod + `validate()` middleware, not ad-hoc checks in controllers.
3. **Surgical diffs** — only touch what the task needs; no drive-by refactors.
4. **No secrets** in commits; use `.env.example` patterns.
5. Respond to the user in **Bangla + English** when chatting (code/comments stay English).

---

## Structure

```
src/
  app.ts / server.ts / routes.ts
  config/          # env (zod), db, redis, mailer, cloudinary
  middleware/      # requireAuth, validate, rateLimit, upload, errorHandler
  models/          # User, Flat, Booking, Review
  modules/<domain>/
    *.routes.ts
    *.controller.ts
    *.service.ts
    *.serializer.ts   # public DTO mapping
    *.test.ts
  shared/          # zod schemas + constants (API copy of contract)
  utils/           # ApiError, response, cache
  seed/
  emails/
```

### Must follow

- Mount under `/api/v1` via `routes.ts` (health at `/health`)
- Validate with `#shared` zod + `validate()` middleware
- Auth = httpOnly cookies `bv_access` / `bv_refresh` (no Bearer)
- Public responses via serializers + `sendSuccess` / `ApiError`
- Redis: tokens, OTP, rate limits, flat list cache invalidation on writes

### Domains

`auth` · `users` · `flats` · `bookings` · `reviews` · `uploads` · `stats`

---

## Stack details

- Express 5 + TypeScript (ESM, `NodeNext`)
- Mongoose 9 + MongoDB
- Redis (ioredis): refresh tokens, OTP, rate limit, flat-list cache
- JWT httpOnly cookies: `bv_access` (15m), `bv_refresh` (7d), rotation + reuse detection
- Nodemailer OTP, Cloudinary + multer uploads

### Module rules

1. Validate with shared zod schemas via `validate({ body|query|params })`
2. Controllers call services; keep HTTP thin
3. Serializers are the only shape leaving the API for entities
4. Throw `ApiError` (status + machine `code`); `errorHandler` formats envelope
5. Success: `sendSuccess(res, message, data, status?, pagination?)`

### Auth & cookies

- No Bearer tokens — cookies only
- Production: `sameSite: 'none'`, `secure: true`
- `requireAuth` / `requireRole('owner'|'admin'|…)`
- OTP hashed in Redis; login blocked until `isEmailVerified`

### API surface (`API_PREFIX`, default `/api/v1`)

| Prefix | Notes |
| --- | --- |
| `/auth` | register, OTP, login, google (ID token), refresh, logout, password reset, me |
| `/users` | me profile, owner-request; admin list/role/review |
| `/flats` | public list/detail; owner CRUD; `/:id/reviews` nested |
| `/bookings` | create, me, received, status, cancel |
| `/uploads` | owner/admin multipart → Cloudinary |
| `/stats/overview` | admin |

Health: `GET /health` (outside prefix).

### Tests

Vitest + Supertest; `src/test/helpers.ts` for users/flats/sign-in.

---

## Run / deploy

```bash
cp .env.example .env
pnpm install
pnpm docker:up   # Redis only — point MONGODB_URI at Atlas or a local mongod
pnpm seed
pnpm dev
```

- Local API: http://localhost:5000/health
- **Production (free):** Render Web Service + MongoDB Atlas M0 + Upstash Redis
- Blueprint: [`render.yaml`](./render.yaml) — build `corepack enable && pnpm install --frozen-lockfile && pnpm build`, start `pnpm start`, health `/health`
- `tsx` is a **runtime** dependency (required for `pnpm start` on Render)
- Set `CORS_ORIGIN` to the Vercel frontend origin; leave `COOKIE_DOMAIN` empty
- Vercel: set `API_ORIGIN` to `https://YOUR-SERVICE.onrender.com` and leave `NEXT_PUBLIC_API_BASE_URL` empty

---

## What not to do

- Do not host this Express API on Vercel serverless
- Do not invent `containers/`, `views/`, or parallel routing layers
- Do not skip serializers for public entity responses
- Do not assume a monorepo `packages/shared` — schemas are local `#shared`
- Do not put Bearer tokens in the Authorization header for app auth
