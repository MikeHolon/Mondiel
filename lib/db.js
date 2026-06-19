// מסד נתונים פשוט מבוסס קובץ JSON - ללא תלות בספריות חיצוניות.
// מתאים לקבוצה של חברים (עומס נמוך). כתיבה אטומית למניעת השחתת קובץ.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY = { groups: {}, users: {}, matches: {}, predictions: {} };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

let state = load();

function load() {
  ensureDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw);
      return { ...structuredClone(EMPTY), ...parsed };
    }
  } catch (err) {
    console.error("[db] failed to load, starting fresh:", err.message);
  }
  return structuredClone(EMPTY);
}

let saveTimer = null;
function scheduleSave() {
  // כתיבה מקובצת כדי לא להעמיס על הדיסק
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 120);
}

export function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  ensureDir();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DB_FILE); // החלפה אטומית
}

// שמירה גם ביציאה לא צפויה
process.on("SIGINT", () => { try { flush(); } finally { process.exit(0); } });
process.on("SIGTERM", () => { try { flush(); } finally { process.exit(0); } });

export const db = {
  get state() {
    return state;
  },
  save: scheduleSave,
  flushNow: flush,
  // עוזרים לעבודה על אוספים
  all(coll) {
    return Object.values(state[coll]);
  },
  get(coll, id) {
    return state[coll][id] || null;
  },
  put(coll, obj) {
    state[coll][obj.id] = obj;
    scheduleSave();
    return obj;
  },
  remove(coll, id) {
    delete state[coll][id];
    scheduleSave();
  },
};
