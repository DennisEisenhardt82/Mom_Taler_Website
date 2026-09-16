/* Quest-Karte + Erledigen-Ablauf, geteilt von Dashboard und Questbrett. */

import { activeChild, categoryInfo } from "./state.js";
import { completeTask, tasksFor, RECURRENCE, DIFFICULTY } from "./aufgaben.js";
import { levelInfo } from "./gamification.js";
import { toast, coinBurst, levelUpOverlay, achievementOverlay, openModal } from "./ui.js";
import { escapeHtml, formatNumber, formatTime, qs, html } from "./utils.js";

export function questCard(task, { compact = false } = {}) {
  const cat = categoryInfo(task.category);
  const done = task.status?.done;
  const stars = "★".repeat(task.difficulty) + "☆".repeat(3 - task.difficulty);
  return `<article class="quest ${done ? "is-done" : ""} ${compact ? "quest--compact" : ""}" data-task="${task.id}">
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
      ${done
        ? `<span class="quest__done">✓ ${task.status.label}${task.status.doneAt ? ` · ${formatTime(task.status.doneAt)}` : ""}</span>`
        : `<button type="button" class="btn btn--primary btn--sm" data-complete="${task.id}" data-cta="quest_btn_erledigt_karte">Erledigt!</button>`}
    </div>
  </article>`;
}

/* Klick-Handler für alle Erledigen-Buttons innerhalb eines Containers */
export function bindQuestActions(root, { onDone } = {}) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-complete]");
    if (btn) {
      e.stopPropagation();
      await runComplete(btn);
      onDone?.();
      return;
    }
    const card = e.target.closest(".quest");
    if (card && !e.target.closest("button")) openQuestDetail(card.dataset.task, root, onDone);
  });
}

async function runComplete(btn) {
  const child = activeChild();
  if (!child) return;
  btn.disabled = true;
  try {
    const result = completeTask(btn.dataset.complete, child.id);
    const target = qs("[data-balance]")?.closest(".chip") || qs("[data-treasure]");
    coinBurst(btn, target, Math.min(12, 4 + Math.round(result.task.reward / 10)));
    toast(`+${formatNumber(result.task.reward)} Momtaler für „${result.task.title}“`, { type: "success", icon: "🪙" });
    if (result.level.levelUp) {
      setTimeout(() => levelUpOverlay({ to: result.level.to, rank: levelInfo(child.xp).rank }), 500);
    }
    if (result.achievements.length) {
      setTimeout(() => achievementOverlay(result.achievements), result.level.levelUp ? 900 : 500);
    }
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
      ${task.status?.done
        ? `<span class="quest__done">✓ ${task.status.label}</span>`
        : `<button type="button" class="btn btn--primary btn--lg" data-complete="${task.id}" data-cta="quest_btn_erledigt_detail">Erledigt!</button>`}
    </div>
  </div>`);
  const dlg = openModal(box, { title: task.title });
  const btn = qs("[data-complete]", box);
  if (btn) {
    btn.addEventListener("click", async () => {
      await runComplete(btn);
      dlg.close();
      onDone?.();
    });
  }
}
