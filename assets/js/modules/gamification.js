/* XP, Level (Gildenrang), Streaks, Abzeichen, Rekorde. */

import { getStore } from "./state.js";
import { dayKey, daysBetween } from "./utils.js";

const RANKS = ["Neuling", "Lehrling", "Helfer", "Kundschafter", "Abenteurer", "Held", "Champion", "Meister", "Großmeister", "Legende"];

/* Level n braucht insgesamt base * n * (n-1) / 2 XP: Level 2 = 100, Level 3 = 300, Level 4 = 600 ... */
function xpForLevel(level, base) {
  return (base * level * (level - 1)) / 2;
}

export function levelInfo(xp, base = getStore()?.settings.xpPerLevel || 100) {
  let level = 1;
  while (xpForLevel(level + 1, base) <= xp) level += 1;
  const start = xpForLevel(level, base);
  const next = xpForLevel(level + 1, base);
  const into = xp - start;
  const need = next - start;
  return {
    level,
    rank: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))],
    into,
    need,
    remaining: next - xp,
    pct: Math.round((into / need) * 100),
  };
}

export function addXp(child, amount) {
  const before = levelInfo(child.xp).level;
  child.xp += Math.max(0, Math.round(amount));
  const after = levelInfo(child.xp).level;
  return { levelUp: after > before, from: before, to: after };
}

/* Streak: mindestens eine Quest pro Tag. Aufruf bei jeder Erledigung. */
export function touchStreak(child, date = new Date()) {
  const today = dayKey(date);
  const s = child.streak;
  if (s.lastDate === today) return s.current;
  if (s.lastDate && daysBetween(s.lastDate, today) === 1) s.current += 1;
  else s.current = 1;
  s.lastDate = today;
  if (s.current > s.best) s.best = s.current;
  return s.current;
}

/* Ein verpasster Tag setzt den Streak zurück. Wird beim Laden geprüft, ohne zu speichern. */
export function effectiveStreak(child) {
  const s = child.streak;
  if (!s.lastDate) return 0;
  const gap = daysBetween(s.lastDate, dayKey());
  return gap <= 1 ? s.current : 0;
}

export function countsFor(child) {
  const store = getStore();
  const completions = store.completions.filter((c) => c.childId === child.id);
  const earlyCount = completions.filter((c) => new Date(c.timestamp).getHours() < 9).length;
  return {
    tasks: completions.length,
    earned: child.earnedTotal,
    streak: child.streak.best,
    rewards: store.redemptions.filter((r) => r.childId === child.id).length,
    balance: child.records.maxBalance || child.balance,
    early: earlyCount,
  };
}

/* Prüft alle Abzeichen und gibt die neu erreichten zurück. */
export function checkAchievements(child) {
  const store = getStore();
  const counts = countsFor(child);
  const fresh = [];
  for (const a of store.achievements) {
    if (child.achievements.includes(a.id)) continue;
    const value = counts[a.type] ?? 0;
    if (value >= a.goal) {
      child.achievements.push(a.id);
      fresh.push(a);
    }
  }
  return fresh;
}

export function achievementProgress(child) {
  const store = getStore();
  const counts = countsFor(child);
  return store.achievements.map((a) => {
    const value = counts[a.type] ?? 0;
    return {
      ...a,
      earned: child.achievements.includes(a.id),
      value: Math.min(value, a.goal),
      pct: Math.min(100, Math.round((value / a.goal) * 100)),
    };
  });
}
