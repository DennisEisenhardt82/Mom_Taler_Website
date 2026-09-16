/* Einstellungen: Farbschema, Bewegung, Eltern-PIN, Ziele, Daten sichern/laden/zurücksetzen. */

import { getStore, commit } from "../modules/state.js";
import { importStore, resetStore } from "../modules/data.js";
import { clear as clearStorage, loadBrokenRaw } from "../modules/storage.js";
import * as eltern from "../modules/eltern.js";
import { toast, confirmDialog } from "../modules/ui.js";
import { applyTheme, applyMotion, currentTheme, pageHref } from "../script.js";
import { qs, qsa, formatNumber, html, dayKey } from "../modules/utils.js";

function render() {
  const root = qs("[data-settings]");
  if (!root) return;
  const store = getStore();
  const theme = currentTheme();
  const motion = document.documentElement.dataset.motion === "reduce";
  const broken = loadBrokenRaw();

  root.innerHTML = `
    <section class="card" aria-labelledby="s-theme">
      <h2 class="card__title" id="s-theme">Farbschema</h2>
      <div class="segmented segmented--wide" role="group" aria-label="Farbschema">
        ${[["light", "☀️ Hell"], ["dark", "🌙 Dunkel"], ["system", "🌗 System"]].map(([v, l]) => `<button type="button" class="segmented__btn ${theme === v ? "is-active" : ""}" data-theme-set="${v}" aria-pressed="${theme === v}">${l}</button>`).join("")}
      </div>
      <label class="check check--row"><input type="checkbox" data-motion ${motion ? "checked" : ""}> Animationen reduzieren</label>
    </section>

    <section class="card" aria-labelledby="s-pin">
      <h2 class="card__title" id="s-pin">Eltern-PIN</h2>
      <p class="card__hint">${eltern.hasPin() ? "Eine PIN ist gesetzt. Der Gildenschalter fragt danach." : "Noch keine PIN. Der Gildenschalter ist für alle offen."}</p>
      <form class="form" data-pin-form novalidate>
        <div class="field field--row">
          <div class="field"><label for="pin-new">Neue PIN <small>(4 bis 6 Ziffern, leer = entfernen)</small></label><input id="pin-new" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>
        </div>
        <p class="form__error" data-error role="alert" hidden></p>
        <div class="modal__actions"><button type="submit" class="btn btn--primary">PIN speichern</button></div>
      </form>
      <p class="hint">Der PIN-Schutz hält neugierige Kinder fern, ist aber keine echte Sicherheitsfunktion: Die Daten liegen offen im Browser.</p>
    </section>

    <section class="card" aria-labelledby="s-goals">
      <h2 class="card__title" id="s-goals">Ziele</h2>
      <form class="form" data-goals-form novalidate>
        <div class="field field--row">
          <div class="field"><label for="goal-day">Quests pro Tag</label><input id="goal-day" name="dailyGoal" type="number" min="1" max="50" value="${store.settings.dailyGoal}"></div>
          <div class="field"><label for="goal-week">Quests pro Woche</label><input id="goal-week" name="weeklyGoal" type="number" min="1" max="300" value="${store.settings.weeklyGoal}"></div>
        </div>
        <p class="form__error" data-error role="alert" hidden></p>
        <div class="modal__actions"><button type="submit" class="btn btn--primary">Ziele speichern</button></div>
      </form>
    </section>

    <section class="card" aria-labelledby="s-data">
      <h2 class="card__title" id="s-data">Daten</h2>
      <p class="card__hint">${store.children.length} Profile · ${store.tasks.length} Quests · ${store.rewards.length} Belohnungen · ${formatNumber(store.transactions.length)} Buchungen. Alles liegt nur in diesem Browser.</p>
      <div class="btn-row">
        <button type="button" class="btn btn--ghost" data-export>Als Datei sichern</button>
        <label class="btn btn--ghost">Datei laden <input type="file" accept="application/json,.json" data-import class="sr-only"></label>
        <button type="button" class="btn btn--danger-ghost" data-reset>Alles zurücksetzen</button>
      </div>
      ${broken ? '<p class="hint">Es gibt beschädigte Altdaten. <button type="button" class="link" data-export-broken>Als Datei sichern</button></p>' : ""}
    </section>

    <section class="card" aria-labelledby="s-about">
      <h2 class="card__title" id="s-about">Über Momtaler</h2>
      <p class="card__hint">Momtaler läuft komplett in deinem Browser. Es gibt keinen Server, kein Konto und keine Weitergabe von Daten. Wenn du den Browserspeicher löschst, sind auch die Momtaler weg. Sichere die Daten deshalb ab und zu als Datei.</p>
    </section>`;

  qsa("[data-theme-set]", root).forEach((b) => b.addEventListener("click", () => {
    applyTheme(b.dataset.themeSet);
    commit("settings:theme");
    render();
  }));
  qs("[data-motion]", root).addEventListener("change", (e) => {
    applyMotion(e.target.checked);
    store.settings.reduceMotion = e.target.checked;
    commit("settings:motion");
  });

  qs("[data-pin-form]", root).addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      const pin = new FormData(form).get("pin");
      await eltern.setPin(pin);
      toast(pin ? "PIN gespeichert" : "PIN entfernt", { type: "success", icon: "🔐" });
      render();
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });

  qs("[data-goals-form]", root).addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const d = new FormData(form);
    try {
      eltern.updateGoals({ dailyGoal: d.get("dailyGoal"), weeklyGoal: d.get("weeklyGoal") });
      toast("Ziele gespeichert", { type: "success", icon: "🎯" });
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });

  qs("[data-export]", root).addEventListener("click", () => exportJson(JSON.stringify(getStore(), null, 2), `momtaler-${dayKey()}.json`));
  qs("[data-export-broken]", root)?.addEventListener("click", () => exportJson(broken, `momtaler-defekt-${dayKey()}.json`));

  qs("[data-import]", root).addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirmDialog({ title: "Daten ersetzen?", text: `Die Datei „${file.name}“ ersetzt alle aktuellen Daten in diesem Browser.`, confirmLabel: "Laden", danger: true });
    if (!ok) return;
    const text = await file.text();
    const err = importStore(text);
    if (err) toast(err, { type: "error", icon: "⚠️" });
    else {
      toast("Daten geladen", { type: "success", icon: "📂" });
      window.location.reload();
    }
  });

  qs("[data-reset]", root).addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Wirklich alles löschen?", text: "Alle Profile, Momtaler, Quests und der Verlauf werden gelöscht. Danach startet Momtaler mit den Beispieldaten.", confirmLabel: "Ja, alles löschen", danger: true });
    if (!ok) return;
    clearStorage();
    resetStore();
    eltern.lock();
    window.location.href = pageHref("index");
  });
}

function exportJson(text, filename) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = html(`<a href="${url}" download="${filename}" class="sr-only">Download</a>`);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  toast("Datei wird gespeichert", { icon: "💾" });
}

export async function init() {
  render();
}
