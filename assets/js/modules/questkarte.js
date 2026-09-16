/* Quest-Karte + Einreichen-Ablauf, geteilt von Dashboard und Questbrett.
   Ein Tipp auf "Erledigt!" bucht noch keine Momtaler — die Quest geht in den
   Status "wartet auf Bestätigung", bis ein Elternteil sie am Gildenschalter
   freigibt (siehe modules/aufgaben.js). */

import { activeChild, categoryInfo } from "./state.js";
import { submitCompletion, tasksFor, RECURRENCE, DIFFICULTY } from "./aufgaben.js";
import { toast, openModal } from "./ui.js";
import { escapeHtml, formatNumber, formatTime, qs, html } from "./utils.js";

const STATE_BADGE = {
  pending: { icon: "⏳", label: "Wartet auf Bestätigung" },
  done: { icon: "✓", label: "" },
};

export function questCard(task, { compact = false } = {}) {
  const cat = categoryInfo(task.category);
  const { state, label, doneAt } = task.status;
  const stars = "★".repeat(task.difficulty) + "☆".repeat(3 - task.difficulty);
  return `<article class="quest quest--${state} ${compact ? "quest--compact" : ""}" data-task="${task.id}">
    <span class="quest__icon" aria-hidden="true">${task.icon}</span>
    <div class="quest__body">
      <h3 class="quest__title">${escapeHtml(task.title)}</h3>
      ${compact ? "" : `<p class="quest__desc">${escapeHtml(task.description)}</p>`}
      <p class="quest__meta">
        <span class="tag">${cat.icon} ${escapeHtml(cat.label)}</span>
        <span class="tag">${RECURRENCE[task.recurrence]}</span>
        <span class="tag" aria-label="Schwierigkeit: ${DIFFICULTY[task.difficulty]}"><span aria-hidden="true">${stars}</span></span>
      </p>
    </div>
    <div class="quest__side">
      <span class="quest__reward"><b>+${formatNumber(task.reward)}</b><small>Momtaler</small></span>
      ${state === "open"
        ? `<button type="button" class="btn btn--primary btn--sm" data-submit="${task.id}" data-cta="quest_btn_erledigt_karte">Erledigt!</button>`
        : state === "pending"
          ? `<span class="quest__pending">⏳ Wartet auf Bestätigung${doneAt ? ` · ${formatTime(doneAt)}` : ""}</span>`
          : `<span class="quest__done">✓ ${label}${doneAt ? ` · ${formatTime(doneAt)}` : ""}</span>`}
    </div>
  </article>`;
}

/* Klick-Handler für alle Erledigen-Buttons innerhalb eines Containers */
export function bindQuestActions(root, { onDone } = {}) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-submit]");
    if (btn) {
      e.stopPropagation();
      await runSubmit(btn);
      onDone?.();
      return;
    }
    const card = e.target.closest(".quest");
    if (card && !e.target.closest("button")) openQuestDetail(card.dataset.task, root, onDone);
  });
}

async function runSubmit(btn) {
  const child = activeChild();
  if (!child) return;
  btn.disabled = true;
  try {
    const result = submitCompletion(btn.dataset.submit, child.id);
    toast(`„${result.task.title}“ eingereicht — wartet auf Bestätigung von Mama oder Papa.`, { type: "info", icon: "⏳" });
  } catch (err) {
    toast(err.message, { type: "error", icon: "⚠️" });
    btn.disabled = false;
  }
}

export function openQuestDetail(taskId, root, onDone) {
  const child = activeChild();
  if (!child) return;
  const task = tasksFor(child.id).find((t) => t.id === taskId);
  if (!task) return;
  const cat = categoryInfo(task.category);
  const { state, label, doneAt } = task.status;
  const box = html(`<div class="quest-detail">
    <span class="quest-detail__icon" aria-hidden="true">${task.icon}</span>
    <p class="quest-detail__desc">${escapeHtml(task.description || "Keine Beschreibung.")}</p>
    <dl class="quest-detail__facts">
      <div><dt>Belohnung</dt><dd>+${formatNumber(task.reward)} Momtaler</dd></div>
      <div><dt>Erfahrung</dt><dd>+${formatNumber(task.xp)} XP</dd></div>
      <div><dt>Kategorie</dt><dd>${cat.icon} ${escapeHtml(cat.label)}</dd></div>
      <div><dt>Wiederholung</dt><dd>${RECURRENCE[task.recurrence]}</dd></div>
      <div><dt>Schwierigkeit</dt><dd>${DIFFICULTY[task.difficulty]}</dd></div>
    </dl>
    <div class="modal__actions">
      ${state === "open"
        ? `<button type="button" class="btn btn--primary btn--lg" data-submit="${task.id}" data-cta="quest_btn_erledigt_detail">Erledigt!</button>`
        : state === "pending"
          ? `<span class="quest__pending">⏳ Wartet auf Bestätigung${doneAt ? ` · ${formatTime(doneAt)}` : ""}</span>`
          : `<span class="quest__done">✓ ${label}</span>`}
    </div>
  </div>`);
  const dlg = openModal(box, { title: task.title });
  const btn = qs("[data-submit]", box);
  if (btn) {
    btn.addEventListener("click", async () => {
      await runSubmit(btn);
      dlg.close();
      onDone?.();
    });
  }
}
