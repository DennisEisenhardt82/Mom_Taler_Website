/* Aggregationen für Dashboard und Statistikseite. */

import { getStore, taskById } from "./state.js";
import { dayKey, shiftDay, weekKey, monthKey } from "./utils.js";

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

function txFor(childId) {
  return getStore().transactions.filter((t) => !childId || t.childId === childId);
}

export function totals(childId, { from = null, to = null } = {}) {
  const tx = txFor(childId).filter((t) => (!from || t.day >= from) && (!to || t.day <= to));
  const earned = tx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = tx.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const completions = getStore().completions.filter((c) => (!childId || c.childId === childId)
    && (!from || c.day >= from) && (!to || c.day <= to));
  const redemptions = getStore().redemptions.filter((r) => (!childId || r.childId === childId)
    && (!from || r.day >= from) && (!to || r.day <= to));
  return { earned, spent, tasks: completions.length, rewards: redemptions.length };
}

/* Zeitreihe der letzten n Tage: verdient / ausgegeben / Quests */
export function dailySeries(childId, days = 7) {
  const today = dayKey();
  const tx = txFor(childId);
  const comps = getStore().completions.filter((c) => !childId || c.childId === childId);
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = shiftDay(today, -i);
    const d = new Date(key + "T12:00:00");
    out.push({
      key,
      label: days <= 7 ? WEEKDAYS[d.getDay()] : String(d.getDate()),
      earned: tx.filter((t) => t.day === key && t.amount > 0).reduce((s, t) => s + t.amount, 0),
      spent: tx.filter((t) => t.day === key && t.amount < 0).reduce((s, t) => s - t.amount, 0),
      tasks: comps.filter((c) => c.day === key).length,
    });
  }
  return out;
}

/* Wochenreihe: letzte n Kalenderwochen */
export function weeklySeries(childId, weeks = 8) {
  const tx = txFor(childId);
  const comps = getStore().completions.filter((c) => !childId || c.childId === childId);
  const out = [];
  const cursor = new Date();
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    const key = weekKey(d);
    out.push({
      key,
      label: "KW " + key.slice(-2),
      earned: tx.filter((t) => weekKey(new Date(t.date)) === key && t.amount > 0).reduce((s, t) => s + t.amount, 0),
      spent: tx.filter((t) => weekKey(new Date(t.date)) === key && t.amount < 0).reduce((s, t) => s - t.amount, 0),
      tasks: comps.filter((c) => c.week === key).length,
    });
  }
  return out;
}

export function monthlySeries(childId, months = 6) {
  const tx = txFor(childId);
  const comps = getStore().completions.filter((c) => !childId || c.childId === childId);
  const out = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    out.push({
      key,
      label: d.toLocaleDateString("de-DE", { month: "short" }),
      earned: tx.filter((t) => t.day.startsWith(key) && t.amount > 0).reduce((s, t) => s + t.amount, 0),
      spent: tx.filter((t) => t.day.startsWith(key) && t.amount < 0).reduce((s, t) => s - t.amount, 0),
      tasks: comps.filter((c) => c.day.startsWith(key)).length,
    });
  }
  return out;
}

/* Kontostand-Verlauf über die letzten n Tage (Endstand je Tag) */
export function balanceSeries(childId, days = 30) {
  const tx = txFor(childId).sort((a, b) => (a.date < b.date ? -1 : 1));
  const today = dayKey();
  const start = shiftDay(today, -(days - 1));
  let running = tx.filter((t) => t.day < start).reduce((s, t) => s + t.amount, 0);
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = shiftDay(today, -i);
    running += tx.filter((t) => t.day === key).reduce((s, t) => s + t.amount, 0);
    out.push({ key, label: key.slice(8), value: running });
  }
  return out;
}

export function categoryBreakdown(childId) {
  const store = getStore();
  const comps = store.completions.filter((c) => !childId || c.childId === childId);
  const map = new Map();
  comps.forEach((c) => {
    const task = taskById(c.taskId);
    const cat = task?.category || "sonstiges";
    const info = store.settings.categories[cat] || { label: "Sonstiges", icon: "✨" };
    const entry = map.get(cat) || { key: cat, label: info.label, icon: info.icon, count: 0, earned: 0 };
    entry.count += 1;
    entry.earned += c.reward || 0;
    map.set(cat, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function topTasks(childId, limit = 5) {
  const store = getStore();
  const comps = store.completions.filter((c) => !childId || c.childId === childId);
  const map = new Map();
  comps.forEach((c) => {
    const task = taskById(c.taskId);
    const entry = map.get(c.taskId) || { id: c.taskId, title: task?.title || "Gelöschte Quest", icon: task?.icon || "❔", count: 0, earned: 0 };
    entry.count += 1;
    entry.earned += c.reward || 0;
    map.set(c.taskId, entry);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}
