<!-- CLOUDEX:START -->
# CloudeX aktiv

Dieses Projekt folgt dem CloudeX-Web-Standard.
Regelwerk: lies und befolge `~/.cloudex/rules/*.md` (Hub: `~/.cloudex/CLAUDE.md`).
Vor Abgabe: `/checkweb`. Passwortschutz: `/pwweb` / `/finalweb`. Upload-ZIP: `/zipweb`.

## Projektprofil

- **Typ:** Web-App (reines Frontend: HTML5, CSS3, Vanilla JS ES6+, JSON + localStorage). Kein Backend, keine Frameworks, keine CDN-Libraries.
- **Was:** Momtaler — spielerisches Belohnungs- und Punktesystem für Familien. Kinder erledigen Aufgaben („Quests"), verdienen Momtaler, lösen sie gegen Belohnungen ein. Mehrere Kinderprofile, Gamification (XP, Level, Streaks, Abzeichen), PIN-geschützter Elternbereich (nur Frontend-Schutz), Statistiken (SVG), Dark Mode.
- **Branche/Ort:** Familie/Kinder — kein lokales Business, keine Ortsbindung, kein LocalBusiness-SEO.
- **Seiten (ca. 9 + Pflicht):** index, dashboard, aufgaben, belohnungen, verlauf, statistik, profil, eltern, einstellungen + impressum, datenschutz, 404/403/500.
- **Domain:** noch offen.
- **Design-Thema:** „Momtaler-Gilde" — vier Szenen aus dem Konzeptbild: Burg (Start), Questbrett (Aufgaben), Schatzkammer (Belohnungen/Guthaben), Gildenschalter (Eltern). Eigenes Logo, das Emblem im Bild nicht übernehmen.
- **Planung:** siehe `projektplanung.md` (Datenmodell, Seiten, Gamification-Regeln, Phasen, offene Punkte).
- **Bewusste Abweichungen vom CloudeX-Standard (im Plan dokumentiert):** ES-Module unter `assets/js/modules/` mit `script.js` als einzigem Einstieg; eine `style.css`; Seiten flach im Root.
<!-- CLOUDEX:END -->
