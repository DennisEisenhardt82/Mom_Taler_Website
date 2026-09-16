/* Quest-Logik: Sichtbarkeit, Tages-/Wochenregeln, Einreichen + Eltern-Freigabe.
   Ein Kind "erledigt" eine Quest zunächst nur als Einreichung (status "pending").
   Erst wenn ein Elternteil sie am Gildenschalter bestätigt, werden Momtaler und
   XP gebucht — sonst könnten Kinder sich Quests einfach selbst gutschreiben. */

import { getStore, commit, childById, taskById } from "./state.js";
import { book } from "./transaktionen.js";
import { addXp, touchStreak, checkAchievements } from "./gamification.js";
import { uid, dayKey, weekKey } from "./utils.js";

export const RECURRENCE = { daily: "Täglich", weekly: "Wöchentlich", once: "Einmalig" };
export const DIFFICULTY = { 1: "Leicht", 2: "Mittel", 3: "Schwer" };

export function isAssigned(task, childId) {
  return task.assignedTo === "all" || (Array.isArray(task.assignedTo) && task.assignedTo.includes(childId));
}

/* Einreichungen dieser Quest im aktuellen Zeitfenster (Tag / Woche / überhaupt).
   Abgelehnte Einreichungen zählen nicht mehr mit — die Quest ist dann wieder offen. */
export function completionsInPeriod(task, childId, date = new Date()) {
  const store = getStore();
  const day = dayKey(date);
  const week = weekKey(date);
  return store.completions.filter((c) => {
    if (c.taskId !== task.id || c.childId !== childId || c.status === "rejected") return false;
    if (task.recurrence === "daily") return c.day === day;
    if (task.recurrence === "weekly") return c.week === week;
    return true;
  });
}

export function taskStatus(task, childId) {
  const active = completionsInPeriod(task, childId);
  const pending = active.find((c) => c.status === "pending");
  const approved = active.find((c) => c.status === "approved");
  if (approved) {
    return { state: "done", doneAt: approved.timestamp, label: task.recurrence === "daily" ? "heute erledigt" : task.recurrence === "weekly" ? "diese Woche erledigt" : "erledigt", done: true };
  }
  if (pending) {
    return { state: "pending", doneAt: pending.timestamp, label: "wartet auf Bestätigung", done: false };
  }
  return { state: "open", doneAt: null, label: "", done: false };
}

export function tasksFor(childId) {
  const store = getStore();
  return store.tasks
    .filter((t) => t.active && isAssigned(t, childId))
    .map((t) => ({ ...t, status: taskStatus(t, childId) }));
}

/* Einreichen: prüft Doppel-Einreichung, legt eine Erledigung mit status "pending" an.
   Momtaler/XP werden hier NOCH NICHT gebucht — das passiert erst bei approveCompletion(). */
export function submitCompletion(taskId, childId, date = new Date()) {
  const task = taskById(taskId);
  const child = childById(childId);
  if (!task) throw new Error("Diese Quest gibt es nicht mehr.");
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  if (!task.active) throw new Error("Diese Quest ist gerade nicht aktiv.");
  if (!isAssigned(task, childId)) throw new Error("Diese Quest ist nicht für dich.");
  const status = taskStatus(task, childId);
  if (status.state !== "open") {
    const when = task.recurrence === "daily" ? "heute" : task.recurrence === "weekly" ? "diese Woche" : "bereits";
    throw new Error(status.state === "pending" ? `Diese Quest wartet ${when} schon auf Bestätigung.` : `Diese Quest hast du ${when} schon erledigt.`);
  }

  const store = getStore();
  const completion = {
    id: uid("cp"),
    taskId,
    childId,
    status: "pending",
    timestamp: date.toISOString(),
    day: dayKey(date),
    week: weekKey(date),
    reward: task.reward,
    xp: task.xp,
    seenByChild: true,
  };
  store.completions.push(completion);
  commit("task:submit");
  return { task, completion };
}

/* Freigeben (Eltern): jetzt erst werden Momtaler/XP gebucht, Streak/Abzeichen geprüft. */
export function approveCompletion(completionId) {
  const store = getStore();
  const completion = store.completions.find((c) => c.id === completionId);
  if (!completion) throw new Error("Diese Einreichung gibt es nicht mehr.");
  if (completion.status !== "pending") throw new Error("Diese Einreichung wurde bereits bearbeitet.");
  const task = taskById(completion.taskId);
  const child = childById(completion.childId);
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");

  const date = new Date();
  completion.status = "approved";
  completion.approvedAt = date.toISOString();
  completion.seenByChild = false;

  const tx = completion.reward > 0
    ? book({ childId: completion.childId, type: "earn", amount: completion.reward, reason: task?.title || "Quest", refId: completion.taskId, date })
    : null;
  const level = addXp(child, completion.xp || 0);
  const streak = touchStreak(child, date);
  const achievements = checkAchievements(child);
  commit("task:approve");
  return { task, completion, tx, level, streak, achievements, balance: child.balance };
}

/* Ablehnen (Eltern): keine Buchung, die Quest wird wieder verfügbar. */
export function rejectCompletion(completionId, reason = "") {
  const store = getStore();
  const completion = store.completions.find((c) => c.id === completionId);
  if (!completion) throw new Error("Diese Einreichung gibt es nicht mehr.");
  if (completion.status !== "pending") throw new Error("Diese Einreichung wurde bereits bearbeitet.");
  completion.status = "rejected";
  completion.rejectedAt = new Date().toISOString();
  completion.rejectReason = String(reason || "").trim().slice(0, 200);
  completion.seenByChild = false;
  commit("task:reject");
  return completion;
}

/* Bereits gebuchte Erledigung zurücknehmen (Eltern-Korrektur): Buchung wird gegengebucht. */
export function undoCompletion(completionId) {
  const store = getStore();
  const idx = store.completions.findIndex((c) => c.id === completionId);
  if (idx < 0) throw new Error("Erledigung nicht gefunden.");
  const c = store.completions[idx];
  const child = childById(c.childId);
  const task = taskById(c.taskId);
  if (child && c.status === "approved") {
    if (c.reward > 0) book({ childId: c.childId, type: "adjust", amount: -c.reward, reason: `Zurückgenommen: ${task?.title || "Quest"}`, refId: c.taskId });
    child.xp = Math.max(0, child.xp - (c.xp || 0));
  }
  store.completions.splice(idx, 1);
  commit("task:undo");
}

export function pendingCompletions(childId = null) {
  return getStore().completions
    .filter((c) => c.status === "pending" && (!childId || c.childId === childId))
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
}

export function decidedCompletions({ limit = 20 } = {}) {
  return getStore().completions
    .filter((c) => c.status === "approved" || c.status === "rejected")
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

/* Für ein Kind kürzlich entschiedene, noch nicht gesehene Einreichungen (Dashboard-Hinweis). */
export function unseenDecisions(childId) {
  return getStore().completions.filter((c) => c.childId === childId && c.seenByChild === false);
}

export function markDecisionsSeen(childId) {
  let changed = false;
  getStore().completions.forEach((c) => {
    if (c.childId === childId && c.seenByChild === false) {
      c.seenByChild = true;
      changed = true;
    }
  });
  if (changed) commit("task:seen");
}

export function todayCompletions(childId) {
  const day = dayKey();
  return getStore().completions.filter((c) => c.childId === childId && c.day === day && c.status !== "rejected");
}

export function weekCompletions(childId) {
  const week = weekKey();
  return getStore().completions.filter((c) => c.childId === childId && c.week === week && c.status !== "rejected");
}
