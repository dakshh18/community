# Samaj Connect — Server

Backend for the Samaj Connect community directory + events app.
See [SAMAJ_CONNECT_SPEC.md](SAMAJ_CONNECT_SPEC.md) for the full product spec.

## Stack
- Node.js 20+ / TypeScript
- Express
- Prisma ORM (provider = mongodb)
- MongoDB Atlas (M0 free tier)
- Zod for input validation
- JWT auth, email OTP (Brevo/Resend) — MOCK_OTP supported for dev

## Local setup

```powershell
# 1. install deps
npm install

# 2. configure env
copy .env.example .env
# then edit .env and set MONGODB_URI, JWT_SECRET

# 3. generate the Prisma client
npm run prisma:generate

# 4. (optional, first time) push schema to your Atlas DB
npm run prisma:push

# 5. start the dev server
npm run dev
```

Hit `http://localhost:4000/health` to verify the server is up.

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` | Start server in watch mode (tsx) |
| `npm run build` | Type-check + compile to `dist/` |
| `npm start` | Run compiled server from `dist/` |
| `npm run typecheck` | Type-check only |
| `npm run prisma:generate` | Generate Prisma client from schema |
| `npm run prisma:push` | Push schema to MongoDB (no migrations on mongo) |
| `npm run prisma:studio` | Open Prisma Studio against your DB |
| `npm run import -- ./data/community.xlsx` | Import community roster (Phase B) |

## Layout

```
server/
  prisma/
    schema.prisma           # all models (Spec §3)
  src/
    config/env.ts           # zod-validated env loader
    middleware/             # errorHandler, notFound, (later) auth, role
    routes/                 # express routers — health (now), auth/directory/... (later)
    utils/
      phone.ts              # canonical 10-digit + E.164 normalization (§1.5)
      logger.ts
      aliases/
        relation.ts         # bilingual relation enum mapping (§1.5)
        profession.ts       # ProfessionCategory seeds + alias resolver (§5)
    index.ts                # express bootstrap
  scripts/
    import-excel.ts         # (Phase B) one-time roster import — §7
```

## Build phases (per spec §12)
- **Phase A — Foundation** (this commit): scaffolding, Prisma schema, env config,
  phone/relation/profession utils, /health.
- **Phase B — Auth + Importer**: email OTP, JWT, role middleware, Excel importer.
- **Phase C — Directory**: search/filter, privacy filter, household detail.
- **Phase D — Settings + Corrections**: privacy toggles, change email, correction queue.
- **Phase E — Events + Money**: events, registrations, performances, payments, expenses.
- **Phase F — Admin + Reports**: stats, CSV exports, audit log.

<!-- ci/cd live test 2026-06-02 17:21 -->
