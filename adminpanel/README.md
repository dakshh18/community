# Samaj Connect — Admin Panel

A web dashboard for committee admins to manage the community directory, events,
payments, and member-correction requests. Built with **React + Vite +
TypeScript**, talking to the existing Samaj Connect backend (`../server`).

It uses **React Query** for server state and **Zustand** for the auth session —
the same stack as the mobile app (spec §15).

---

## What you can do here

| Area | Capabilities |
|------|--------------|
| **Dashboard** | Totals, members-by-profession, payment summary, upcoming events, recent help requests |
| **Members** | Search / add / edit / delete persons; set phone, profession, blood group, DOB, privacy toggles; assign to a household |
| **Households** | Search / add / edit / delete households; view members; set the household head; add members to a household |
| **Corrections** | Approve / reject member-submitted field corrections (applies the change on approve) |
| **Events** | Create / edit / delete events; per-event dashboard; record payments; add expenses; CSV export |
| **Reports** | Download member directory & pending-payments CSVs |
| **Users & Roles** | Promote/demote ADMIN / COMMITTEE / MEMBER; enable/disable accounts |

> **Role gating.** The panel is for **ADMIN** and **COMMITTEE** logins. Member &
> household CRUD and Users are **ADMIN-only** (committee logins see Dashboard,
> Corrections, Events, Reports). The backend enforces this regardless of the UI.

---

## Prerequisites

1. The backend (`../server`) running and reachable (default `http://localhost:4000`).
2. At least one **ADMIN user with a password** set. New password login is separate
   from the member email-OTP flow.

### Grant an admin a panel password

On the server, the user must already exist (they appear after their first OTP
login, or via import/seed). Then, from `../server`:

```bash
npm run set-admin-password -- <phone> <password> ADMIN
# e.g.
npm run set-admin-password -- 9428656090 "ChangeMe123!" ADMIN
```

This sets a bcrypt password hash on the `User` and (optionally) promotes them to
`ADMIN`/`COMMITTEE` in one step.

---

## Local development

```bash
cp .env.example .env      # set VITE_API_BASE_URL if the API isn't on :4000
npm install
npm run dev               # http://localhost:5174
```

Sign in with the admin email + the password you set above.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server on :5174 |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:4000` | Base URL of the Samaj Connect backend |

The JWT is kept in `localStorage` (`samaj-admin-auth`) and attached as a
`Bearer` token on every request. A `401` clears the session and bounces to login.

---

## Deploying (free-tier friendly)

`npm run build` produces a static `dist/` folder. Serve it from the same Nginx
box as the API (spec §14) — e.g. an `admin.` subdomain or an `/admin` location —
and point `VITE_API_BASE_URL` at the public API origin at build time. No extra
infrastructure required.

---

## Backend endpoints this panel relies on

New in this iteration (see `../server/src/routes/adminMembers.ts`,
`../server/src/services/members.ts`, and `auth/admin/login`):

```
POST   /auth/admin/login            email + password → JWT (ADMIN/COMMITTEE)
GET    /admin/persons               list/search persons (admin)
POST   /admin/persons               create person
GET    /admin/persons/:id           get person
PATCH  /admin/persons/:id           update person
DELETE /admin/persons/:id           delete person
GET    /admin/households            list/search households
POST   /admin/households            create household
GET    /admin/households/:id        household + members
PATCH  /admin/households/:id        update household (incl. set head)
DELETE /admin/households/:id        delete empty household
GET    /admin/users                 list/search users
PATCH  /admin/users/:id             change role / activation
```

Reused existing endpoints: `/admin/stats`, `/professions`, `/native-places`,
`/corrections*`, `/events*`, `/reports/*`. Every admin mutation writes an
`AuditLog` (spec §10).
