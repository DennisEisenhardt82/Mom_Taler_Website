/* localStorage-Adapter. Jeder Zugriff ist abgesichert: im privaten Modus oder bei
   vollem Speicher läuft die App im Arbeitsspeicher weiter und meldet das. */

export const STORAGE_KEY = "momtaler.v1";

let memoryFallback = null;
let persistent = null;

export function isPersistent() {
  if (persistent !== null) return persistent;
  try {
    const probe = "__momtaler_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    persistent = true;
  } catch {
    persistent = false;
  }
  return persistent;
}

export function load() {
  if (!isPersistent()) return memoryFallback;
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("Kein Objekt");
    return parsed;
  } catch {
    // Kaputte Daten nicht löschen, sondern beiseitelegen: Eltern können sie noch exportieren.
    try { localStorage.setItem(STORAGE_KEY + ".broken", raw); } catch { /* egal */ }
    return { __broken: true };
  }
}

export function save(data) {
  memoryFallback = data;
  if (!isPersistent()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    persistent = false;
    return false;
  }
}

export function clear() {
  memoryFallback = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + ".broken");
  } catch { /* nichts zu tun */ }
}

export function loadBrokenRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY + ".broken");
  } catch {
    return null;
  }
}
