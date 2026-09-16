/* Kleine Helfer, die überall gebraucht werden. */

const numberFormat = new Intl.NumberFormat("de-DE");
const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateLongFormat = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function formatNumber(n) {
  return numberFormat.format(Math.round(Number(n) || 0));
}

export function formatSigned(n) {
  const v = Math.round(Number(n) || 0);
  return (v > 0 ? "+" : v < 0 ? "−" : "") + numberFormat.format(Math.abs(v));
}

/* Lokaler Datumsschlüssel YYYY-MM-DD (nicht UTC, sonst kippt der Tag um 1 Uhr nachts). */
export function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* ISO-Kalenderwoche als Schlüssel YYYY-Www */
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthKey(date = new Date()) {
  return dayKey(date).slice(0, 7);
}

export function daysBetween(keyA, keyB) {
  const a = new Date(keyA + "T12:00:00");
  const b = new Date(keyB + "T12:00:00");
  return Math.round((b - a) / 86400000);
}

export function shiftDay(key, delta) {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function formatDate(iso) {
  return dateFormat.format(new Date(iso));
}

export function formatDateLong(iso) {
  return dateLongFormat.format(new Date(iso));
}

export function formatTime(iso) {
  return timeFormat.format(new Date(iso));
}

export function relativeDay(key) {
  const today = dayKey();
  if (key === today) return "Heute";
  if (key === shiftDay(today, -1)) return "Gestern";
  return dateLongFormat.format(new Date(key + "T12:00:00"));
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 17) return "Hallo";
  if (h < 22) return "Guten Abend";
  return "Gute Nacht";
}

export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/* HTML-String in ein Element umwandeln */
export function html(str) {
  const tpl = document.createElement("template");
  tpl.innerHTML = str.trim();
  return tpl.content.firstElementChild;
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || document.documentElement.dataset.motion === "reduce";
}

export function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
