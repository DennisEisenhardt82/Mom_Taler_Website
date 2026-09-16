/* SVG-Diagramme ohne Bibliothek. Jede Funktion liefert einen SVG-String plus
   eine versteckte Datentabelle als Textalternative. */

import { escapeHtml, formatNumber } from "./utils.js";

function table(caption, rows, headers) {
  const head = headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("");
  const body = rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${escapeHtml(c)}</th>` : `<td>${escapeHtml(c)}</td>`)).join("")}</tr>`).join("");
  return `<details class="chart__data"><summary>Daten als Tabelle</summary><table><caption>${escapeHtml(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></details>`;
}

/**
 * Gruppiertes Balkendiagramm.
 * @param {Array<{label:string, values:number[]}>} data
 * @param {{series:string[], title:string}} opts
 */
export function barChart(data, { series, title, colors = ["var(--gold)", "var(--primary)"] }) {
  const w = 600;
  const h = 260;
  const padL = 40;
  const padB = 34;
  const padT = 16;
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const innerW = w - padL - 10;
  const innerH = h - padB - padT;
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.min(28, (groupW * 0.7) / series.length);

  let grid = "";
  for (let v = 0; v <= top; v += step) {
    const y = padT + innerH - (v / top) * innerH;
    grid += `<line x1="${padL}" x2="${w - 10}" y1="${y}" y2="${y}" class="chart__grid"/>`;
    grid += `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="chart__tick">${formatNumber(v)}</text>`;
  }

  let bars = "";
  data.forEach((d, gi) => {
    const gx = padL + gi * groupW + (groupW - barW * series.length) / 2;
    d.values.forEach((v, si) => {
      const bh = (v / top) * innerH;
      const x = gx + si * barW;
      const y = padT + innerH - bh;
      bars += `<rect x="${x}" y="${y}" width="${barW - 3}" height="${bh}" rx="4" fill="${colors[si % colors.length]}" class="chart__bar"><title>${escapeHtml(d.label)}: ${formatNumber(v)} ${escapeHtml(series[si])}</title></rect>`;
    });
    bars += `<text x="${padL + gi * groupW + groupW / 2}" y="${h - 10}" text-anchor="middle" class="chart__label">${escapeHtml(d.label)}</text>`;
  });

  const legend = series.map((s, i) => `<span class="chart__legend-item"><i style="background:${colors[i % colors.length]}"></i>${escapeHtml(s)}</span>`).join("");
  const rows = data.map((d) => [d.label, ...d.values.map(formatNumber)]);

  return `<figure class="chart">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(title)}">${grid}${bars}</svg>
    <figcaption class="chart__legend">${legend}</figcaption>
    ${table(title, rows, ["Zeitraum", ...series])}
  </figure>`;
}

/** Liniendiagramm mit Fläche. data: [{label, value}] */
export function lineChart(data, { title, color = "var(--gold)" }) {
  const w = 600;
  const h = 220;
  const padL = 44;
  const padB = 28;
  const padT = 14;
  const values = data.map((d) => d.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = niceStep(max - min);
  const top = Math.ceil(max / step) * step;
  const bottom = Math.floor(min / step) * step;
  const innerW = w - padL - 12;
  const innerH = h - padB - padT;
  const x = (i) => padL + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v) => padT + innerH - ((v - bottom) / (top - bottom || 1)) * innerH;

  let grid = "";
  for (let v = bottom; v <= top; v += step) {
    grid += `<line x1="${padL}" x2="${w - 12}" y1="${y(v)}" y2="${y(v)}" class="chart__grid"/>`;
    grid += `<text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end" class="chart__tick">${formatNumber(v)}</text>`;
  }
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `M${x(0)},${y(bottom)} L${points.split(" ").join(" L")} L${x(data.length - 1)},${y(bottom)} Z`;
  const every = Math.max(1, Math.ceil(data.length / 8));
  const labels = data.map((d, i) => (i % every === 0 || i === data.length - 1
    ? `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="chart__label">${escapeHtml(d.label)}</text>` : "")).join("");
  const dots = data.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.value)}" r="3.5" fill="${color}" class="chart__dot"><title>${escapeHtml(d.label)}: ${formatNumber(d.value)}</title></circle>`).join("");
  const rows = data.map((d) => [d.label, formatNumber(d.value)]);

  return `<figure class="chart">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(title)}">
      ${grid}
      <path d="${area}" fill="${color}" opacity=".18"/>
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${labels}
    </svg>
    ${table(title, rows, ["Tag", "Momtaler"])}
  </figure>`;
}

/** Donut. data: [{label, value, icon?}] */
export function donutChart(data, { title }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const palette = ["var(--gold)", "var(--primary)", "var(--sky)", "var(--green)", "var(--purple)", "var(--wood)"];
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = data.map((d, i) => {
    const frac = total ? d.value / total : 0;
    const len = frac * c;
    const seg = `<circle r="${r}" cx="100" cy="100" fill="none" stroke="${palette[i % palette.length]}" stroke-width="26" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)"><title>${escapeHtml(d.label)}: ${formatNumber(d.value)}</title></circle>`;
    offset += len;
    return seg;
  }).join("");
  const legend = data.map((d, i) => `<span class="chart__legend-item"><i style="background:${palette[i % palette.length]}"></i>${d.icon ? d.icon + " " : ""}${escapeHtml(d.label)} <b>${total ? Math.round((d.value / total) * 100) : 0}%</b></span>`).join("");
  const rows = data.map((d) => [d.label, formatNumber(d.value)]);

  return `<figure class="chart chart--donut">
    <svg viewBox="0 0 200 200" role="img" aria-label="${escapeHtml(title)}">
      <circle r="${r}" cx="100" cy="100" fill="none" stroke="var(--surface-2)" stroke-width="26"/>
      ${segs}
      <text x="100" y="96" text-anchor="middle" class="chart__big">${formatNumber(total)}</text>
      <text x="100" y="116" text-anchor="middle" class="chart__tick">Quests</text>
    </svg>
    <figcaption class="chart__legend chart__legend--column">${legend}</figcaption>
    ${table(title, rows, ["Kategorie", "Quests"])}
  </figure>`;
}

function niceStep(range) {
  const raw = range / 4;
  const mag = 10 ** Math.floor(Math.log10(Math.max(1, raw)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.max(1, nice * mag);
}
