/* Startseite: Rollenwahl (Kind / Eltern) → Profil wählen → ggf. eigene PIN prüfen. */

import { getStore, subscribe } from "../modules/state.js";
import { setActiveChild, childHasPin, verifyChildPin } from "../modules/kinder.js";
import { levelInfo } from "../modules/gamification.js";
import { pageHref } from "../script.js";
import { qs, qsa, escapeHtml, formatNumber } from "../modules/utils.js";

let view = "role"; // "role" | "children" | "pin"
let pendingChildId = null;

function renderRoleChoice(root) {
  root.innerHTML = `
    <p class="section__lead">Bist du ein Kind oder ein Elternteil?</p>
    <div class="role-grid">
      <button type="button" class="role-card" data-role="child" data-cta="start_btn_rolle_kind_login">
        <span class="role-card__icon" aria-hidden="true">🧒</span>
        <span class="role-card__title">Ich bin ein Kind</span>
        <span class="role-card__hint">Zu meinen Quests und meiner Schatzkammer</span>
      </button>
      <button type="button" class="role-card role-card--admin" data-role="parent" data-cta="start_btn_rolle_eltern_login">
        <span class="role-card__icon" aria-hidden="true">🛡️</span>
        <span class="role-card__title">Ich bin Mama oder Papa</span>
        <span class="role-card__hint">Zum Gildenschalter: Freigaben, Quests, Belohnungen</span>
      </button>
    </div>`;
  qs('[data-role="child"]', root).addEventListener("click", () => { view = "children"; render(); });
  qs('[data-role="parent"]', root).addEventListener("click", () => {
    window.location.href = pageHref("eltern");
  });
}

function renderChildren(root) {
  const store = getStore();
  if (!store.children.length) {
    root.innerHTML = `
      <button type="button" class="link" data-back>← Zurück</button>
      <div class="empty">
        <span class="empty__icon" aria-hidden="true">👧</span>
        <p class="empty__title">Noch kein Profil da</p>
        <p class="empty__text">Frag Mama oder Papa — sie legen dein Profil am Gildenschalter an.</p>
      </div>`;
    qs("[data-back]", root).addEventListener("click", () => { view = "role"; render(); });
    return;
  }
  root.innerHTML = `
    <button type="button" class="link" data-back>← Zurück</button>
    <p class="section__lead">Tipp auf dein Profil.</p>
    <div class="profile-grid">
      ${store.children.map((c) => {
        const lvl = levelInfo(c.xp);
        return `<button type="button" class="profile-tile" data-pick="${c.id}" style="--child-color:${c.color}" data-cta="start_btn_profil_wahl">
          <span class="profile-tile__avatar" aria-hidden="true">${c.avatar}</span>
          <span class="profile-tile__name">${escapeHtml(c.name)}</span>
          <span class="profile-tile__meta">${formatNumber(c.balance)} Momtaler · Level ${lvl.level}${childHasPin(c.id) ? " · 🔒" : ""}</span>
        </button>`;
      }).join("")}
    </div>`;
  qs("[data-back]", root).addEventListener("click", () => { view = "role"; render(); });
  qsa("[data-pick]", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.pick;
      if (childHasPin(id)) {
        pendingChildId = id;
        view = "pin";
        render();
      } else {
        enterAs(id);
      }
    });
  });
}

function renderPin(root) {
  const store = getStore();
  const child = store.children.find((c) => c.id === pendingChildId);
  if (!child) { view = "children"; render(); return; }
  root.innerHTML = `
    <button type="button" class="link" data-back>← Zurück</button>
    <div class="card gate">
      <span class="gate__icon" aria-hidden="true">${child.avatar}</span>
      <h2 class="card__title">${escapeHtml(child.name)}s PIN</h2>
      <form class="form" data-pin-form novalidate>
        <div class="field">
          <label for="child-pin">PIN</label>
          <input id="child-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" required>
        </div>
        <p class="form__error" data-error role="alert" hidden></p>
        <button type="submit" class="btn btn--primary btn--lg">Öffnen</button>
      </form>
    </div>`;
  qs("[data-back]", root).addEventListener("click", () => { view = "children"; render(); });
  const form = qs("[data-pin-form]", root);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await verifyChildPin(pendingChildId, new FormData(form).get("pin"));
    if (ok) {
      enterAs(pendingChildId);
    } else {
      const err = qs("[data-error]", form);
      err.textContent = "Die PIN stimmt nicht.";
      err.hidden = false;
      qs("#child-pin", form).select();
    }
  });
  qs("#child-pin", form).focus();
}

function enterAs(childId) {
  setActiveChild(childId);
  window.location.href = pageHref("dashboard");
}

function render() {
  const root = qs("[data-login]");
  if (!root) return;
  if (view === "children") renderChildren(root);
  else if (view === "pin") renderPin(root);
  else renderRoleChoice(root);
}

export async function init() {
  render();
  subscribe(() => { if (view === "children") render(); });
}
