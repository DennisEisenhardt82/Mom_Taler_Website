/* Questbrett: Filter, Sortierung, Liste. */

import { getStore, subscribe, activeChild } from "../modules/state.js";
import { tasksFor } from "../modules/aufgaben.js";
import { questCard, bindQuestActions } from "../modules/questkarte.js";
import { emptyState } from "../modules/ui.js";
import { qs, qsa, escapeHtml } from "../modules/utils.js";

const filter = { category: "all", status: "open", recurrence: "all", sort: "reward" };

function renderFilters() {
  const root = qs("[data-filters]");
  if (!root) return;
  const cats = getStore().settings.categories;
  root.innerHTML = `
    <div class="filters">
      <div class="segmented" role="group" aria-label="Status">
        ${[["open", "Offen"], ["pending", "Wartet"], ["done", "Erledigt"], ["all", "Alle"]].map(([v, l]) => `<button type="button" class="segmented__btn ${filter.status === v ? "is-active" : ""}" data-filter="status" data-value="${v}" aria-pressed="${filter.status === v}">${l}</button>`).join("")}
      </div>
      <div class="chips" role="group" aria-label="Kategorie">
        <button type="button" class="chip chip--filter ${filter.category === "all" ? "is-active" : ""}" data-filter="category" data-value="all" aria-pressed="${filter.category === "all"}">Alle</button>
        ${Object.entries(cats).map(([k, c]) => `<button type="button" class="chip chip--filter ${filter.category === k ? "is-active" : ""}" data-filter="category" data-value="${k}" aria-pressed="${filter.category === k}">${c.icon} ${escapeHtml(c.label)}</button>`).join("")}
      </div>
      <div class="filters__row">
        <label class="select"><span>Art</span>
          <select data-filter="recurrence">
            <option value="all" ${filter.recurrence === "all" ? "selected" : ""}>Alle</option>
            <option value="daily" ${filter.recurrence === "daily" ? "selected" : ""}>Täglich</option>
            <option value="weekly" ${filter.recurrence === "weekly" ? "selected" : ""}>Wöchentlich</option>
            <option value="once" ${filter.recurrence === "once" ? "selected" : ""}>Einmalig</option>
          </select></label>
        <label class="select"><span>Sortieren</span>
          <select data-filter="sort">
            <option value="reward" ${filter.sort === "reward" ? "selected" : ""}>Belohnung</option>
            <option value="difficulty" ${filter.sort === "difficulty" ? "selected" : ""}>Schwierigkeit</option>
            <option value="title" ${filter.sort === "title" ? "selected" : ""}>Name</option>
          </select></label>
      </div>
    </div>`;
  qsa("button[data-filter]", root).forEach((b) => b.addEventListener("click", () => {
    filter[b.dataset.filter] = b.dataset.value;
    renderFilters();
    renderList();
  }));
  qsa("select[data-filter]", root).forEach((s) => s.addEventListener("change", () => {
    filter[s.dataset.filter] = s.value;
    renderList();
  }));
}

function renderList() {
  const root = qs("[data-quests]");
  const child = activeChild();
  if (!root || !child) return;
  let list = tasksFor(child.id);
  if (filter.status === "open") list = list.filter((t) => t.status.state === "open");
  if (filter.status === "pending") list = list.filter((t) => t.status.state === "pending");
  if (filter.status === "done") list = list.filter((t) => t.status.state === "done");
  if (filter.category !== "all") list = list.filter((t) => t.category === filter.category);
  if (filter.recurrence !== "all") list = list.filter((t) => t.recurrence === filter.recurrence);
  const sorters = {
    reward: (a, b) => b.reward - a.reward,
    difficulty: (a, b) => b.difficulty - a.difficulty || b.reward - a.reward,
    title: (a, b) => a.title.localeCompare(b.title, "de"),
  };
  list.sort(sorters[filter.sort] || sorters.reward);

  const counter = qs("[data-count]");
  if (counter) counter.textContent = `${list.length} ${list.length === 1 ? "Quest" : "Quests"}`;

  root.innerHTML = list.length
    ? list.map((t) => questCard(t)).join("")
    : emptyState({
      icon: filter.status === "open" ? "🏆" : "📜",
      title: filter.status === "open" ? "Keine offenen Quests" : "Nichts gefunden",
      text: filter.status === "open" ? "Alles erledigt oder anders gefiltert. Schau später wieder vorbei." : "Probier einen anderen Filter.",
    });
}

export async function init() {
  renderFilters();
  renderList();
  bindQuestActions(qs("[data-quests]"));
  subscribe(() => renderList());
}
