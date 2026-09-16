/* UI-Bausteine: Toasts, Modale (native <dialog>), Zähler, Münzflug, Konfetti,
   Level-Up- und Abzeichen-Overlays. Alles respektiert reduzierte Bewegung. */

import { escapeHtml, formatNumber, html, prefersReducedMotion, qs } from "./utils.js";

/* ---------- Toasts ---------- */

function toastRoot() {
  let root = qs("#toasts");
  if (!root) {
    root = html('<div id="toasts" class="toasts" aria-live="polite" aria-atomic="false"></div>');
    document.body.appendChild(root);
  }
  return root;
}

export function toast(message, { type = "info", icon = "", timeout = 3500 } = {}) {
  const root = toastRoot();
  const el = html(`<div class="toast toast--${type}" role="status">${icon ? `<span class="toast__icon" aria-hidden="true">${icon}</span>` : ""}<span>${escapeHtml(message)}</span></div>`);
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  const remove = () => {
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 300);
  };
  setTimeout(remove, timeout);
  el.addEventListener("click", remove);
  return el;
}

/* ---------- Modale ---------- */

export function openModal(content, { title = "", className = "" } = {}) {
  const dlg = html(`<dialog class="modal ${className}">
    <div class="modal__box">
      <header class="modal__head">
        ${title ? `<h2 class="modal__title">${escapeHtml(title)}</h2>` : ""}
        <button type="button" class="modal__close btn btn--icon" aria-label="Schließen">✕</button>
      </header>
      <div class="modal__body"></div>
    </div>
  </dialog>`);
  const body = qs(".modal__body", dlg);
  if (typeof content === "string") body.innerHTML = content;
  else body.appendChild(content);
  document.body.appendChild(dlg);
  qs(".modal__close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg) dlg.close();
  });
  dlg.addEventListener("close", () => setTimeout(() => dlg.remove(), 200));
  dlg.showModal();
  return dlg;
}

export function confirmDialog({ title, text, confirmLabel = "Ja", cancelLabel = "Abbrechen", danger = false }) {
  return new Promise((resolve) => {
    const box = html(`<div>
      <p class="modal__text">${escapeHtml(text)}</p>
      <div class="modal__actions">
        <button type="button" class="btn btn--ghost" data-cancel>${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? "btn--danger" : "btn--primary"}" data-ok>${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`);
    const dlg = openModal(box, { title });
    let result = false;
    qs("[data-ok]", box).addEventListener("click", () => { result = true; dlg.close(); });
    qs("[data-cancel]", box).addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => resolve(result));
    qs("[data-ok]", box).focus();
  });
}

/* ---------- Zahlen hochzählen ---------- */

export function countUp(el, to, { from = null, duration = 900 } = {}) {
  const target = Math.round(Number(to) || 0);
  const start = from == null ? Number(el.dataset.value ?? target) : Number(from);
  el.dataset.value = String(target);
  if (prefersReducedMotion() || start === target) {
    el.textContent = formatNumber(target);
    return;
  }
  const t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = formatNumber(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Münzen fliegen zur Schatzkammer ---------- */

export function coinBurst(fromEl, toEl, count = 8) {
  if (prefersReducedMotion() || !fromEl) return;
  const target = toEl || fromEl;
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  const tx = b.left + b.width / 2;
  const ty = b.top + b.height / 2;
  for (let i = 0; i < count; i += 1) {
    const coin = html('<span class="coin-fly" aria-hidden="true">🪙</span>');
    document.body.appendChild(coin);
    const dx = (Math.random() - 0.5) * 120;
    const dy = (Math.random() - 0.5) * 80;
    coin.style.left = `${sx}px`;
    coin.style.top = `${sy}px`;
    const anim = coin.animate([
      { transform: "translate(-50%,-50%) scale(.6)", opacity: 0 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.2)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${tx - sx}px), calc(-50% + ${ty - sy}px)) scale(.4)`, opacity: 0 },
    ], { duration: 900 + i * 60, easing: "cubic-bezier(.2,.7,.3,1)", delay: i * 40 });
    anim.onfinish = () => coin.remove();
  }
  if (toEl) {
    toEl.classList.add("is-pulse");
    setTimeout(() => toEl.classList.remove("is-pulse"), 700);
  }
}

/* ---------- Konfetti ---------- */

export function confetti(count = 60) {
  if (prefersReducedMotion()) return;
  const colors = ["#E0A32A", "#B3261E", "#2F6FB3", "#3B8A3F", "#F7CF5E"];
  const layer = html('<div class="confetti" aria-hidden="true"></div>');
  document.body.appendChild(layer);
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);
    p.style.setProperty("--x", `${(Math.random() - 0.5) * 200}px`);
    p.style.animationDelay = `${Math.random() * 400}ms`;
    p.style.animationDuration = `${1400 + Math.random() * 1000}ms`;
    layer.appendChild(p);
  }
  setTimeout(() => layer.remove(), 3000);
}

/* ---------- Overlays: Level-Up & Abzeichen ---------- */

export function levelUpOverlay({ to, rank }) {
  const box = html(`<div class="celebrate">
    <div class="celebrate__badge" aria-hidden="true">⬆️</div>
    <p class="celebrate__eyebrow">Gildenrang gestiegen</p>
    <p class="celebrate__title">Level ${to}</p>
    <p class="celebrate__text">Du bist jetzt <strong>${escapeHtml(rank)}</strong>. Weiter so!</p>
    <button type="button" class="btn btn--primary" data-close>Weiter</button>
  </div>`);
  const dlg = openModal(box, { className: "modal--celebrate" });
  qs("[data-close]", box).addEventListener("click", () => dlg.close());
  confetti(90);
  return dlg;
}

export function achievementOverlay(list) {
  if (!list.length) return null;
  const items = list.map((a) => `<li><span aria-hidden="true">${a.icon}</span><div><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.description)}</small></div></li>`).join("");
  const box = html(`<div class="celebrate">
    <div class="celebrate__badge" aria-hidden="true">🏅</div>
    <p class="celebrate__eyebrow">${list.length === 1 ? "Neues Abzeichen" : "Neue Abzeichen"}</p>
    <ul class="celebrate__list">${items}</ul>
    <button type="button" class="btn btn--primary" data-close>Super</button>
  </div>`);
  const dlg = openModal(box, { className: "modal--celebrate" });
  qs("[data-close]", box).addEventListener("click", () => dlg.close());
  return dlg;
}

/* ---------- Kleine Render-Helfer ---------- */

export function progressBar(pct, { label = "", small = false } = {}) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="progress ${small ? "progress--sm" : ""}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" ${label ? `aria-label="${escapeHtml(label)}"` : ""}><span style="width:${v}%"></span></div>`;
}

export function emptyState({ icon = "✨", title, text = "", action = "" }) {
  return `<div class="empty">
    <span class="empty__icon" aria-hidden="true">${icon}</span>
    <p class="empty__title">${escapeHtml(title)}</p>
    ${text ? `<p class="empty__text">${escapeHtml(text)}</p>` : ""}
    ${action}
  </div>`;
}

export function errorCard(message, { retry = true } = {}) {
  return `<div class="card card--error" role="alert">
    <p class="card__title">Da ist etwas schiefgelaufen</p>
    <p>${escapeHtml(message)}</p>
    ${retry ? '<div class="modal__actions"><a class="btn btn--primary" href="./">Zur Startseite</a><a class="btn btn--ghost" href="einstellungen">Daten sichern</a></div>' : ""}
  </div>`;
}
