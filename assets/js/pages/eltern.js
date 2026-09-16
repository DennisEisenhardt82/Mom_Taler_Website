/* Gildenschalter (Elternbereich): PIN-Gate, Kinder, Quests, Belohnungen, Konto, Übersicht. */

import { getStore, subscribe, childById } from "../modules/state.js";
import * as eltern from "../modules/eltern.js";
import { addChild, updateChild, removeChild, AVATARS, COLORS } from "../modules/kinder.js";
import { transactionsFor, TYPES } from "../modules/transaktionen.js";
import { undoCompletion, RECURRENCE } from "../modules/aufgaben.js";
import { totals } from "../modules/statistik.js";
import { toast, confirmDialog, openModal, emptyState } from "../modules/ui.js";
import { qs, qsa, escapeHtml, formatNumber, formatSigned, formatTime, relativeDay, html } from "../modules/utils.js";

let tab = "kinder";
let unlocked = false;
let kontoChild = null;

/* ---------- PIN-Gate ---------- */

function renderGate(root) {
  root.innerHTML = `
    <section class="card gate">
      <span class="gate__icon" aria-hidden="true">🔒</span>
      <h2 class="card__title">Nur für Gildenmeister</h2>
      <p>Bitte die Eltern-PIN eingeben.</p>
      <form class="form" data-gate novalidate>
        <div class="field">
          <label for="pin">PIN</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="6" required>
        </div>
        <p class="form__error" data-error role="alert" hidden></p>
        <button type="submit" class="btn btn--primary btn--lg">Öffnen</button>
      </form>
      <p class="hint">Der PIN-Schutz ist ein Komfortschutz im Browser, keine echte Sicherheitsbarriere. Wer sich mit dem Browser auskennt, kann ihn umgehen.</p>
    </section>`;
  const form = qs("[data-gate]", root);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await eltern.unlock(new FormData(form).get("pin"));
    if (ok) {
      unlocked = true;
      render();
    } else {
      const err = qs("[data-error]", form);
      err.textContent = "Die PIN stimmt nicht.";
      err.hidden = false;
      qs("#pin", form).select();
    }
  });
  qs("#pin", form).focus();
}

/* ---------- Rahmen mit Tabs ---------- */

function render() {
  const root = qs("[data-parents]");
  if (!root) return;
  if (!unlocked) {
    renderGate(root);
    return;
  }
  const tabs = [["kinder", "Kinder"], ["quests", "Quests"], ["belohnungen", "Belohnungen"], ["konto", "Konto"], ["uebersicht", "Übersicht"]];
  root.innerHTML = `
    <div class="tabs" role="tablist" aria-label="Bereiche">
      ${tabs.map(([k, l]) => `<button type="button" role="tab" class="tabs__btn ${tab === k ? "is-active" : ""}" aria-selected="${tab === k}" data-tab="${k}" id="tab-${k}" aria-controls="panel-${k}">${l}</button>`).join("")}
    </div>
    <div class="tabs__panel" role="tabpanel" id="panel-${tab}" aria-labelledby="tab-${tab}" data-panel></div>
    ${eltern.hasPin() ? '<p class="hint"><button type="button" class="link" data-lock>Gildenschalter sperren</button></p>' : '<p class="hint">Noch keine PIN gesetzt. <a href="einstellungen">Jetzt in den Einstellungen festlegen</a>, damit Kinder hier nicht ohne dich landen.</p>'}`;
  qsa("[data-tab]", root).forEach((b) => b.addEventListener("click", () => {
    tab = b.dataset.tab;
    render();
  }));
  qs("[data-lock]", root)?.addEventListener("click", () => {
    eltern.lock();
    unlocked = false;
    render();
  });
  const panel = qs("[data-panel]", root);
  ({ kinder: renderKinder, quests: renderQuests, belohnungen: renderRewards, konto: renderKonto, uebersicht: renderOverview })[tab](panel);
}

/* ---------- Kinder ---------- */

