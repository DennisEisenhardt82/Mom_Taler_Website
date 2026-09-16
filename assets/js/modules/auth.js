/* Gemeinsame PIN-Logik für Eltern-PIN und Kinder-PINs. Nur ein Komfortschutz
   im Browser, keine echte Sicherheit — die Daten liegen offen im localStorage. */

export async function hashPin(scope, pin) {
  const text = `momtaler:${scope}:${pin}`;
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `djb2:${h.toString(16)}`;
}

export function validatePinFormat(pin) {
  return /^\d{4,6}$/.test(String(pin || ""));
}
