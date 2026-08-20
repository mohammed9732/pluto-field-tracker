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

export function getDb(): DB {
  if (globalThis.__plutoDb) return globalThis.__plutoDb;
  if (fs.existsSync(DB_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as DB;
    // A database written before a feature shipped simply lacks its settings.
    // Fill the gaps from the defaults rather than letting undefined leak into
    // the UI as "undefined" text or a crash.
    loaded.settings = { ...buildSeed().settings, ...loaded.settings };
    loaded.settings.terms = { ...DEFAULT_TERMS, ...(loaded.settings.terms ?? {}) };
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
