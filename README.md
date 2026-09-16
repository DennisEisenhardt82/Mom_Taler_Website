# 🏰 Momtaler

Ein spielerisches Belohnungssystem für Familien: Kinder erledigen **Quests**, sammeln **Momtaler** und lösen sie in der **Schatzkammer** gegen Belohnungen ein. Eltern verwalten alles am **Gildenschalter**.

Läuft komplett im Browser — kein Server, kein Konto, kein Tracking. Alle Daten bleiben lokal auf dem Gerät (`localStorage`).

## Warum es das gibt

Ein privates Projekt, um das klassische „Punkte für Hausarbeit"-System durch etwas zu ersetzen, das sich für Kinder wie eine kleine App anfühlt: Fortschrittsbalken, Level, Abzeichen, Animationen — statt einer Strichliste am Kühlschrank.

## Funktionen

- **Mehrere Kinderprofile** mit eigenem Avatar, Kontostand und Fortschritt
- **Quests** (Aufgaben) mit Belohnung in Momtaler, Kategorie, Schwierigkeit und Wiederholung (täglich/wöchentlich/einmalig) — Tagesaufgaben werden nicht doppelt abgerechnet
- **Belohnungen** einlösen, sobald genug Momtaler da sind, inklusive Bestätigung und Animation
- **Gamification**: XP, Level (Gildenrang), Tages-/Wochenziele, Streaks, Abzeichen, persönliche Rekorde
- **Nachvollziehbarer Verlauf**: jede Gutschrift/Abbuchung als Buchung, Kontostand wird nie direkt gesetzt
- **Statistik** mit selbstgebauten SVG-Diagrammen (kein Chart-Framework) inklusive Datentabelle als Alternative
- **Gildenschalter** für Eltern: Kinder, Quests und Belohnungen verwalten, Momtaler manuell buchen, Verlauf einsehen — geschützt durch eine PIN (siehe Hinweis unten)
- **Dark Mode** (Hell/Dunkel/System), reduzierte Bewegung nach `prefers-reduced-motion`
- **Fehlertolerant**: defekte oder fehlende `localStorage`-Daten, gesperrter Speicher (privater Modus) und fehlgeschlagene JSON-Ladevorgänge führen nicht zur weißen Seite
- Daten lassen sich unter **Einstellungen** als JSON-Datei sichern, wieder einspielen oder zurücksetzen

## Tech-Stack

Absichtlich minimal: **HTML5, CSS3, Vanilla JavaScript (ES-Module), JSON**. Kein Build-Schritt, kein npm, kein Framework, keine CDN-Abhängigkeit.

```
index.html, dashboard.html, aufgaben.html, …   Seiten (flach im Projektstamm)
assets/css/style.css                            einzige CSS-Datei (Tokens → Themes → Komponenten)
assets/js/script.js                             Einstiegspunkt, App-Hülle, Routing pro Seite
assets/js/modules/                              Fachlogik (Storage, State, Quests, Belohnungen, Gamification, …)
assets/js/pages/                                Seiten-spezifische Logik
assets/fonts/                                   lokal eingebundene Schriften (kein Google-Fonts-CDN)
data/                                           Ausgangsdaten (Kinder, Quests, Belohnungen, Abzeichen)
partials/                                       Header/Footer als Single Source, in jede Seite eingebaut
docs/licenses/                                  Lizenz-/Attributionsnachweise der verwendeten Assets
docs/planning/                                  private Projektplanung (nicht Teil des Repos)
```

## Lokal starten

Ein beliebiger statischer Webserver genügt, zum Beispiel:

```bash
python -m http.server 8000
# oder
php -S localhost:8000
```

Dann `http://localhost:8000/` öffnen. Beim ersten Aufruf lädt die App die Beispieldaten aus `data/*.json`; ab dann lebt alles in `localStorage` unter dem Schlüssel `momtaler.v1`.

> **Hinweis zu sauberen URLs:** Intern wird ohne `.html`-Endung verlinkt (`href="dashboard"`). Live löst das die `.htaccess` bzw. auf Netlify die automatischen „Pretty URLs". Kennt der lokale Server keine URL-Umschreibung (z. B. VS-Code-Live-Server), erkennt die App das selbst und hängt die Endung zur Laufzeit an — es muss nichts konfiguriert werden.

## Deployment

Reines statisches Hosting reicht (Netlify, GitHub Pages, Vercel, jeder Webspace). Für Netlify liegt eine `netlify.toml` bei (404-Seite, Security-Header, Caching). Für Apache-Hosting eine fertige `.htaccess`.

Vor einem öffentlichen Go-Live:

- Platzhalter in `impressum.html` und `datenschutz.html` ausfüllen (`{{IMPRESSUM_*}}`, `{{KONTAKT_EMAIL}}`, `{{HOSTING_ANBIETER}}`)
- `DOMAIN.de` in `sitemap.xml` ersetzen
- `robots.txt` prüfen — steht aktuell auf „nicht indexieren" (`Disallow: /`), passend für ein privates Projekt

## Datenmodell

Ein Store-Objekt unter `momtaler.v1`:

```
settings, children, tasks, rewards, achievements, completions, redemptions, transactions
```

Der Kontostand eines Kindes wird ausschließlich über `transactions` verändert (Typ `earn`/`spend`/`adjust`), nie direkt gesetzt — dadurch bleibt jede Änderung im Verlauf nachvollziehbar.

## Sicherheitshinweis

Die Eltern-PIN am Gildenschalter ist ein **Komfortschutz im Browser**, keine echte Zugriffskontrolle. Alle Daten liegen offen im `localStorage` des Geräts und lassen sich mit den Entwicklertools des Browsers einsehen oder verändern. Für ein rein privates Familienprojekt ist das ausreichend — für sensible Daten wäre es das nicht.

## Nachweise

- Schriften: **Eagle Lake** und **Nunito**, lokal eingebunden (SIL Open Font License)
- Mauszeiger-Icons: „Cursor Collection", [Designed by Freepik](http://www.freepik.com) (Freepik-Free-Lizenz, Attributionspflicht)
- Szenenbilder (Burg, Questbrett, Schatzkammer, Gildenschalter): KI-generiert

## Lizenz

Privates Projekt, keine öffentliche Lizenz vergeben. Für die verwendeten Drittanbieter-Assets gelten deren eigene Lizenzen (siehe „Nachweise").
