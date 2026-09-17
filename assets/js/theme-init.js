/* Läuft vor dem ersten Paint (klassisches Script im <head>), damit der
   gespeicherte Farbmodus ohne Flackern greift. Nur Hell/Dunkel, kein
   System-Modus — Standard ist Hell. Bewusst ohne Module-Syntax. */
(function () {
  try {
    var theme = localStorage.getItem("momtaler.theme");
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    if (localStorage.getItem("momtaler.motion") === "reduce") {
      document.documentElement.setAttribute("data-motion", "reduce");
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
