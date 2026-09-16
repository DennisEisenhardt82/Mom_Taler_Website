/* Verlauf: Kontoauszug nach Tagen gruppiert, mit Filter und Summen. */

import { subscribe, activeChild } from "../modules/state.js";
import { transactionsFor, TYPES } from "../modules/transaktionen.js";
import { emptyState } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber, formatSigned, formatTime, relativeDay, dayKey, shiftDay } from "../modules/utils.js";

const filter = { type: "all", range: "30" };

function renderFilters() {
  const root = qs("[data-filters]");
  if (!root) return;
  root.innerHTML = `<div class="filters">
    <div class="segmented" role="group" aria-label="Art">
      ${[["all", "Alles"], ["earn", "Verdient"], ["spend", "Ausgegeben"], ["adjust", "Angepasst"]].map(([v, l]) => `<button type="button" class="segmented__btn ${filter.type === v ? "is-active" : ""}" data-filter="type" data-value="${v}" aria-pressed="${filter.type === v}">${l}</button>`).join("")}
    </div>
    <div class="segmented" role="group" aria-label="Zeitraum">
      ${[["7", "7 Tage"], ["30", "30 Tage"], ["all", "Alles"]].map(([v, l]) => `<button type="button" class="segmented__btn ${filter.range === v ? "is-active" : ""}" data-filter="range" data-value="${v}" aria-pressed="${filter.range === v}">${l}</button>`).join("")}
    </div>
  </div>`;
  qsa("button[data-filter]", root).forEach((b) => b.addEventListener("click", () => {
    filter[b.dataset.filter] = b.dataset.value;
    renderFilters();
    renderList();
  }));
}

function renderList() {
  const root = qs("[data-history]");
  const child = activeChild();
  if (!root || !child) return;
  const from = filter.range === "all" ? null : shiftDay(dayKey(), -(Number(filter.range) - 1));
  const list = transactionsFor(child.id, { type: filter.type === "all" ? null : filter.type, from });
  const plus = list.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const minus = list.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);

  const groups = new Map();
  list.forEach((t) => {
    if (!groups.has(t.day)) groups.set(t.day, []);
    groups.get(t.day).push(t);
  });

  root.innerHTML = `
    <div class="stat-row">
      <div class="card stat"><p class="stat__label">Verdient</p><p class="stat__value is-plus">+${formatNumber(plus)}</p></div>
      <div class="card stat"><p class="stat__label">Ausgegeben</p><p class="stat__value is-minus">−${formatNumber(minus)}</p></div>
      <div class="card stat"><p class="stat__label">Kontostand</p><p class="stat__value">${formatNumber(child.balance)}</p></div>
    </div>
    ${list.length ? Array.from(groups.entries()).map(([day, items]) => `
      <section class="day-group" aria-label="${escapeHtml(relativeDay(day))}">
        <h2 class="day-group__title">${escapeHtml(relativeDay(day))}<span>${formatSigned(items.reduce((s, t) => s + t.amount, 0))}</span></h2>
        <ul class="activity">${items.map((t) => `
          <li class="activity__item">
            <span class="activity__amount ${t.amount > 0 ? "is-plus" : "is-minus"}">${formatSigned(t.amount)}</span>
            <span class="activity__reason">${escapeHtml(t.reason)}<small>${TYPES[t.type]}</small></span>
            <span class="activity__time">${formatTime(t.date)}</span>
          </li>`).join("")}</ul>
      </section>`).join("")
      : emptyState({ icon: "📜", title: "Keine Einträge", text: "In diesem Zeitraum gibt es nichts zu zeigen." })}`;
}

export async function init() {
  renderFilters();
  renderList();
  subscribe(() => renderList());
}
