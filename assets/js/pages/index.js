/* Startseite: Profil wählen oder erstes Kind anlegen. */

import { getStore, subscribe } from "../modules/state.js";
import { setActiveChild, addChild, AVATARS, COLORS } from "../modules/kinder.js";
import { levelInfo } from "../modules/gamification.js";
import { toast } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber } from "../modules/utils.js";
import { pageHref } from "../script.js";

function renderProfiles() {
  const root = qs("[data-profiles]");
  if (!root) return;
  const store = getStore();
  const start = qs('[data-cta="start_btn_starten_hero"]');
  if (start) start.setAttribute("href", store.children.length ? "dashboard" : "#profiles-title");
  if (!store.children.length) {
    root.innerHTML = renderCreateForm();
    bindCreateForm(root);
    return;
  }
  root.innerHTML = `
    <p class="section__lead">Wer bist du? Tipp auf dein Profil und&nbsp;los.</p>
    <div class="profile-grid">
      ${store.children.map((c) => {
        const lvl = levelInfo(c.xp);
        return `<button type="button" class="profile-tile" data-pick="${c.id}" style="--child-color:${c.color}" data-cta="start_btn_profil_wahl">
          <span class="profile-tile__avatar" aria-hidden="true">${c.avatar}</span>
          <span class="profile-tile__name">${escapeHtml(c.name)}</span>
          <span class="profile-tile__meta">${formatNumber(c.balance)} Momtaler · Level ${lvl.level}</span>
        </button>`;
      }).join("")}
    </div>
    <p class="hint">Neue Profile legen Eltern am <a href="eltern">Gildenschalter</a> an.</p>`;
  qsa("[data-pick]", root).forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveChild(btn.dataset.pick);
      window.location.href = pageHref("dashboard");
    });
  });
}

function renderCreateForm() {
  return `
    <p class="section__lead">Noch kein Profil da. Leg das erste Kind an, dann geht es&nbsp;los.</p>
    <form class="form card" data-create-child novalidate>
      <div class="field">
        <label for="child-name">Name</label>
        <input id="child-name" name="name" type="text" maxlength="24" required autocomplete="off" placeholder="z. B. Max">
      </div>
      <fieldset class="field">
        <legend>Avatar</legend>
        <div class="avatar-picker">
          ${AVATARS.map((a, i) => `<label class="avatar-pick"><input type="radio" name="avatar" value="${a}" ${i === 0 ? "checked" : ""}><span aria-hidden="true">${a}</span><span class="sr-only">Avatar ${i + 1}</span></label>`).join("")}
        </div>
      </fieldset>
      <fieldset class="field">
        <legend>Farbe</legend>
        <div class="color-picker">
          ${COLORS.map((c, i) => `<label class="color-pick" style="--c:${c}"><input type="radio" name="color" value="${c}" ${i === 0 ? "checked" : ""}><span class="sr-only">Farbe ${i + 1}</span></label>`).join("")}
        </div>
      </fieldset>
      <p class="form__error" data-error role="alert" hidden></p>
      <button type="submit" class="btn btn--primary btn--lg" data-cta="start_btn_profil_anlegen">Profil anlegen</button>
    </form>`;
}

function bindCreateForm(root) {
  const form = qs("[data-create-child]", root);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const err = qs("[data-error]", form);
    try {
      const child = addChild({ name: data.get("name"), avatar: data.get("avatar"), color: data.get("color") });
      setActiveChild(child.id);
      toast(`Willkommen in der Gilde, ${child.name}!`, { icon: "🏰" });
      window.location.href = pageHref("dashboard");
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });
}

export async function init() {
  renderProfiles();
  subscribe(renderProfiles);
}
