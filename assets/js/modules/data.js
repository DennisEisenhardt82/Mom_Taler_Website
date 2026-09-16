/* Laden der Startdaten (JSON) und Aufbau/Reparatur des Stores. */

import { load, save } from "./storage.js";
import { setStore, getStore } from "./state.js";
import { uid } from "./utils.js";

const SCHEMA_VERSION = 1;

const FALLBACK_SETTINGS = {
  theme: "system",
  reduceMotion: false,
  parentPinHash: null,
  dailyGoal: 3,
  weeklyGoal: 15,
  xpPerLevel: 100,
  categories: {
    haushalt: { label: "Haushalt", icon: "🏠" },
    schule: { label: "Schule", icon: "🎒" },
    sport: { label: "Sport", icon: "⚽" },
    sozial: { label: "Sozial", icon: "💛" },
    alltag: { label: "Alltag", icon: "☀️" },
  },
};

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

/* Alle Seed-Dateien laden. Schlägt eine fehl, wird sie leer ersetzt, die App läuft trotzdem. */
export async function loadSeed() {
  const files = {
    children: "data/kinder.json",
    tasks: "data/aufgaben.json",
    rewards: "data/belohnungen.json",
    achievements: "data/achievements.json",
    settings: "data/einstellungen.json",
  };
  const seed = {};
  await Promise.all(Object.entries(files).map(async ([key, path]) => {
    try {
      seed[key] = await fetchJson(path);
    } catch {
      seed[key] = key === "settings" ? {} : [];
    }
  }));
  return seed;
}

export function newChild({ name, avatar = "🙂", color = "#B3261E" }) {
  return {
    id: uid("c"),
    name: String(name).trim(),
    avatar,
    color,
    createdAt: new Date().toISOString(),
    balance: 0,
    xp: 0,
    earnedTotal: 0,
    spentTotal: 0,
    streak: { current: 0, best: 0, lastDate: null },
    achievements: [],
    records: { bestDay: 0, bestDayDate: null, maxBalance: 0 },
  };
}

function normalizeChild(raw) {
  const base = newChild({ name: raw.name || "Kind", avatar: raw.avatar, color: raw.color });
  return {
    ...base,
    ...raw,
    id: raw.id || base.id,
    balance: Number(raw.balance) || 0,
    xp: Number(raw.xp) || 0,
    earnedTotal: Number(raw.earnedTotal) || 0,
    spentTotal: Number(raw.spentTotal) || 0,
    streak: { ...base.streak, ...(raw.streak || {}) },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    records: { ...base.records, ...(raw.records || {}) },
  };
}

function normalizeTask(raw) {
  return {
    id: raw.id || uid("t"),
    title: String(raw.title || "Quest").trim(),
    description: String(raw.description || ""),
    reward: Math.max(0, Number(raw.reward) || 0),
    xp: Math.max(0, Number(raw.xp ?? Math.round((Number(raw.reward) || 0) / 2)) || 0),
    category: raw.category || "alltag",
    icon: raw.icon || "⭐",
    difficulty: Math.min(3, Math.max(1, Number(raw.difficulty) || 1)),
    recurrence: ["daily", "weekly", "once"].includes(raw.recurrence) ? raw.recurrence : "daily",
    assignedTo: raw.assignedTo === "all" || Array.isArray(raw.assignedTo) ? raw.assignedTo : "all",
    active: raw.active !== false,
  };
}

function normalizeReward(raw) {
  return {
    id: raw.id || uid("r"),
    title: String(raw.title || "Belohnung").trim(),
    description: String(raw.description || ""),
    cost: Math.max(0, Number(raw.cost) || 0),
    icon: raw.icon || "🎁",
    active: raw.active !== false,
  };
}

export function buildStore(seed) {
  const children = (seed.children || []).map(normalizeChild);
  return {
    version: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    settings: {
      ...FALLBACK_SETTINGS,
      ...(seed.settings || {}),
      categories: { ...FALLBACK_SETTINGS.categories, ...(seed.settings?.categories || {}) },
      activeChildId: children[0]?.id || null,
    },
    children,
    tasks: (seed.tasks || []).map(normalizeTask),
    rewards: (seed.rewards || []).map(normalizeReward),
    achievements: Array.isArray(seed.achievements) ? seed.achievements : [],
    completions: [],
    redemptions: [],
    transactions: [],
  };
}

/* Vorhandenen Store auf das aktuelle Schema heben und fehlende Felder ergänzen. */
export function migrate(raw, seed) {
  const s = raw && typeof raw === "object" ? raw : {};
  const migrated = {
    version: SCHEMA_VERSION,
    createdAt: s.createdAt || new Date().toISOString(),
    settings: {
      ...FALLBACK_SETTINGS,
      ...(seed?.settings || {}),
      ...(s.settings || {}),
      categories: { ...FALLBACK_SETTINGS.categories, ...(seed?.settings?.categories || {}), ...(s.settings?.categories || {}) },
    },
    children: (Array.isArray(s.children) ? s.children : []).map(normalizeChild),
    tasks: (Array.isArray(s.tasks) ? s.tasks : []).map(normalizeTask),
    rewards: (Array.isArray(s.rewards) ? s.rewards : []).map(normalizeReward),
    achievements: Array.isArray(s.achievements) && s.achievements.length ? s.achievements : (seed?.achievements || []),
    completions: Array.isArray(s.completions) ? s.completions : [],
    redemptions: Array.isArray(s.redemptions) ? s.redemptions : [],
    transactions: Array.isArray(s.transactions) ? s.transactions : [],
  };
  if (!migrated.children.some((c) => c.id === migrated.settings.activeChildId)) {
    migrated.settings.activeChildId = migrated.children[0]?.id || null;
  }
  return migrated;
}

/* Einstiegspunkt: Store aus localStorage holen oder aus JSON aufbauen. */
export async function ensureStore() {
  if (getStore()) return { store: getStore(), broken: false };
  const stored = load();
  let broken = false;
  let store;

  if (stored && stored.__broken) {
    broken = true;
    store = buildStore(await loadSeed());
  } else if (stored) {
    // Achievement-Definitionen nachladen, falls alte Daten sie nicht haben
    const seed = stored.achievements?.length ? null : await loadSeed();
    store = migrate(stored, seed);
  } else {
    store = buildStore(await loadSeed());
  }

  setStore(store);
  save(store);
  return { store, broken };
}

/* Import aus einer JSON-Datei (Einstellungen). Gibt Fehlertext oder null zurück. */
export function importStore(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return "Die Datei ist kein gültiges JSON.";
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.children)) {
    return "Die Datei enthält keine Momtaler-Daten.";
  }
  const current = getStore();
  const migrated = migrate(parsed, { achievements: current?.achievements || [] });
  setStore(migrated);
  save(migrated);
  return null;
}

export function resetStore() {
  setStore(null);
}
