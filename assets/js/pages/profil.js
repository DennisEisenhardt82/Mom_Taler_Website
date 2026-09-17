/* Profil: Rang, Abzeichen, Rekorde, Profilwechsel, eigene PIN. */

import { getStore, subscribe, activeChild } from "../modules/state.js";
import { setActiveChild, logoutChild, childHasPin, verifyChildPin, setChildPin } from "../modules/kinder.js";
import { levelInfo, effectiveStreak, achievementProgress } from "../modules/gamification.js";
import { progressBar, toast, openModal, confirmDialog } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber, formatDate, html } from "../modules/utils.js";
import { pageHref } from "../modules/shell.js";

function render() {
  const root = qs("[data-profile]");
  const child = activeChild();
  if (!root || !child) return;
  const store = getStore();
  const lvl = levelInfo(child.xp);
  const badges = achievementProgress(child);
  const earned = badges.filter((b) => b.earned);
  const hasPin = childHasPin(child.id);

  root.innerHTML = `
    <div class="profile-top">
      <div class="profile-top__main">
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
      </div>

      <aside class="trophy-wall" aria-labelledby="trophy-title">
        <h2 class="trophy-wall__title" id="trophy-title">Trophäenwand</h2>
        ${earned.length ? `<ul class="trophy-wall__grid">
          ${earned.map((b) => `<li class="trophy" title="${escapeHtml(b.title)}">
            <span class="trophy__icon" aria-hidden="true">${b.icon}</span>
            <span class="sr-only">${escapeHtml(b.title)}</span>
          </li>`).join("")}
        </ul>` : `<p class="trophy-wall__empty">Noch leer. Schließ deine erste Quest ab, um die erste Trophäe aufzuhängen!</p>`}
      </aside>
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

    <section class="card" aria-labelledby="pin-title">
      <h2 class="card__title" id="pin-title">Meine PIN</h2>
      <p class="card__hint">${hasPin ? "Deine PIN schützt dein Profil, wenn jemand anderes dein Gerät benutzt." : "Noch keine PIN gesetzt. Leg eine fest, damit nur du dein Profil öffnen kannst."}</p>
      <button type="button" class="btn btn--ghost" data-manage-pin>${hasPin ? "PIN ändern" : "PIN festlegen"}</button>
    </section>

    ${store.children.length > 1 ? `
    <section class="section" aria-labelledby="switch-title">
      <div class="section__head"><h2 class="section__title" id="switch-title">Profil wechseln</h2></div>
      <div class="profile-grid profile-grid--small">
        ${store.children.map((c) => `<button type="button" class="profile-tile ${c.id === child.id ? "is-active" : ""}" data-pick="${c.id}" style="--child-color:${c.color}" ${c.id === child.id ? 'aria-current="true"' : ""}>
          <span class="profile-tile__avatar" aria-hidden="true">${c.avatar}</span>
          <span class="profile-tile__name">${escapeHtml(c.name)}</span>
          <span class="profile-tile__meta">${formatNumber(c.balance)} Momtaler${childHasPin(c.id) ? " · 🔒" : ""}</span>
        </button>`).join("")}
      </div>
    </section>` : ""}

    <button type="button" class="btn btn--ghost btn--lg" data-logout>Abmelden</button>`;

  qs("[data-manage-pin]", root).addEventListener("click", () => openPinForm(child, hasPin));
  qsa("[data-pick]", root).forEach((b) => b.addEventListener("click", () => switchTo(b.dataset.pick, child.id)));
  qs("[data-logout]", root).addEventListener("click", async () => {
    const ok = await confirmDialog({
      title: "Abmelden?",
      text: `${child.name} wird abgemeldet. Zurück geht es über die Anmeldung auf der Startseite.`,
      confirmLabel: "Abmelden",
    });
    if (!ok) return;
    logoutChild();
    window.location.href = pageHref("index");
  });
}

async function switchTo(targetId, currentId) {
  if (targetId === currentId) return;
  if (!childHasPin(targetId)) {
    doSwitch(targetId);
    return;
  }
  const store = getStore();
  const target = store.children.find((c) => c.id === targetId);
  const box = html(`<div>
    <form class="form" data-switch-pin novalidate>
      <div class="field"><label for="switch-pin">PIN von ${escapeHtml(target.name)}</label><input id="switch-pin" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" required></div>
      <p class="form__error" data-error role="alert" hidden></p>
      <button type="submit" class="btn btn--primary btn--lg">Öffnen</button>
    </form>
  </div>`);
  const dlg = openModal(box, { title: `${target.avatar} ${target.name}` });
  const form = qs("form", box);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await verifyChildPin(targetId, new FormData(form).get("pin"));
    if (ok) {
      dlg.close();
      doSwitch(targetId);
    } else {
      const err = qs("[data-error]", form);
      err.textContent = "Die PIN stimmt nicht.";
      err.hidden = false;
    }
  });
  qs("#switch-pin", form).focus();
}

function doSwitch(id) {
  setActiveChild(id);
  const child = activeChild();
  toast(`Jetzt unterwegs als ${child.name}`, { icon: child.avatar });
}

function openPinForm(child, hasPin) {
  const box = html(`<div>
    <form class="form" data-pin-form novalidate>
      ${hasPin ? `<div class="field"><label for="pin-current">Aktuelle PIN</label><input id="pin-current" name="current" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>` : ""}
      <div class="field"><label for="pin-new">Neue PIN <small>(4 bis 6 Ziffern, leer = entfernen)</small></label><input id="pin-new" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div>
      <p class="form__error" data-error role="alert" hidden></p>
      <div class="modal__actions"><button type="submit" class="btn btn--primary">Speichern</button></div>
    </form>
  </div>`);
  const dlg = openModal(box, { title: "Meine PIN" });
  const form = qs("form", box);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(form);
    try {
      await setChildPin(child.id, d.get("pin"), d.get("current"));
      toast(d.get("pin") ? "PIN gespeichert" : "PIN entfernt", { type: "success", icon: "🔐" });
      dlg.close();
      render();
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });
}

export async function init() {
  render();
  subscribe(() => { if (!document.querySelector("dialog[open]")) render(); });
}
