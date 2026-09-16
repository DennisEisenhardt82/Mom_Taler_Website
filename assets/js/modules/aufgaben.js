/* Quest-Logik: Sichtbarkeit, Tages-/Wochenregeln, Erledigen mit Gutschrift. */

import { getStore, commit, childById, taskById } from "./state.js";
import { book } from "./transaktionen.js";
import { addXp, touchStreak, checkAchievements } from "./gamification.js";
import { uid, dayKey, weekKey } from "./utils.js";

export const RECURRENCE = { daily: "Täglich", weekly: "Wöchentlich", once: "Einmalig" };
export const DIFFICULTY = { 1: "Leicht", 2: "Mittel", 3: "Schwer" };

export function isAssigned(task, childId) {
  return task.assignedTo === "all" || (Array.isArray(task.assignedTo) && task.assignedTo.includes(childId));
}

/* Erledigungen dieser Quest im aktuellen Zeitfenster (Tag / Woche / überhaupt) */
export function completionsInPeriod(task, childId, date = new Date()) {
  const store = getStore();
  const day = dayKey(date);
  const week = weekKey(date);
  return store.completions.filter((c) => {
    if (c.taskId !== task.id || c.childId !== childId) return false;
    if (task.recurrence === "daily") return c.day === day;
    if (task.recurrence === "weekly") return c.week === week;
    return true;
  });
}

export function taskStatus(task, childId) {
  const done = completionsInPeriod(task, childId);
  return {
    done: done.length > 0,
    doneAt: done[0]?.timestamp || null,
    label: task.recurrence === "daily" ? "heute erledigt" : task.recurrence === "weekly" ? "diese Woche erledigt" : "erledigt",
  };
}

export function tasksFor(childId) {
  const store = getStore();
  return store.tasks
    .filter((t) => t.active && isAssigned(t, childId))
    .map((t) => ({ ...t, status: taskStatus(t, childId) }));
}

/* Erledigen: prüft Doppelabrechnung, bucht Momtaler + XP, aktualisiert Streak und Abzeichen. */
export function completeTask(taskId, childId, date = new Date()) {
  const task = taskById(taskId);
  const child = childById(childId);
  if (!task) throw new Error("Diese Quest gibt es nicht mehr.");
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  if (!task.active) throw new Error("Diese Quest ist gerade nicht aktiv.");
  if (!isAssigned(task, childId)) throw new Error("Diese Quest ist nicht für dich.");
  if (completionsInPeriod(task, childId, date).length > 0) {
    const when = task.recurrence === "daily" ? "heute" : task.recurrence === "weekly" ? "diese Woche" : "bereits";
    throw new Error(`Diese Quest hast du ${when} schon erledigt.`);
  }

  const store = getStore();
  store.completions.push({
    id: uid("cp"),
    taskId,
    childId,
    timestamp: date.toISOString(),
    day: dayKey(date),
    week: weekKey(date),
    reward: task.reward,
    xp: task.xp,
  });
  const tx = task.reward > 0
    ? book({ childId, type: "earn", amount: task.reward, reason: task.title, refId: taskId, date })
    : null;
  const level = addXp(child, task.xp);
  const streak = touchStreak(child, date);
  const achievements = checkAchievements(child);
  commit("task:complete");
  return { task, tx, level, streak, achievements, balance: child.balance };
}

/* Erledigung zurücknehmen (Eltern): Buchung wird gegengebucht, XP abgezogen. */
export function undoCompletion(completionId) {
  const store = getStore();
  const idx = store.completions.findIndex((c) => c.id === completionId);
  if (idx < 0) throw new Error("Erledigung nicht gefunden.");
  const c = store.completions[idx];
  const child = childById(c.childId);
  const task = taskById(c.taskId);
  if (child) {
    if (c.reward > 0) book({ childId: c.childId, type: "adjust", amount: -c.reward, reason: `Zurückgenommen: ${task?.title || "Quest"}`, refId: c.taskId });
    child.xp = Math.max(0, child.xp - (c.xp || 0));
  }
  store.completions.splice(idx, 1);
  commit("task:undo");
}

export function todayCompletions(childId) {
  const day = dayKey();
  return getStore().completions.filter((c) => c.childId === childId && c.day === day);
}

export function weekCompletions(childId) {
  const week = weekKey();
  return getStore().completions.filter((c) => c.childId === childId && c.week === week);
}
