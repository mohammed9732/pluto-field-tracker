import fs from "fs";
import path from "path";
import { DB, DEFAULT_TERMS } from "./types";
import { buildSeed, buildEmpty } from "./seed";
import { DATA_DIR, SEED_DEMO } from "./config";

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

declare global {
  // eslint-disable-next-line no-var
  var __plutoDb: DB | undefined;
}

/* Bring a database — freshly loaded OR already cached — up to the current
 * shape. Collections and settings added by later features are simply absent
 * in an older file, and ALSO absent from the in-memory cache when code is
 * hot-reloaded under a long-lived process: the cache was built by the old
 * code and survives the reload. Deriving the check from the seed keeps it
 * one loop that can never forget a new collection. */
function ensureShape(db: DB) {
  const seed = buildSeed() as unknown as Record<string, unknown>;
  db.settings = { ...(seed.settings as object), ...db.settings } as DB["settings"];
  db.settings.terms = { ...DEFAULT_TERMS, ...(db.settings.terms ?? {}) };
  for (const key of Object.keys(seed)) {
    if (Array.isArray(seed[key]) && !Array.isArray((db as any)[key])) {
      (db as any)[key] = [];
    }
  }

  /* Migration: the app used to keep a separate "main" warehouse above the
   * cities. The owner killed it — every city is an equal warehouse — so
   * whatever main held belongs to head office (the first city). Runs once:
   * after this no stock row, transfer, or ERP mapping says "main" again. */
  const hq = db.settings.cities?.[0]?.id;
  if (hq && db.stock.some((x) => x.location === "main")) {
    for (const s of db.stock.filter((x) => x.location === "main")) {
      const dst = db.stock.find((x) => x.productId === s.productId && x.location === hq);
      if (dst) {
        dst.qty += s.qty;
        if (s.expiry && (!dst.expiry || s.expiry < dst.expiry)) { dst.expiry = s.expiry; dst.batch = s.batch ?? dst.batch; }
        db.stock = db.stock.filter((x) => x !== s);
      } else {
        s.location = hq;
      }
    }
    for (const t of db.stockTransfers) {
      if (t.from === "main") t.from = hq;
      if (t.to === "main") t.to = hq;
    }
    for (const r of db.transferRequests) {
      if (r.fromCity === "main") r.fromCity = hq;
      if (r.toCity === "main") r.toCity = hq;
    }
    const wh = db.settings.erpWarehouseMap ?? {};
    for (const k of Object.keys(wh)) if (wh[k] === "main") wh[k] = hq;
  }
  // Product order: sort once by the admin's drag-and-drop order so every
  // list in the app — ordering, stock, catalog, targets — follows it free.
  db.products.sort((a, b) => (a.sortOrder ?? a.id) - (b.sortOrder ?? b.id));
  // Migration: the single productLine grew into a list of lines.
  for (const u of db.users) {
    if (u.productLines === undefined && u.productLine) u.productLines = [u.productLine];
  }
}

export function getDb(): DB {
  if (globalThis.__plutoDb) {
    ensureShape(globalThis.__plutoDb);
    return globalThis.__plutoDb;
  }
  if (fs.existsSync(DB_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as DB;
    ensureShape(loaded);
    globalThis.__plutoDb = loaded;
  } else {
    globalThis.__plutoDb = SEED_DEMO ? buildSeed() : buildEmpty();
    saveDb();
  }
  return globalThis.__plutoDb!;
}

export function saveDb() {
  if (!globalThis.__plutoDb) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  backupDaily();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(globalThis.__plutoDb, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

// One backup per day, keep the last 14.
function backupDaily() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const backupDir = path.join(DATA_DIR, "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const dest = path.join(backupDir, `db-${day}.json`);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(DB_FILE, dest);
      const old = fs.readdirSync(backupDir).filter((f) => f.startsWith("db-")).sort();
      while (old.length > 14) fs.unlinkSync(path.join(backupDir, old.shift()!));
    }
  } catch {}
}

// Immediate labelled backup, taken before anything destructive. The daily
// snapshot may already be hours old, so it is not good enough on its own.
export function snapshot(label: string): string | null {
  try {
    if (!fs.existsSync(DB_FILE)) return null;
    const dir = path.join(DATA_DIR, "backups");
    fs.mkdirSync(dir, { recursive: true });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const name = `db-${label}-${stamp}.json`;
    fs.copyFileSync(DB_FILE, path.join(dir, name));
    return name;
  } catch {
    return null;
  }
}

export function nextId(db: DB): number {
  db.seq += 1;
  return db.seq;
}
