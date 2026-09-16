/* Schatzkammer: Belohnungen einlösen, eingelöste anzeigen. */

import { subscribe, activeChild } from "../modules/state.js";
import { rewardsFor, redeemReward, redemptionsFor } from "../modules/belohnungen.js";
import { toast, confirmDialog, confetti, achievementOverlay, progressBar, emptyState, openModal, countUp } from "../modules/ui.js";
import { qs, escapeHtml, formatNumber, formatDate, html } from "../modules/utils.js";

let lastBalance = null;

function render() {
  const root = qs("[data-rewards]");
  const child = activeChild();
  if (!root || !child) return;
  const rewards = rewardsFor(child.id);
  const history = redemptionsFor(child.id);

  root.innerHTML = `
    <section class="treasure treasure--compact" data-treasure>
      <div class="treasure__inner">
        <p class="treasure__label">Dein Schatz</p>
        <p class="treasure__value"><span data-treasure-value>${formatNumber(child.balance)}</span></p>
        <p class="treasure__sub"><span class="pill">${rewards.filter((r) => r.affordable).length} Belohnungen jetzt einlösbar</span></p>
      </div>
    </section>

    <section class="section" aria-labelledby="rewards-title">
      <div class="section__head">
        <h2 class="section__title" id="rewards-title">Truhen</h2>
        <p class="section__lead">Genug Momtaler gesammelt? Dann öffne eine Truhe.</p>
      </div>
      <div class="reward-grid">
        ${rewards.length ? rewards.map((r) => `
          <article class="chest ${r.affordable ? "is-open" : "is-locked"}" data-reward="${r.id}">
            <span class="chest__icon" aria-hidden="true">${r.icon}</span>
            <h3 class="chest__title">${escapeHtml(r.title)}</h3>
            <p class="chest__desc">${escapeHtml(r.description)}</p>
            <p class="chest__cost"><b>${formatNumber(r.cost)}</b> Momtaler</p>
            ${r.affordable
              ? `<button type="button" class="btn btn--gold" data-redeem="${r.id}" data-cta="schatz_btn_einloesen_truhe">Einlösen</button>`
              : `${progressBar(r.pct, { label: `Fortschritt zu ${r.title}`, small: true })}<p class="chest__missing">Noch ${formatNumber(r.missing)} fehlen</p>`}
          </article>`).join("")
          : emptyState({ icon: "🎁", title: "Noch keine Belohnungen", text: "Eltern legen Belohnungen am Gildenschalter an." })}
      </div>
    </section>

    <section class="section" aria-labelledby="history-title">
      <div class="section__head">
        <h2 class="section__title" id="history-title">Schon eingelöst</h2>
      </div>
      ${history.length ? `<ul class="activity">${history.slice(0, 10).map((h) => `
        <li class="activity__item">
          <span class="activity__icon" aria-hidden="true">${h.icon || "🎁"}</span>
          <span class="activity__reason">${escapeHtml(h.title)}</span>
          <span class="activity__time">${formatDate(h.timestamp)} · ${formatNumber(h.cost)} Momtaler</span>
        </li>`).join("")}</ul>` : `<p class="hint">Hier erscheinen deine eingelösten Belohnungen.</p>`}
    </section>`;

  const valueEl = qs("[data-treasure-value]", root);
  if (valueEl && lastBalance !== null && lastBalance !== child.balance) countUp(valueEl, child.balance, { from: lastBalance });
  lastBalance = child.balance;
}

async function handleRedeem(btn) {
  const child = activeChild();
  const id = btn.dataset.redeem;
  const reward = rewardsFor(child.id).find((r) => r.id === id);
  if (!reward) return;
  const ok = await confirmDialog({
    title: `${reward.icon} ${reward.title}`,
    text: `${formatNumber(reward.cost)} Momtaler ausgeben? Danach hast du noch ${formatNumber(child.balance - reward.cost)}.`,
    confirmLabel: "Ja, einlösen",
  });
  if (!ok) return;
  try {
    const result = redeemReward(id, child.id);
    confetti(70);
    const box = html(`<div class="celebrate">
      <div class="celebrate__badge celebrate__badge--chest" aria-hidden="true">${result.reward.icon}</div>
      <p class="celebrate__eyebrow">Truhe geöffnet</p>
      <p class="celebrate__title">${escapeHtml(result.reward.title)}</p>
      <p class="celebrate__text">Zeig das deinen Eltern, dann bekommst du deine Belohnung. Dein Schatz: <strong>${formatNumber(result.balance)} Momtaler</strong>.</p>
      <button type="button" class="btn btn--primary" data-close>Juhu</button>
    </div>`);
    const dlg = openModal(box, { className: "modal--celebrate" });
    qs("[data-close]", box).addEventListener("click", () => dlg.close());
    if (result.achievements.length) dlg.addEventListener("close", () => achievementOverlay(result.achievements));
  } catch (err) {
    toast(err.message, { type: "error", icon: "🔒" });
  }
}

export async function init() {
  const root = qs("[data-rewards]");
  if (!root) return;
  render();
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-redeem]");
    if (btn) handleRedeem(btn);
  });
  subscribe(() => render());
}
