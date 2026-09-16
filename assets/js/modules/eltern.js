/* Gildenschalter: PIN-Gate (nur Komfortschutz im Browser, keine echte Sicherheit)
   und Verwaltungsfunktionen für Quests, Belohnungen und Buchungen. */

import { getStore, commit, taskById, rewardById } from "./state.js";
import { book } from "./transaktionen.js";
import { uid } from "./utils.js";

const SESSION_KEY = "momtaler.parentUnlocked";

async function hashPin(pin) {
  const text = `momtaler:${pin}`;
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback ohne Web Crypto (z. B. http im Heimnetz): einfacher, aber ausreichend für einen Komfortschutz
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

export function hasPin() {
  return Boolean(getStore()?.settings.parentPinHash);
}

export function isUnlocked() {
  if (!hasPin()) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export async function unlock(pin) {
  const store = getStore();
  if (!store.settings.parentPinHash) return true;
  const hash = await hashPin(String(pin || ""));
  if (hash !== store.settings.parentPinHash) return false;
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* dann eben nur bis zum Reload */ }
  return true;
}

export function lock() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* nichts */ }
}

export async function setPin(pin) {
  const clean = String(pin || "").trim();
  if (clean && !/^\d{4,6}$/.test(clean)) throw new Error("Die PIN besteht aus 4 bis 6 Ziffern.");
  const store = getStore();
  store.settings.parentPinHash = clean ? await hashPin(clean) : null;
  commit("settings:pin");
  if (clean) {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* nichts */ }
  }
}

/* ---------- Quests ---------- */

function cleanTask(input, existing = {}) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Bitte einen Titel eingeben.");
  const reward = Math.round(Number(input.reward));
  if (!Number.isFinite(reward) || reward < 0 || reward > 100000) throw new Error("Die Belohnung muss zwischen 0 und 100.000 liegen.");
  const xp = input.xp === "" || input.xp == null ? Math.round(reward / 2) : Math.round(Number(input.xp));
  if (!Number.isFinite(xp) || xp < 0) throw new Error("XP müssen 0 oder größer sein.");
  return {
    ...existing,
    title: title.slice(0, 60),
    description: String(input.description || "").trim().slice(0, 200),
    reward,
    xp,
    category: input.category || "alltag",
    icon: String(input.icon || "⭐").trim().slice(0, 4) || "⭐",
    difficulty: Math.min(3, Math.max(1, Number(input.difficulty) || 1)),
    recurrence: ["daily", "weekly", "once"].includes(input.recurrence) ? input.recurrence : "daily",
    assignedTo: Array.isArray(input.assignedTo) && input.assignedTo.length ? input.assignedTo : "all",
    active: input.active !== false,
  };
}

export function addTask(input) {
  const store = getStore();
  const task = { id: uid("t"), ...cleanTask(input) };
  store.tasks.push(task);
  commit("task:add");
  return task;
}

export function updateTask(id, input) {
  const store = getStore();
  const idx = store.tasks.findIndex((t) => t.id === id);
  if (idx < 0) throw new Error("Diese Quest gibt es nicht mehr.");
  store.tasks[idx] = cleanTask(input, store.tasks[idx]);
  commit("task:update");
  return store.tasks[idx];
}

export function toggleTask(id) {
  const task = taskById(id);
  if (!task) return;
  task.active = !task.active;
  commit("task:update");
}

export function removeTask(id) {
  const store = getStore();
  store.tasks = store.tasks.filter((t) => t.id !== id);
  commit("task:remove");
}

/* ---------- Belohnungen ---------- */

function cleanReward(input, existing = {}) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Bitte einen Titel eingeben.");
  const cost = Math.round(Number(input.cost));
  if (!Number.isFinite(cost) || cost < 0 || cost > 1000000) throw new Error("Die Kosten müssen zwischen 0 und 1.000.000 liegen.");
  return {
    ...existing,
    title: title.slice(0, 60),
    description: String(input.description || "").trim().slice(0, 200),
    cost,
    icon: String(input.icon || "🎁").trim().slice(0, 4) || "🎁",
    active: input.active !== false,
  };
}

export function addReward(input) {
  const store = getStore();
  const reward = { id: uid("r"), ...cleanReward(input) };
  store.rewards.push(reward);
  commit("reward:add");
  return reward;
}

export function updateReward(id, input) {
  const store = getStore();
  const idx = store.rewards.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Diese Belohnung gibt es nicht mehr.");
  store.rewards[idx] = cleanReward(input, store.rewards[idx]);
  commit("reward:update");
  return store.rewards[idx];
}

export function toggleReward(id) {
  const reward = rewardById(id);
  if (!reward) return;
  reward.active = !reward.active;
  commit("reward:update");
}

export function removeReward(id) {
  const store = getStore();
  store.rewards = store.rewards.filter((r) => r.id !== id);
  commit("reward:remove");
}

/* ---------- Manuelle Buchung ---------- */

export function adjustBalance(childId, amount, reason) {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value === 0) throw new Error("Bitte einen Betrag ungleich 0 eingeben.");
  const text = String(reason || "").trim();
  if (!text) throw new Error("Bitte einen Grund angeben, damit der Verlauf nachvollziehbar bleibt.");
  const tx = book({ childId, type: "adjust", amount: value, reason: text });
  commit("balance:adjust");
  return tx;
}

/* ---------- Einstellungen ---------- */

export function updateGoals({ dailyGoal, weeklyGoal }) {
  const store = getStore();
  const d = Math.round(Number(dailyGoal));
  const w = Math.round(Number(weeklyGoal));
  if (!Number.isFinite(d) || d < 1 || d > 50) throw new Error("Das Tagesziel liegt zwischen 1 und 50.");
  if (!Number.isFinite(w) || w < 1 || w > 300) throw new Error("Das Wochenziel liegt zwischen 1 und 300.");
  store.settings.dailyGoal = d;
  store.settings.weeklyGoal = w;
  commit("settings:goals");
}
