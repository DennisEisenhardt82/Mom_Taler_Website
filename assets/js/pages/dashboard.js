/* Dashboard: Schatzkammer-Karte, Gildenrang, heutige Quests, nächste Belohnung, Aktivität. */

import { getStore, subscribe, activeChild, taskById } from "../modules/state.js";
import { tasksFor, todayCompletions, weekCompletions, unseenDecisions, markDecisionsSeen } from "../modules/aufgaben.js";
import { nextReward } from "../modules/belohnungen.js";
import { levelInfo, effectiveStreak } from "../modules/gamification.js";
import { transactionsFor } from "../modules/transaktionen.js";
import { questCard, bindQuestActions } from "../modules/questkarte.js";
import { progressBar, emptyState, countUp, toast, coinBurst } from "../modules/ui.js";
import { qs, escapeHtml, formatNumber, formatSigned, greeting, formatTime, relativeDay } from "../modules/utils.js";

function render() {
  const root = qs("[data-dashboard]");
  const child = activeChild();
  if (!root || !child) return;
  const store = getStore();
  const lvl = levelInfo(child.xp);
  const tasks = tasksFor(child.id);
  const open = tasks.filter((t) => !t.status.done);
  const doneToday = todayCompletions(child.id).length;
  const doneWeek = weekCompletions(child.id).length;
  const streak = effectiveStreak(child);
  const next = nextReward(child.id);
  const recent = transactionsFor(child.id).slice(0, 6);
  const dayPct = Math.min(100, (doneToday / store.settings.dailyGoal) * 100);
  const weekPct = Math.min(100, (doneWeek / store.settings.weeklyGoal) * 100);

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">${greeting()}</p>
      <h1 class="page-title">${escapeHtml(child.name)}<span class="page-title__avatar" aria-hidden="true">${child.avatar}</span></h1>
    </header>

    <section class="treasure" data-treasure aria-labelledby="treasure-title">
      <div class="treasure__inner">
        <p class="treasure__label" id="treasure-title">Meine Momtaler</p>
        <p class="treasure__value"><span data-treasure-value>${formatNumber(child.balance)}</span></p>
        <p class="treasure__sub">
          ${streak >= 2 ? `<span class="pill pill--fire">🔥 ${streak} Tage in Folge</span>` : ""}
          <span class="pill">${formatNumber(child.earnedTotal)} insgesamt verdient</span>
        </p>
        <a class="btn btn--gold" href="belohnungen" data-cta="dashboard_btn_schatz_treasure">Zur Schatzkammer</a>
      </div>
    </section>

    <section class="card rank" aria-labelledby="rank-title">
      <div class="rank__head">
        <p class="card__title" id="rank-title">Level ${lvl.level} · ${escapeHtml(lvl.rank)}</p>
        <span class="rank__xp">${formatNumber(lvl.into)} / ${formatNumber(lvl.need)} XP</span>
      </div>
      ${progressBar(lvl.pct, { label: "Fortschritt zum nächsten Level" })}
      <p class="card__hint">Noch ${formatNumber(lvl.remaining)} XP bis Level ${lvl.level + 1}</p>
    </section>

    <section class="goals" aria-label="Ziele">
      <div class="card goal">
        <p class="card__title">Tagesziel</p>
        <p class="goal__value">${doneToday} <small>/ ${store.settings.dailyGoal} Quests</small></p>
        ${progressBar(dayPct, { label: "Tagesziel", small: true })}
        ${doneToday >= store.settings.dailyGoal ? '<p class="goal__done">Geschafft! 🎉</p>' : ""}
      </div>
      <div class="card goal">
        <p class="card__title">Wochenziel</p>
        <p class="goal__value">${doneWeek} <small>/ ${store.settings.weeklyGoal} Quests</small></p>
        ${progressBar(weekPct, { label: "Wochenziel", small: true })}
        ${doneWeek >= store.settings.weeklyGoal ? '<p class="goal__done">Geschafft! 🎉</p>' : ""}
      </div>
    </section>

    <section class="section" aria-labelledby="today-title">
      <div class="section__head section__head--row">
        <h2 class="section__title" id="today-title">Offene Quests</h2>
        <a class="link" href="aufgaben">Alle Quests</a>
      </div>
      <div class="quest-list" data-quests>
        ${open.length
          ? open.slice(0, 5).map((t) => questCard(t, { compact: true })).join("")
          : emptyState({ icon: "🏆", title: "Alles erledigt!", text: tasks.length ? "Für heute gibt es keine offenen Quests mehr." : "Am Gildenschalter können Eltern neue Quests aushängen." })}
        ${open.length > 5 ? `<a class="btn btn--ghost" href="aufgaben">${open.length - 5} weitere Quests</a>` : ""}
      </div>
    </section>

    ${next ? `
    <section class="card next-reward" aria-labelledby="next-title">
      <span class="next-reward__icon" aria-hidden="true">${next.icon}</span>
      <div class="next-reward__body">
        <p class="card__title" id="next-title">Nächste Belohnung: ${escapeHtml(next.title)}</p>
        <p class="card__hint">Noch ${formatNumber(next.missing)} Momtaler bis dahin</p>
        ${progressBar(next.pct, { label: `Fortschritt zu ${next.title}`, small: true })}
      </div>
    </section>` : ""}

    <section class="section" aria-labelledby="activity-title">
      <div class="section__head section__head--row">
        <h2 class="section__title" id="activity-title">Zuletzt</h2>
        <a class="link" href="verlauf">Ganzer Verlauf</a>
      </div>
      ${recent.length ? `<ul class="activity">${recent.map((t) => `
        <li class="activity__item">
          <span class="activity__amount ${t.amount > 0 ? "is-plus" : "is-minus"}">${formatSigned(t.amount)}</span>
          <span class="activity__reason">${escapeHtml(t.reason)}</span>
          <span class="activity__time">${relativeDay(t.day)}, ${formatTime(t.date)}</span>
        </li>`).join("")}</ul>` : emptyState({ icon: "📜", title: "Noch keine Einträge", text: "Erledige deine erste Quest, dann füllt sich der Verlauf." })}
    </section>`;

  const valueEl = qs("[data-treasure-value]", root);
  if (valueEl && lastBalance !== null && lastBalance !== child.balance) {
    countUp(valueEl, child.balance, { from: lastBalance });
  }
  lastBalance = child.balance;
}

let lastBalance = null;

/* Zeigt, was seit dem letzten Besuch am Gildenschalter entschieden wurde
   (bestätigt = Feier, abgelehnt = ruhiger Hinweis), dann als gesehen markieren. */
function announceDecisions(child) {
  const unseen = unseenDecisions(child.id);
  if (!unseen.length) return;
  const approved = unseen.filter((c) => c.status === "approved");
  const rejected = unseen.filter((c) => c.status === "rejected");

  approved.forEach((c, i) => {
    const task = taskById(c.taskId);
    setTimeout(() => {
      toast(`„${task?.title || "Quest"}“ wurde bestätigt: +${formatNumber(c.reward)} Momtaler!`, { type: "success", icon: "🪙" });
      coinBurst(qs("[data-treasure]") || document.body, qs("[data-treasure]"), 6);
    }, i * 700);
  });
  rejected.forEach((c, i) => {
    const task = taskById(c.taskId);
    setTimeout(() => {
      toast(`„${task?.title || "Quest"}“ wurde nicht bestätigt${c.rejectReason ? `: ${c.rejectReason}` : ". Du kannst es noch einmal versuchen."}`, { type: "info", icon: "🔁", timeout: 5000 });
    }, (approved.length + i) * 700);
  });

  markDecisionsSeen(child.id);
}

export async function init() {
  const root = qs("[data-dashboard]");
  if (!root) return;
  render();
  bindQuestActions(root);
  const child = activeChild();
  if (child) announceDecisions(child);
  subscribe(() => render());
}