function childForm(child = null) {
  return `<form class="form" data-child-form novalidate>
    <div class="field"><label for="cf-name">Name</label><input id="cf-name" name="name" type="text" maxlength="24" required value="${escapeHtml(child?.name || "")}"></div>
    <fieldset class="field"><legend>Avatar</legend><div class="avatar-picker">
      ${AVATARS.map((a, i) => `<label class="avatar-pick"><input type="radio" name="avatar" value="${a}" ${(child ? child.avatar === a : i === 0) ? "checked" : ""}><span aria-hidden="true">${a}</span><span class="sr-only">Avatar ${i + 1}</span></label>`).join("")}
    </div></fieldset>
    <fieldset class="field"><legend>Farbe</legend><div class="color-picker">
      ${COLORS.map((c, i) => `<label class="color-pick" style="--c:${c}"><input type="radio" name="color" value="${c}" ${(child ? child.color === c : i === 0) ? "checked" : ""}><span class="sr-only">Farbe ${i + 1}</span></label>`).join("")}
    </div></fieldset>
    <p class="form__error" data-error role="alert" hidden></p>
    <div class="modal__actions"><button type="submit" class="btn btn--primary">${child ? "Speichern" : "Anlegen"}</button></div>
  </form>`;
}

function openChildForm(child = null) {
  const box = html(`<div>${childForm(child)}</div>`);
  const dlg = openModal(box, { title: child ? `${child.name} bearbeiten` : "Neues Kind" });
  dlg.addEventListener("close", () => render());
  const form = qs("form", box);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    try {
      if (child) updateChild(child.id, { name: d.get("name"), avatar: d.get("avatar"), color: d.get("color") });
      else addChild({ name: d.get("name"), avatar: d.get("avatar"), color: d.get("color") });
      toast(child ? "Profil gespeichert" : "Profil angelegt", { type: "success", icon: "✅" });
      dlg.close();
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });
}

function renderKinder(panel) {
  const store = getStore();
  panel.innerHTML = `
    <div class="section__head section__head--row"><h2 class="section__title">Kinder</h2><button type="button" class="btn btn--primary btn--sm" data-add-child>+ Neues Kind</button></div>
    ${store.children.length ? `<ul class="admin-list">${store.children.map((c) => `
      <li class="admin-item" style="--child-color:${c.color}">
        <span class="admin-item__icon" aria-hidden="true">${c.avatar}</span>
        <div class="admin-item__body"><strong>${escapeHtml(c.name)}</strong><small>${formatNumber(c.balance)} Momtaler · ${formatNumber(c.xp)} XP</small></div>
        <div class="admin-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-edit-child="${c.id}">Bearbeiten</button>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-remove-child="${c.id}" aria-label="${escapeHtml(c.name)} löschen">Löschen</button>
        </div>
      </li>`).join("")}</ul>` : emptyState({ icon: "👧", title: "Noch kein Kind angelegt" })}`;
  qs("[data-add-child]", panel).addEventListener("click", () => openChildForm());
  qsa("[data-edit-child]", panel).forEach((b) => b.addEventListener("click", () => openChildForm(childById(b.dataset.editChild))));
  qsa("[data-remove-child]", panel).forEach((b) => b.addEventListener("click", async () => {
    const c = childById(b.dataset.removeChild);
    const ok = await confirmDialog({ title: `${c.name} löschen?`, text: "Alle Momtaler, Quests-Erledigungen und der Verlauf dieses Kindes werden endgültig gelöscht.", confirmLabel: "Endgültig löschen", danger: true });
    if (ok) {
      removeChild(c.id);
      toast("Profil gelöscht", { icon: "🗑️" });
    }
  }));
}

/* ---------- Quests ---------- */

