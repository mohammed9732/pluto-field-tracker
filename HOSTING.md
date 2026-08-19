# Hosting the Pluto Field Tracker

Quick reference. The full step-by-step guide with tick-boxes is the
"Pluto Field Tracker Launch Runbook" artifact.

## Where it can run

It needs **a single long-running Node process with a disk that persists**.
Railway ($5/mo) or Render ($7/mo) both work.

**It cannot run on Vercel or any serverless host.** The database is a JSON file
on disk and uploads are files on disk; serverless wipes both between requests.
Data would appear to save and then silently disappear.

## Environment variables

| Name | Example | Required | Notes |
|---|---|---|---|
| `SESSION_SECRET` | long random hex | **yes** | Signs login cookies. App refuses to sign anyone in without it in production. |
| `DATA_DIR` | `/data` | **yes** | Must equal the mounted disk path. Holds `db.json`, `uploads/`, `backups/`. |
| `TZ` | `Asia/Baghdad` | recommended | Server clocks run UTC; Iraq is UTC+3 all year. |
| `SEED_DEMO` | `false` | recommended | `false` starts a clean company. `true` loads the demo world. |
| `OWNER_NAME` | `Muhamad` | first boot only | Read only when no database exists yet. |
| `OWNER_PHONE` | `+964 750 000 0001` | first boot only | This becomes the sign-in username. |
| `OWNER_PASSWORD` | strong password | first boot only | Change it in-app afterwards. |
| `VAPID_PUBLIC_KEY` | from web-push | optional | Push notifications stay dormant until set. |
| `VAPID_PRIVATE_KEY` | from web-push | optional | |
| `VAPID_SUBJECT` | `mailto:you@example.com` | optional | |

Generate a secret:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Generate push keys:

```
npx web-push generate-vapid-keys
```

## Data

Everything lives under `DATA_DIR`:

- `db.json` — the whole database
- `uploads/` — receipt photos, visit photos, voice notes, brochures
- `backups/` — one automatic snapshot per day, last 14 kept

`data/` is excluded from git, so company records never reach GitHub.
The owner can pull a full copy from **Control panel → Download a backup**.

## Health check

`GET /api/health` returns `{ ok: true, users: N }`. Point the host's health
check at it.

## Passwords

Stored as scrypt hashes. Any leftover plain-text password from the demo build
still signs in once and is re-saved hashed automatically, so an existing
`db.json` migrates itself.

Login is rate limited to 10 attempts per phone number per 15 minutes.
