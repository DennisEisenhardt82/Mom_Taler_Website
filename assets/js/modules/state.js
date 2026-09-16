/* Zentraler App-State. Module ändern den Store und rufen commit() auf;
   commit() speichert und benachrichtigt alle Abonnenten (UI-Updates). */

import { save, isPersistent } from "./storage.js";

let store = null;
const listeners = new Set();

export function getStore() {
  return store;
}

export function setStore(next) {
  store = next;
}

export function commit(topic = "change") {
  if (!store) return false;
  const ok = save(store);
  listeners.forEach((fn) => {
    try { fn(store, topic); } catch { /* ein kaputter Listener soll die anderen nicht stoppen */ }
  });
  return ok;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function storageWarning() {
  return isPersistent() ? null : "Speichern ist in diesem Browser nicht möglich. Änderungen gehen beim Schließen verloren.";
}

/* Bequeme Zugriffe */
export function activeChild() {
  if (!store || !store.settings.activeChildId) return null;
  return store.children.find((c) => c.id === store.settings.activeChildId) || null;
}

export function childById(id) {
  return store?.children.find((c) => c.id === id) || null;
}

export function taskById(id) {
  return store?.tasks.find((t) => t.id === id) || null;
}

export function rewardById(id) {
  return store?.rewards.find((r) => r.id === id) || null;
}

export function categoryInfo(key) {
  return store?.settings.categories?.[key] || { label: key || "Sonstiges", icon: "✨" };
}