function taskForm(task = null) {
  const store = getStore();
  const cats = store.settings.categories;
  const assigned = Array.isArray(task?.assignedTo) ? task.assignedTo : [];
  return `<form class="form" data-task-form novalidate>
    <div class="field field--row">
      <div class="field field--icon"><label for="tf-icon">Icon</label><input id="tf-icon" name="icon" type="text" maxlength="4" value="${escapeHtml(task?.icon || "⭐")}"></div>
      <div class="field"><label for="tf-title">Titel</label><input id="tf-title" name="title" type="text" maxlength="60" required value="${escapeHtml(task?.title || "")}"></div>
    </div>
    <div class="field"><label for="tf-desc">Beschreibung</label><textarea id="tf-desc" name="description" rows="2" maxlength="200">${escapeHtml(task?.description || "")}</textarea></div>
    <div class="field field--row">
      <div class="field"><label for="tf-reward">Momtaler</label><input id="tf-reward" name="reward" type="number" min="0" max="100000" required value="${task?.reward ?? 10}"></div>
      <div class="field"><label for="tf-xp">XP <small>(leer = Hälfte)</small></label><input id="tf-xp" name="xp" type="number" min="0" value="${task?.xp ?? ""}"></div>
    </div>
    <div class="field field--row">
      <div class="field"><label for="tf-cat">Kategorie</label><select id="tf-cat" name="category">${Object.entries(cats).map(([k, c]) => `<option value="${k}" ${task?.category === k ? "selected" : ""}>${c.icon} ${escapeHtml(c.label)}</option>`).join("")}</select></div>
      <div class="field"><label for="tf-rec">Wiederholung</label><select id="tf-rec" name="recurrence">${Object.entries(RECURRENCE).map(([k, l]) => `<option value="${k}" ${(task?.recurrence || "daily") === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label for="tf-diff">Schwierigkeit</label><select id="tf-diff" name="difficulty">${[1, 2, 3].map((d) => `<option value="${d}" ${(task?.difficulty || 1) === d ? "selected" : ""}>${["Leicht", "Mittel", "Schwer"][d - 1]}</option>`).join("")}</select></div>
    </div>
    <fieldset class="field"><legend>Für wen? <small>(nichts gewählt = alle)</small></legend><div class="check-row">
      ${store.children.map((c) => `<label class="check"><input type="checkbox" name="assignedTo" value="${c.id}" ${assigned.includes(c.id) ? "checked" : ""}> ${c.avatar} ${escapeHtml(c.name)}</label>`).join("")}
    </div></fieldset>
    <p class="form__error" data-error role="alert" hidden></p>
    <div class="modal__actions"><button type="submit" class="btn btn--primary">${task ? "Speichern" : "Quest aushängen"}</button></div>
  </form>`;
}

function openTaskForm(task = null) {
  const box = html(`<div>${taskForm(task)}</div>`);
  const dlg = openModal(box, { title: task ? "Quest bearbeiten" : "Neue Quest" });
  dlg.addEventListener("close", () => render());
  const form = qs("form", box);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const input = Object.fromEntries(d.entries());
    input.assignedTo = d.getAll("assignedTo");
    try {
      if (task) eltern.updateTask(task.id, { ...input, active: task.active });
      else eltern.addTask(input);
      toast(task ? "Quest gespeichert" : "Quest ausgehängt", { type: "success", icon: "📜" });
      dlg.close();
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });
}

function renderQuests(panel) {
  const store = getStore();
  panel.innerHTML = `
    <div class="section__head section__head--row"><h2 class="section__title">Quests</h2><button type="button" class="btn btn--primary btn--sm" data-add-task>+ Neue Quest</button></div>
    ${store.tasks.length ? `<ul class="admin-list">${store.tasks.map((t) => `
      <li class="admin-item ${t.active ? "" : "is-inactive"}">
        <span class="admin-item__icon" aria-hidden="true">${t.icon}</span>
        <div class="admin-item__body"><strong>${escapeHtml(t.title)}</strong><small>+${formatNumber(t.reward)} Momtaler · ${RECURRENCE[t.recurrence]} · ${t.assignedTo === "all" ? "alle" : t.assignedTo.map((id) => childById(id)?.name || "?").join(", ")}${t.active ? "" : " · pausiert"}</small></div>
        <div class="admin-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-toggle-task="${t.id}">${t.active ? "Pausieren" : "Aktivieren"}</button>
          <button type="button" class="btn btn--ghost btn--sm" data-edit-task="${t.id}">Bearbeiten</button>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-remove-task="${t.id}" aria-label="${escapeHtml(t.title)} löschen">Löschen</button>
        </div>
      </li>`).join("")}</ul>` : emptyState({ icon: "📜", title: "Das Questbrett ist leer" })}`;
  qs("[data-add-task]", panel).addEventListener("click", () => openTaskForm());
  qsa("[data-edit-task]", panel).forEach((b) => b.addEventListener("click", () => openTaskForm(store.tasks.find((t) => t.id === b.dataset.editTask))));
  qsa("[data-toggle-task]", panel).forEach((b) => b.addEventListener("click", () => eltern.toggleTask(b.dataset.toggleTask)));
  qsa("[data-remove-task]", panel).forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Quest löschen?", text: "Bisherige Erledigungen und Buchungen bleiben im Verlauf erhalten.", confirmLabel: "Löschen", danger: true });
    if (ok) eltern.removeTask(b.dataset.removeTask);
  }));
}

/* ---------- Belohnungen ---------- */

function rewardForm(reward = null) {
  return `<form class="form" data-reward-form novalidate>
    <div class="field field--row">
      <div class="field field--icon"><label for="rf-icon">Icon</label><input id="rf-icon" name="icon" type="text" maxlength="4" value="${escapeHtml(reward?.icon || "🎁")}"></div>
      <div class="field"><label for="rf-title">Titel</label><input id="rf-title" name="title" type="text" maxlength="60" required value="${escapeHtml(reward?.title || "")}"></div>
    </div>
    <div class="field"><label for="rf-desc">Beschreibung</label><textarea id="rf-desc" name="description" rows="2" maxlength="200">${escapeHtml(reward?.description || "")}</textarea></div>
    <div class="field"><label for="rf-cost">Kosten in Momtaler</label><input id="rf-cost" name="cost" type="number" min="0" max="1000000" required value="${reward?.cost ?? 100}"></div>
    <p class="form__error" data-error role="alert" hidden></p>
    <div class="modal__actions"><button type="submit" class="btn btn--primary">${reward ? "Speichern" : "Belohnung anlegen"}</button></div>
  </form>`;
}

function openRewardForm(reward = null) {
  const box = html(`<div>${rewardForm(reward)}</div>`);
  const dlg = openModal(box, { title: reward ? "Belohnung bearbeiten" : "Neue Belohnung" });
  dlg.addEventListener("close", () => render());
  const form = qs("form", box);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = Object.fromEntries(new FormData(form).entries());
    try {
      if (reward) eltern.updateReward(reward.id, { ...input, active: reward.active });
      else eltern.addReward(input);
      toast(reward ? "Belohnung gespeichert" : "Belohnung angelegt", { type: "success", icon: "🎁" });
      dlg.close();
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });
}

function renderRewards(panel) {
  const store = getStore();
  panel.innerHTML = `
    <div class="section__head section__head--row"><h2 class="section__title">Belohnungen</h2><button type="button" class="btn btn--primary btn--sm" data-add-reward>+ Neue Belohnung</button></div>
    ${store.rewards.length ? `<ul class="admin-list">${[...store.rewards].sort((a, b) => a.cost - b.cost).map((r) => `
      <li class="admin-item ${r.active ? "" : "is-inactive"}">
        <span class="admin-item__icon" aria-hidden="true">${r.icon}</span>
        <div class="admin-item__body"><strong>${escapeHtml(r.title)}</strong><small>${formatNumber(r.cost)} Momtaler${r.active ? "" : " · pausiert"}</small></div>
        <div class="admin-item__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-toggle-reward="${r.id}">${r.active ? "Pausieren" : "Aktivieren"}</button>
          <button type="button" class="btn btn--ghost btn--sm" data-edit-reward="${r.id}">Bearbeiten</button>
          <button type="button" class="btn btn--danger-ghost btn--sm" data-remove-reward="${r.id}" aria-label="${escapeHtml(r.title)} löschen">Löschen</button>
        </div>
      </li>`).join("")}</ul>` : emptyState({ icon: "🎁", title: "Noch keine Belohnungen" })}`;
  qs("[data-add-reward]", panel).addEventListener("click", () => openRewardForm());
  qsa("[data-edit-reward]", panel).forEach((b) => b.addEventListener("click", () => openRewardForm(store.rewards.find((r) => r.id === b.dataset.editReward))));
  qsa("[data-toggle-reward]", panel).forEach((b) => b.addEventListener("click", () => eltern.toggleReward(b.dataset.toggleReward)));
  qsa("[data-remove-reward]", panel).forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Belohnung löschen?", text: "Bereits eingelöste Belohnungen bleiben im Verlauf.", confirmLabel: "Löschen", danger: true });
    if (ok) eltern.removeReward(b.dataset.removeReward);
  }));
}

/* ---------- Konto ---------- */

function renderKonto(panel) {
  const store = getStore();
  const selected = childById(kontoChild) ? kontoChild : (store.children[0]?.id || "");
  kontoChild = selected;
  const child = childById(selected);
  const tx = child ? transactionsFor(child.id).slice(0, 40) : [];
  const completions = child ? store.completions.filter((c) => c.childId === child.id).slice(-10).reverse() : [];
  panel.innerHTML = `
    <div class="section__head"><h2 class="section__title">Konto</h2></div>
    ${store.children.length ? `
    <label class="select select--wide"><span>Kind</span>
      <select data-select-child>${store.children.map((c) => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${c.avatar} ${escapeHtml(c.name)} · ${formatNumber(c.balance)} Momtaler</option>`).join("")}</select>
    </label>
    <form class="form card" data-adjust novalidate>
      <p class="card__title">Momtaler manuell buchen</p>
      <div class="field field--row">
        <div class="field"><label for="adj-amount">Betrag <small>(negativ = abziehen)</small></label><input id="adj-amount" name="amount" type="number" required placeholder="z. B. 50 oder -20"></div>
        <div class="field"><label for="adj-reason">Grund</label><input id="adj-reason" name="reason" type="text" maxlength="80" required placeholder="z. B. Bonus für Zeugnis"></div>
      </div>
      <p class="form__error" data-error role="alert" hidden></p>
      <div class="modal__actions"><button type="submit" class="btn btn--primary">Buchen</button></div>
    </form>

    <section class="section"><div class="section__head"><h3 class="section__title">Letzte Erledigungen</h3></div>
      ${completions.length ? `<ul class="admin-list">${completions.map((c) => {
        const t = store.tasks.find((x) => x.id === c.taskId);
        return `<li class="admin-item"><span class="admin-item__icon" aria-hidden="true">${t?.icon || "❔"}</span><div class="admin-item__body"><strong>${escapeHtml(t?.title || "Gelöschte Quest")}</strong><small>${relativeDay(c.day)}, ${formatTime(c.timestamp)} · +${formatNumber(c.reward)}</small></div><div class="admin-item__actions"><button type="button" class="btn btn--ghost btn--sm" data-undo="${c.id}">Zurücknehmen</button></div></li>`;
      }).join("")}</ul>` : '<p class="hint">Noch keine Erledigungen.</p>'}
    </section>

    <section class="section"><div class="section__head"><h3 class="section__title">Buchungen</h3></div>
      ${tx.length ? `<ul class="activity">${tx.map((t) => `<li class="activity__item"><span class="activity__amount ${t.amount > 0 ? "is-plus" : "is-minus"}">${formatSigned(t.amount)}</span><span class="activity__reason">${escapeHtml(t.reason)}<small>${TYPES[t.type]}</small></span><span class="activity__time">${relativeDay(t.day)}, ${formatTime(t.date)}</span></li>`).join("")}</ul>` : '<p class="hint">Noch keine Buchungen.</p>'}
    </section>` : emptyState({ icon: "👧", title: "Erst ein Kind anlegen" })}`;

  qs("[data-select-child]", panel)?.addEventListener("change", (e) => {
    kontoChild = e.target.value;
    renderKonto(panel);
  });
  qs("[data-adjust]", panel)?.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.target;
    const d = new FormData(form);
    try {
      eltern.adjustBalance(selected, d.get("amount"), d.get("reason"));
      toast("Gebucht", { type: "success", icon: "🪙" });
    } catch (err) {
      const el = qs("[data-error]", form);
      el.textContent = err.message;
      el.hidden = false;
    }
  });
  qsa("[data-undo]", panel).forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog({ title: "Erledigung zurücknehmen?", text: "Die Momtaler und XP werden wieder abgezogen.", confirmLabel: "Zurücknehmen", danger: true });
    if (ok) {
      try { undoCompletion(b.dataset.undo); toast("Zurückgenommen", { icon: "↩️" }); } catch (err) { toast(err.message, { type: "error" }); }
    }
  }));
}

