# Pluto Field Tracker

Field sales system for Pluto Aesthetics (Kurdistan Region) — visit tracking with GPS check-in, quantity targets with incentive accrual, order entry with supervisor/owner approval and accountant invoicing, payment collection with e-receipts, weekly plans, stock counts via Excel, leaves, team chat, and owner reports.

Built from the approved Claude Design screens (`Pluto Field Tracker - Screens Color-coded`), which supersede the original spec where they differ (supervisor/owner order approval, editable snapshotted prices, payment collection + e-receipts, weekly plan approvals, dwell tracking).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 (on your phone, use your PC's LAN IP, e.g. `http://192.168.x.x:3000`).

## Demo sign-ins (password: `password`)

| Name | Role |
|---|---|
| Mo | Admin (owner) |
| Dr. Alan | Supervisor |
| Sami Kareem | Medical rep · Erbil |
| Dara Mustafa | Medical rep · Duhok |
| Aland Talabani | Medical rep · Kirkuk |
| Zhilan Omar | Accountant |

Sign in with the name or the phone number.

## Data

All data lives in `data/db.json` (created from the seed on first run). **Delete that file and restart to reset the demo world.** The seed is dated August 2026 to match the design mocks.

This v1 runs fully self-contained (no external services). The API layer in `app/api/*` is the single place to swap in Supabase (Postgres + RLS + Realtime) later — the screens only talk to those routes.

## Notes

- Maps are schematic (design says "geo tiles in build") — pins are projected from real GPS coordinates.
- Location pings fire every 5 minutes while checked in and the app is open (PWA constraint: they pause when the phone is locked).
- "Export PDF" uses the browser print dialog; "Export Excel" generates a real .xlsx.
- Invoice PDF upload stores the filename on the order (file storage arrives with Supabase).
