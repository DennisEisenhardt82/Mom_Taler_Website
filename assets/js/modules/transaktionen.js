/* Jede Änderung am Momtaler-Konto läuft hier durch. Der Kontostand wird nie
   direkt gesetzt, sondern immer über eine Buchung verändert. */

import { getStore, childById } from "./state.js";
import { uid, dayKey } from "./utils.js";

export const TYPES = { earn: "Verdient", spend: "Ausgegeben", adjust: "Angepasst" };

/**
 * @param {object} p
 * @param {string} p.childId
 * @param {"earn"|"spend"|"adjust"} p.type
 * @param {number} p.amount  positiv = Gutschrift, negativ = Abbuchung
 * @param {string} p.reason
 * @param {string} [p.refId]
 */
export function book({ childId, type, amount, reason, refId = null, date = new Date() }) {
  const store = getStore();
  const child = childById(childId);
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value === 0) throw new Error("Der Betrag muss eine Zahl ungleich 0 sein.");
  if (!TYPES[type]) throw new Error("Unbekannte Buchungsart.");
  if (child.balance + value < 0) throw new Error("So viele Momtaler sind nicht da.");

  const tx = {
    id: uid("tx"),
    childId,
    type,
    amount: value,
    reason: String(reason || TYPES[type]).trim(),
    refId,
    date: date.toISOString(),
    day: dayKey(date),
  };
  store.transactions.push(tx);
  child.balance += value;
  if (value > 0) child.earnedTotal += value;
  else child.spentTotal += -value;
  if (child.balance > (child.records.maxBalance || 0)) child.records.maxBalance = child.balance;

  // Tagesrekord: Summe aller Gutschriften des Tages
  if (value > 0) {
    const todaySum = store.transactions
      .filter((t) => t.childId === childId && t.day === tx.day && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    if (todaySum > (child.records.bestDay || 0)) {
      child.records.bestDay = todaySum;
      child.records.bestDayDate = tx.day;
    }
  }
  return tx;
}

export function transactionsFor(childId, { type = null, from = null, to = null } = {}) {
  const store = getStore();
  return store.transactions
    .filter((t) => (!childId || t.childId === childId)
      && (!type || t.type === type)
      && (!from || t.day >= from)
      && (!to || t.day <= to))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* Guthaben aus den Buchungen neu berechnen (Reparaturfunktion für Eltern). */
export function recalculateBalance(childId) {
  const store = getStore();
  const child = childById(childId);
  if (!child) return 0;
  const sum = store.transactions.filter((t) => t.childId === childId).reduce((s, t) => s + t.amount, 0);
  child.balance = sum;
  return sum;
}
