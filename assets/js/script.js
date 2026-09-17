/* Einstieg: lädt den Store, kümmert sich um die App-Hülle (Topbar, Navigation,
   Theme) und startet das Modul der aktuellen Seite. */

import { ensureStore } from "./modules/data.js";
import { getStore, subscribe, activeChild, storageWarning } from "./modules/state.js";
import { effectiveStreak } from "./modules/gamification.js";
import { logoutChild } from "./modules/kinder.js";
import { countUp, toast, errorCard, confirmDialog, confetti } from "./modules/ui.js";
import { qs, qsa, html, escapeHtml } from "./modules/utils.js";
import { currentTheme, applyTheme, pageHref, detectCleanUrls, fixInternalLinks, needsExtensionValue } from "./modules/shell.js";

const PAGES = {
  index: () => import("./pages/index.js"),
  dashboard: () => import("./pages/dashboard.js"),
  aufgaben: () => import("./pages/aufgaben.js"),
  belohnungen: () => import("./pages/belohnungen.js"),
  verlauf: () => import("./pages/verlauf.js"),
  statistik: () => import("./pages/statistik.js"),
  profil: () => import("./pages/profil.js"),
  eltern: () => import("./pages/eltern.js"),
  einstellungen: () => import("./pages/einstellungen.js"),
};

/* ---------- Theme ---------- */

function initTheme() {
  applyTheme(currentTheme());
}

/* ---------- Abmelden ---------- */

function initLogout() {
  qsa("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const child = activeChild();
      const ok = await confirmDialog({
        title: "Abmelden?",
        text: child ? `${child.name} wird abgemeldet. Zurück geht es über die Anmeldung auf der Startseite.` : "Du wirst abgemeldet.",
        confirmLabel: "Abmelden",
      });
      if (!ok) return;
      logoutChild();
      window.location.href = pageHref("index");
    });
  });
}

/* ---------- Nach-oben-Button (Schatzkiste) ---------- */

function initToTop() {
  const btn = qs("[data-to-top]");
  if (!btn) return;
  btn.hidden = false; // Sichtbarkeit läuft über die .is-visible-Klasse, nicht über [hidden]

  const onScroll = () => {
    btn.classList.toggle("is-visible", window.scrollY > 300);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  btn.addEventListener("click", () => {
    if (btn.classList.contains("is-opening")) return;
    btn.classList.add("is-opening");
    confetti(24);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 150);
    setTimeout(() => btn.classList.remove("is-opening"), 900);
  });
}

/* ---------- Hülle: Topbar, Navigation ---------- */

function updateShell() {
  const child = activeChild();
  const status = qs("[data-status]");
  if (status) status.hidden = !child;
  if (!child) return;
  const balance = qs("[data-balance]");
  if (balance) countUp(balance, child.balance);
  const avatar = qs("[data-avatar]");
  if (avatar) {
    avatar.textContent = child.avatar;
    avatar.style.setProperty("--child-color", child.color);
    avatar.setAttribute("aria-label", `Profil: ${child.name}`);
  }
  const streak = qs("[data-streak]");
  if (streak) {
    const s = effectiveStreak(child);
    streak.hidden = s < 2;
    streak.textContent = `🔥 ${s}`;
    streak.setAttribute("aria-label", `${s} Tage in Folge`);
  }
}

function initNav() {
  const page = document.body.dataset.page;
  qsa(".nav a[data-nav]").forEach((a) => {
    const active = a.dataset.nav === page;
    a.classList.toggle("is-active", active);
    if (active) a.setAttribute("aria-current", "page");
  });
  const more = qs("[data-nav-more]");
  const sheet = qs("#nav-more");
  if (more && sheet) {
    const close = () => {
      sheet.classList.remove("is-open");
      more.setAttribute("aria-expanded", "false");
    };
    more.addEventListener("click", () => {
      const open = sheet.classList.toggle("is-open");
      more.setAttribute("aria-expanded", String(open));
      if (open) qs("a", sheet)?.focus();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.addEventListener("click", (e) => {
      if (!sheet.contains(e.target) && !more.contains(e.target)) close();
    });
    if (["verlauf", "statistik", "eltern", "einstellungen"].includes(page)) more.classList.add("is-active");
  }
  const year = qs("#footer-year");
  if (year) year.textContent = String(new Date().getFullYear());
}

/* CTA-Tracking (CloudeX-Standard): ein globaler Handler, capture-Phase */
function initTracking() {
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-cta]");
    if (!el) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "cta_click",
      cta_id: el.dataset.cta,
      cta_text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      cta_ziel: el.getAttribute("href") || "",
    });
  }, true);
}

function showBanner(message, type = "warn") {
  const main = qs("#main");
  if (!main) return;
  main.prepend(html(`<div class="banner banner--${type}" role="alert">${escapeHtml(message)}</div>`));
}

/* ---------- Start ---------- */

async function boot() {
  initTheme();
  initTracking();
  initNav();
  initLogout();
  initToTop();
  await detectCleanUrls();
  if (needsExtensionValue()) {
    // Dynamisch gerenderte Inhalte ebenfalls anpassen
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType === 1) fixInternalLinks(n);
    }))).observe(document.body, { childList: true, subtree: true });
  }

  const page = document.body.dataset.page;
  if (!page || !PAGES[page]) return;

  let result;
  try {
    result = await ensureStore();
  } catch (err) {
    const main = qs("#main");
    if (main) main.innerHTML = errorCard("Die Daten konnten nicht geladen werden. Bitte die Seite neu laden.");
    return;
  }

  if (result.broken) {
    showBanner("Die gespeicherten Daten waren beschädigt und wurden beiseitegelegt. Unter Einstellungen kannst du sie noch als Datei sichern.");
  }
  const warning = storageWarning();
  if (warning) showBanner(warning);

  updateShell();
  subscribe(updateShell);

  const store = getStore();
  const CHILD_AREA_PAGES = ["dashboard", "aufgaben", "belohnungen", "verlauf", "statistik", "profil"];
  // Ohne eingeloggtes Kind (kein activeChildId, egal ob per Reset, Logout oder
  // frischer Installation) führt kein direkter Link in den Kinder-Bereich — immer
  // zurück zum Login auf der Startseite, damit die PIN-Auswahl nicht umgangen wird.
  if (CHILD_AREA_PAGES.includes(page) && !store.settings.activeChildId) {
    window.location.replace(needsExtensionValue() ? "index.html" : "./");
    return;
  }

  try {
    const mod = await PAGES[page]();
    await mod.init(result);
  } catch (err) {
    const main = qs("#main");
    if (main) main.insertAdjacentHTML("afterbegin", errorCard(err?.message || "Unbekannter Fehler."));
  }
}

window.addEventListener("error", (e) => {
  if (e?.message) toast("Fehler: " + e.message, { type: "error", timeout: 6000 });
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message || String(e?.reason || "Unbekannter Fehler");
  toast("Fehler: " + msg, { type: "error", timeout: 6000 });
});

boot();
