/* Statistik: Kennzahlen, Diagramme, Top-Quests. */

import { subscribe, activeChild } from "../modules/state.js";
import { totals, dailySeries, weeklySeries, monthlySeries, balanceSeries, categoryBreakdown, topTasks } from "../modules/statistik.js";
import { barChart, lineChart, donutChart } from "../modules/charts.js";
import { emptyState } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber, dayKey, shiftDay } from "../modules/utils.js";

let period = "week";

function render() {
  const root = qs("[data-stats]");
  const child = activeChild();
  if (!root || !child) return;

  const ranges = {
    day: { label: "Heute", from: dayKey(), series: dailySeries(child.id, 7), seriesTitle: "Letzte 7 Tage" },
    week: { label: "Diese Woche", from: shiftDay(dayKey(), -6), series: weeklySeries(child.id, 8), seriesTitle: "Letzte 8 Wochen" },
    month: { label: "Dieser Monat", from: shiftDay(dayKey(), -29), series: monthlySeries(child.id, 6), seriesTitle: "Letzte 6 Monate" },
  };
  const r = ranges[period];
  const t = totals(child.id, { from: r.from });
  const all = totals(child.id);
  const cats = categoryBreakdown(child.id);
  const top = topTasks(child.id);

  root.innerHTML = `
    <div class="segmented segmented--wide" role="group" aria-label="Zeitraum">
      ${[["day", "Tag"], ["week", "Woche"], ["month", "Monat"]].map(([v, l]) => `<button type="button" class="segmented__btn ${period === v ? "is-active" : ""}" data-period="${v}" aria-pressed="${period === v}">${l}</button>`).join("")}
    </div>

    <p class="hint">${r.label}: gezählt ab ${r.from.split("-").reverse().join(".")}</p>
    <div class="stat-row stat-row--4">
      <div class="card stat"><p class="stat__label">Verdient</p><p class="stat__value is-plus">+${formatNumber(t.earned)}</p></div>
      <div class="card stat"><p class="stat__label">Ausgegeben</p><p class="stat__value is-minus">−${formatNumber(t.spent)}</p></div>
      <div class="card stat"><p class="stat__label">Quests</p><p class="stat__value">${formatNumber(t.tasks)}</p></div>
      <div class="card stat"><p class="stat__label">Belohnungen</p><p class="stat__value">${formatNumber(t.rewards)}</p></div>
    </div>

    ${all.tasks === 0 ? emptyState({ icon: "📊", title: "Noch keine Daten", text: "Sobald Quests erledigt sind, füllen sich die Diagramme." }) : `
    <section class="card" aria-labelledby="chart1">
      <h2 class="card__title" id="chart1">${r.seriesTitle}</h2>
      ${barChart(r.series.map((d) => ({ label: d.label, values: [d.earned, d.spent] })), { series: ["Verdient", "Ausgegeben"], title: `Momtaler ${r.seriesTitle}` })}
    </section>

    <section class="card" aria-labelledby="chart2">
      <h2 class="card__title" id="chart2">Kontostand, letzte 30 Tage</h2>
      ${lineChart(balanceSeries(child.id, 30), { title: "Kontostand der letzten 30 Tage" })}
    </section>

    <div class="grid-2">
      <section class="card" aria-labelledby="chart3">
        <h2 class="card__title" id="chart3">Quests nach Kategorie</h2>
        ${donutChart(cats.map((c) => ({ label: c.label, value: c.count, icon: c.icon })), { title: "Quests nach Kategorie" })}
      </section>
      <section class="card" aria-labelledby="top-title">
        <h2 class="card__title" id="top-title">Beliebteste Quests</h2>
        <ol class="toplist">${top.map((q) => `<li><span aria-hidden="true">${q.icon}</span><span class="toplist__title">${escapeHtml(q.title)}</span><span class="toplist__count">${q.count}×</span></li>`).join("")}</ol>
      </section>
    </div>

    <section class="card" aria-labelledby="records-title">
      <h2 class="card__title" id="records-title">Gesamt</h2>
      <dl class="facts">
        <div><dt>Verdient</dt><dd>${formatNumber(all.earned)}</dd></div>
        <div><dt>Ausgegeben</dt><dd>${formatNumber(all.spent)}</dd></div>
        <div><dt>Quests</dt><dd>${formatNumber(all.tasks)}</dd></div>
        <div><dt>Belohnungen</dt><dd>${formatNumber(all.rewards)}</dd></div>
        <div><dt>Bester Tag</dt><dd>${formatNumber(child.records.bestDay || 0)} Momtaler</dd></div>
        <div><dt>Längster Streak</dt><dd>${child.streak.best} Tage</dd></div>
      </dl>
    </section>`}`;

  qsa("[data-period]", root).forEach((b) => b.addEventListener("click", () => {
    period = b.dataset.period;
    render();
  }));
}

export async function init() {
  render();
  subscribe(() => render());
}
