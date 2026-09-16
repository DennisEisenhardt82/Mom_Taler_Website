/* Profil: Rang, Abzeichen, Rekorde, Profilwechsel. */

import { getStore, subscribe, activeChild } from "../modules/state.js";
import { setActiveChild } from "../modules/kinder.js";
import { levelInfo, effectiveStreak, achievementProgress } from "../modules/gamification.js";
import { progressBar, toast } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber, formatDate } from "../modules/utils.js";

function render() {
  const root = qs("[data-profile]");
  const child = activeChild();
  if (!root || !child) return;
  const store = getStore();
  const lvl = levelInfo(child.xp);
  const badges = achievementProgress(child);
  const earned = badges.filter((b) => b.earned);

  root.innerHTML = `
    <section class="hero-card" style="--child-color:${child.color}">
      <span class="hero-card__avatar" aria-hidden="true">${child.avatar}</span>
      <h1 class="page-title">${escapeHtml(child.name)}</h1>
      <p class="hero-card__rank">Level ${lvl.level} · ${escapeHtml(lvl.rank)}</p>
      ${progressBar(lvl.pct, { label: "Fortschritt zum nächsten Level" })}
      <p class="card__hint">${formatNumber(lvl.remaining)} XP bis Level ${lvl.level + 1} · Mitglied seit ${formatDate(child.createdAt)}</p>
    </section>

    <div class="stat-row stat-row--4">
      <div class="card stat"><p class="stat__label">Schatz</p><p class="stat__value">${formatNumber(child.balance)}</p></div>
      <div class="card stat"><p class="stat__label">Streak</p><p class="stat__value">🔥 ${effectiveStreak(child)}</p></div>
      <div class="card stat"><p class="stat__label">Abzeichen</p><p class="stat__value">${earned.length} / ${badges.length}</p></div>
      <div class="card stat"><p class="stat__label">XP</p><p class="stat__value">${formatNumber(child.xp)}</p></div>
    </div>

    <section class="section" aria-labelledby="badges-title">
      <div class="section__head">
        <h2 class="section__title" id="badges-title">Abzeichen</h2>
      </div>
      <ul class="badge-grid">
        ${badges.map((b) => `<li class="badge ${b.earned ? "is-earned" : "is-locked"}">
          <span class="badge__icon" aria-hidden="true">${b.icon}</span>
          <span class="badge__title">${escapeHtml(b.title)}</span>
          <span class="badge__desc">${escapeHtml(b.description)}</span>
          ${b.earned ? '<span class="badge__state">Erreicht</span>' : `${progressBar(b.pct, { label: `Fortschritt: ${b.title}`, small: true })}<span class="badge__state">${formatNumber(b.value)} / ${formatNumber(b.goal)}</span>`}
        </li>`).join("")}
      </ul>
    </section>

    <section class="card" aria-labelledby="records-title">
      <h2 class="card__title" id="records-title">Persönliche Rekorde</h2>
      <dl class="facts">
        <div><dt>Bester Tag</dt><dd>${formatNumber(child.records.bestDay || 0)} Momtaler${child.records.bestDayDate ? ` (${child.records.bestDayDate.split("-").reverse().join(".")})` : ""}</dd></div>
        <div><dt>Längster Streak</dt><dd>${child.streak.best} Tage</dd></div>
        <div><dt>Höchster Schatz</dt><dd>${formatNumber(child.records.maxBalance || child.balance)} Momtaler</dd></div>
        <div><dt>Insgesamt verdient</dt><dd>${formatNumber(child.earnedTotal)} Momtaler</dd></div>
      </dl>
    </section>

    ${store.children.length > 1 ? `
    <section class="section" aria-labelledby="switch-title">
      <div class="section__head"><h2 class="section__title" id="switch-title">Profil wechseln</h2></div>
      <div class="profile-grid profile-grid--small">
        ${store.children.map((c) => `<button type="button" class="profile-tile ${c.id === child.id ? "is-active" : ""}" data-pick="${c.id}" style="--child-color:${c.color}" ${c.id === child.id ? 'aria-current="true"' : ""}>
          <span class="profile-tile__avatar" aria-hidden="true">${c.avatar}</span>
          <span class="profile-tile__name">${escapeHtml(c.name)}</span>
          <span class="profile-tile__meta">${formatNumber(c.balance)} Momtaler</span>
        </button>`).join("")}
      </div>
    </section>` : ""}`;

  qsa("[data-pick]", root).forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.pick === child.id) return;
    setActiveChild(b.dataset.pick);
    toast(`Jetzt unterwegs als ${activeChild().name}`, { icon: activeChild().avatar });
  }));
}

export async function init() {
  render();
  subscribe(() => render());
}