/* ---------- Übersicht ---------- */

function renderOverview(panel) {
  const store = getStore();
  panel.innerHTML = `
    <div class="section__head"><h2 class="section__title">Übersicht</h2></div>
    ${store.children.length ? `<div class="overview-grid">${store.children.map((c) => {
      const all = totals(c.id);
      return `<article class="card" style="--child-color:${c.color}">
        <p class="card__title">${c.avatar} ${escapeHtml(c.name)}</p>
        <dl class="facts facts--tight">
          <div><dt>Kontostand</dt><dd>${formatNumber(c.balance)}</dd></div>
          <div><dt>Verdient</dt><dd>${formatNumber(all.earned)}</dd></div>
          <div><dt>Ausgegeben</dt><dd>${formatNumber(all.spent)}</dd></div>
          <div><dt>Quests</dt><dd>${formatNumber(all.tasks)}</dd></div>
          <div><dt>Belohnungen</dt><dd>${formatNumber(all.rewards)}</dd></div>
          <div><dt>Bester Streak</dt><dd>${c.streak.best} Tage</dd></div>
        </dl>
      </article>`;
    }).join("")}</div>` : emptyState({ icon: "📊", title: "Noch keine Daten" })}
    <p class="hint">Detaillierte Diagramme pro Kind gibt es unter <a href="statistik">Statistik</a> (für das aktive Profil).</p>`;
}

export async function init() {
  unlocked = eltern.isUnlocked();
  render();
  subscribe(() => {
    // Bei offenen Modalen nicht neu zeichnen, sonst verliert das Formular den Fokus
    if (!document.querySelector("dialog[open]")) render();
  });
}
