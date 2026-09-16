/* Läuft vor dem ersten Paint (klassisches Script im <head>), damit der
   gespeicherte Farbmodus ohne Flackern greift. Bewusst ohne Module-Syntax. */
(function () {
  try {
    var theme = localStorage.getItem("momtaler.theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (localStorage.getItem("momtaler.motion") === "reduce") {
      document.documentElement.setAttribute("data-motion", "reduce");
    }
  } catch (e) {
    /* Speicher gesperrt: Systemeinstellung gilt */
  }
})();
