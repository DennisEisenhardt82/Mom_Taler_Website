/* Profile: anlegen, wechseln, bearbeiten, löschen. */

import { getStore, commit, childById } from "./state.js";
import { newChild } from "./data.js";
import { hashPin, validatePinFormat } from "./auth.js";

export const AVATARS = ["🦊", "🦉", "🐻", "🐰", "🐯", "🦄", "🐸", "🐼", "🐧", "🦁", "🐙", "🦖", "🧙", "🧚", "🦸", "🥷"];
export const COLORS = ["#B3261E", "#2F6FB3", "#3B8A3F", "#8A4FB3", "#D97706", "#0F8A8A"];

export function setActiveChild(id) {
  const store = getStore();
  if (!childById(id)) return false;
  store.settings.activeChildId = id;
  commit("child:switch");
  return true;
}

export function logoutChild() {
  const store = getStore();
  store.settings.activeChildId = null;
  commit("child:logout");
}

export function addChild({ name, avatar, color }) {
  const store = getStore();
  const clean = String(name || "").trim();
  if (clean.length < 1) throw new Error("Bitte einen Namen eingeben.");
  if (clean.length > 24) throw new Error("Der Name darf höchstens 24 Zeichen haben.");
  if (store.children.some((c) => c.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error("Ein Profil mit diesem Namen gibt es schon.");
  }
  const child = newChild({ name: clean, avatar: avatar || AVATARS[0], color: color || COLORS[0] });
  store.children.push(child);
  if (!store.settings.activeChildId) store.settings.activeChildId = child.id;
  commit("child:add");
  return child;
}

export function updateChild(id, { name, avatar, color }) {
  const child = childById(id);
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  const clean = String(name ?? child.name).trim();
  if (clean.length < 1) throw new Error("Bitte einen Namen eingeben.");
  child.name = clean.slice(0, 24);
  if (avatar) child.avatar = avatar;
  if (color) child.color = color;
  commit("child:update");
  return child;
}

export function removeChild(id) {
  const store = getStore();
  const idx = store.children.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Dieses Profil gibt es nicht mehr.");
  store.children.splice(idx, 1);
  store.completions = store.completions.filter((c) => c.childId !== id);
  store.redemptions = store.redemptions.filter((r) => r.childId !== id);
  store.transactions = store.transactions.filter((t) => t.childId !== id);
  store.tasks.forEach((t) => {
    if (Array.isArray(t.assignedTo)) t.assignedTo = t.assignedTo.filter((c) => c !== id);
  });
  if (store.settings.activeChildId === id) store.settings.activeChildId = store.children[0]?.id || null;
  commit("child:remove");
}

/* ---------- Eigene PIN je Kind (Komfortschutz, siehe modules/eltern.js) ---------- */

export function childHasPin(id) {
  return Boolean(childById(id)?.pinHash);
}

export async function verifyChildPin(id, pin) {
  const child = childById(id);
  if (!child?.pinHash) return true;
  const hash = await hashPin(`child:${id}`, String(pin || ""));
  return hash === child.pinHash;
}

/* currentPin nur nötig, wenn das Kind schon eine PIN hat (Eltern können sie in ihrem
   Bereich jederzeit ohne aktuelle PIN zurücksetzen — siehe removeChildPin). */
export async function setChildPin(id, pin, currentPin = null) {
  const child = childById(id);
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  const clean = String(pin || "").trim();
  if (clean && !validatePinFormat(clean)) throw new Error("Die PIN besteht aus 4 bis 6 Ziffern.");
  if (child.pinHash) {
    const ok = await verifyChildPin(id, currentPin);
    if (!ok) throw new Error("Die aktuelle PIN stimmt nicht.");
  }
  child.pinHash = clean ? await hashPin(`child:${id}`, clean) : null;
  commit("child:pin");
}

export function removeChildPin(id) {
  const child = childById(id);
  if (!child) return;
  child.pinHash = null;
  commit("child:pin");
}
