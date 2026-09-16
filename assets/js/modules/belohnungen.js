/* Schatzkammer: Belohnungen prüfen und einlösen. */

import { getStore, commit, childById, rewardById } from "./state.js";
import { book } from "./transaktionen.js";
import { checkAchievements } from "./gamification.js";
import { uid, dayKey } from "./utils.js";

export function rewardsFor(childId) {
  const store = getStore();
  const child = childById(childId);
  const balance = child?.balance || 0;
  return store.rewards
    .filter((r) => r.active)
    .map((r) => ({
      ...r,
      affordable: balance >= r.cost,
      missing: Math.max(0, r.cost - balance),
      pct: r.cost > 0 ? Math.min(100, Math.round((balance / r.cost) * 100)) : 100,
    }))
    .sort((a, b) => a.cost - b.cost);
}

/* Die günstigste Belohnung, die noch nicht erreichbar ist (fürs Dashboard) */
export function nextReward(childId) {
  return rewardsFor(childId).find((r) => !r.affordable) || null;
}

export function redeemReward(rewardId, childId, date = new Date()) {
  const reward = rewardById(rewardId);
  const child = childById(childId);
  if (!reward) throw new Error("Diese Belohnung gibt es nicht mehr.");
  if (!child) throw new Error("Dieses Profil gibt es nicht mehr.");
  if (!reward.active) throw new Error("Diese Belohnung ist gerade nicht verfügbar.");
  if (child.balance < reward.cost) {
    throw new Error(`Dir fehlen noch ${reward.cost - child.balance} Momtaler für „${reward.title}“.`);
  }
  const store = getStore();
  const tx = reward.cost > 0
    ? book({ childId, type: "spend", amount: -reward.cost, reason: reward.title, refId: rewardId, date })
    : null;
  store.redemptions.push({
    id: uid("rd"),
    rewardId,
    childId,
    timestamp: date.toISOString(),
    day: dayKey(date),
    cost: reward.cost,
    title: reward.title,
    icon: reward.icon,
  });
  const achievements = checkAchievements(child);
  commit("reward:redeem");
  return { reward, tx, achievements, balance: child.balance };
}

export function redemptionsFor(childId) {
  return getStore().redemptions
    .filter((r) => r.childId === childId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
