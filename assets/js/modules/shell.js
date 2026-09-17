/* Geteilte App-Hülle: Theme und saubere interne Links.
   Eigenes Modul (kein <script>-Ziel), damit Seiten-Module und der
   Einstieg script.js immer dieselbe Modul-Instanz importieren — script.js
   trägt zur Cache-Steuerung eine Versions-Query (?v=…), die bei einem
   relativen Import auf script.js selbst zu einer zweiten, unabhängigen
   Instanz (und z.B. doppelt gebundenen Klick-Handlern) führen würde. */

import { getStore } from "./state.js";
import { qsa } from "./utils.js";

const THEMES = ["light", "dark"];

export function currentTheme() {
  try {
    const stored = localStorage.getItem("momtaler.theme");
    return THEMES.includes(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : "light";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("momtaler.theme", t); } catch { /* egal */ }
  const store = getStore();
  if (store) store.settings.theme = t;
}

export function applyMotion(reduce) {
  if (reduce) document.documentElement.setAttribute("data-motion", "reduce");
  else document.documentElement.removeAttribute("data-motion");
  try { localStorage.setItem("momtaler.motion", reduce ? "reduce" : "auto"); } catch { /* egal */ }
}

/* ---------- Saubere URLs ohne Server-Rewrite (Live Server, file://) ---------- */

const INTERNAL_PAGES = ["dashboard", "aufgaben", "belohnungen", "verlauf", "statistik", "profil", "eltern", "einstellungen", "impressum", "datenschutz"];
let needsExtension = null;

export function fixInternalLinks(root) {
  qsa("a[href]", root).forEach((a) => {
    const href = a.getAttribute("href");
    const [path, hash] = href.split("#");
    if (INTERNAL_PAGES.includes(path)) a.setAttribute("href", `${path}.html${hash ? "#" + hash : ""}`);
    else if (href === "./") a.setAttribute("href", "index.html");
  });
}

/* Prüft einmal, ob der Server extensionslose URLs auflöst. Wenn nicht (VS-Code-Live-Server,
   einfacher Python-Server, file://), bekommen interne Links zur Laufzeit ihre .html-Endung. */
export async function detectCleanUrls() {
  if (needsExtension !== null) return needsExtension;
  const path = window.location.pathname;
  if (window.location.protocol === "file:") {
    needsExtension = true;
  } else if (/\.html$/i.test(path) || path.endsWith("/")) {
    // Seite wurde mit Endung oder als Ordner-Index geöffnet: einmal testen, ob Rewrite existiert
    try {
      const res = await fetch("dashboard", { method: "HEAD", cache: "no-store" });
      needsExtension = !res.ok;
    } catch {
      needsExtension = true;
    }
  } else {
    needsExtension = false;
  }
  if (needsExtension) fixInternalLinks(document);
  return needsExtension;
}

export function needsExtensionValue() {
  return needsExtension;
}

export function pageHref(name) {
  if (name === "index") return needsExtension ? "index.html" : "./";
  return needsExtension ? `${name}.html` : name;
}
