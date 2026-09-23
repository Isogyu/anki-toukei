/** 図表問題用の SVG/HTML 生成ヘルパー。
 *  375px 幅スマホで読めるよう viewBox 幅 340 程度・10px フォントで描く。
 *  返り値は QuestionCard の figure として dangerouslySetInnerHTML される。
 *  （入力は solvers 内部の数値のみ。外部入力は入らない） */

const AX = '#555';
const INK = '#222';
const ACC = '#2563eb';
const MUT = '#888';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function wrap(inner: string, w: number, h: number): string {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" xmlns="http://www.w3.org/2000/svg" role="img" font-family="system-ui,sans-serif">${inner}</svg>`;
}

function tx(
  x: number,
  y: number,
  s: string,
  anchor = 'middle',
  size = 9,
  fill = INK,
): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(s)}</text>`;
}

/** ヒストグラム。classes: 階級下端の配列 + 最後に上端。fs: 度数。 */
export function histSVG(
  bounds: number[],
  fs: number[],
  highlight?: number,
): string {
  const W = 340;
  const H = 190;
  const L = 36;
  const B = 30;
  const T = 12;
  const plotW = W - L - 8;
  const plotH = H - T - B;
  const n = fs.length;
  const fmax = Math.max(...fs);
  const yMax = Math.ceil(fmax / 5) * 5;
  const bw = plotW / n;
  let s = '';
  // 軸
  s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${AX}"/>`;
  s += `<line x1="${L}" y1="${H - B}" x2="${W - 8}" y2="${H - B}" stroke="${AX}"/>`;
  for (let g = 0; g <= yMax; g += yMax / 4) {
    const y = H - B - (g / yMax) * plotH;
    s += `<line x1="${L - 3}" y1="${y}" x2="${L}" y2="${y}" stroke="${AX}"/>`;
    s += tx(L - 5, y + 3, String(g), 'end', 8, MUT);
    s += `<line x1="${L}" y1="${y}" x2="${W - 8}" y2="${y}" stroke="#e5e5e5"/>`;
  }
  for (let i = 0; i < n; i++) {
    const x = L + i * bw;
    const bh = (fs[i] / yMax) * plotH;
    const fill = highlight === i ? ACC : '#93c5fd';
    s += `<rect x="${x + 1}" y="${H - B - bh}" width="${bw - 2}" height="${bh}" fill="${fill}" stroke="#3b82f6"/>`;
    s += tx(x + bw / 2, H - B + 11, `${bounds[i]}`, 'middle', 8);
    if (i === n - 1) s += tx(x + bw, H - B + 11, `${bounds[n]}`, 'middle', 8);
    s += tx(x + bw / 2, H - B - bh - 3, String(fs[i]), 'middle', 8, ACC);
  }
  s += tx(L + plotW / 2, H - 4, '階級値', 'middle', 9, MUT);
  s += tx(10, T + 4, '度数', 'start', 9, MUT);
  return wrap(s, W, H);
}

/** 箱ひげ図（縦並び）。値の min〜max に合わせて横軸をスケール。 */
export function boxSVG(
  groups: {
    name: string;
    min: number;
    q1: number;
    med: number;
    q3: number;
    max: number;
    outliers: number[];
  }[],
): string {
  const W = 340;
  const L = 44;
  const R = 14;
  const T = 14;
  const rowH = 44;
  const B = 26;
  const H = T + rowH * groups.length + B;
  const plotW = W - L - R;
  const allV = groups.flatMap((g) => [g.min, g.max, ...g.outliers]);
  const vMin = Math.floor(Math.min(...allV) / 10) * 10;
  const vMax = Math.ceil(Math.max(...allV) / 10) * 10;
  const X = (v: number) => L + ((v - vMin) / (vMax - vMin)) * plotW;
  let s = '';
  // 軸と目盛り
  const y0 = H - B;
  s += `<line x1="${L}" y1="${y0}" x2="${W - R}" y2="${y0}" stroke="${AX}"/>`;
  for (let v = vMin; v <= vMax; v += 10) {
    const x = X(v);
    s += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + 4}" stroke="${AX}"/>`;
    s += tx(x, y0 + 15, String(v), 'middle', 8, MUT);
    s += `<line x1="${x}" y1="${T}" x2="${x}" y2="${y0}" stroke="#eee"/>`;
  }
  groups.forEach((g, i) => {
    const yc = T + rowH * i + rowH / 2 - 4;
    const bh = 20;
    // ひげ
    s += `<line x1="${X(g.min)}" y1="${yc}" x2="${X(g.q1)}" y2="${yc}" stroke="${INK}"/>`;
    s += `<line x1="${X(g.q3)}" y1="${yc}" x2="${X(g.max)}" y2="${yc}" stroke="${INK}"/>`;
    s += `<line x1="${X(g.min)}" y1="${yc - 7}" x2="${X(g.min)}" y2="${yc + 7}" stroke="${INK}"/>`;
    s += `<line x1="${X(g.max)}" y1="${yc - 7}" x2="${X(g.max)}" y2="${yc + 7}" stroke="${INK}"/>`;
    // 箱
    s += `<rect x="${X(g.q1)}" y="${yc - bh / 2}" width="${X(g.q3) - X(g.q1)}" height="${bh}" fill="#bfdbfe" stroke="${ACC}"/>`;
    s += `<line x1="${X(g.med)}" y1="${yc - bh / 2}" x2="${X(g.med)}" y2="${yc + bh / 2}" stroke="${ACC}" stroke-width="2"/>`;
    // 外れ値
    for (const o of g.outliers) {
      s += `<circle cx="${X(o)}" cy="${yc}" r="3.5" fill="none" stroke="#dc2626" stroke-width="1.5"/>`;
    }
    s += tx(L - 6, yc + 3, g.name, 'end', 11);
  });
  return wrap(s, W, H);
}

/** 散布図 2×2。各 plot は {label, pts}。0〜1 正規化座標で受け取る。 */
export function scatterSVG(
  plots: { label: string; pts: [number, number][] }[],
): string {
  const W = 340;
  const H = 320;
  const cell = 140;
  const gx = [18, 182];
  const gy = [22, 182];
  let s = '';
  plots.forEach((p, i) => {
    const x0 = gx[i % 2];
    const y0 = gy[Math.floor(i / 2)];
    s += `<rect x="${x0}" y="${y0}" width="${cell}" height="${cell}" fill="#fafafa" stroke="${AX}"/>`;
    s += tx(x0 + cell / 2, y0 - 7, `（${p.label}）`, 'middle', 11);
    s += tx(x0 + cell / 2, y0 + cell + 14, 'x', 'middle', 9, MUT);
    s += tx(x0 - 9, y0 + cell / 2, 'y', 'middle', 9, MUT);
    for (const [px, py] of p.pts) {
      s += `<circle cx="${x0 + 8 + px * (cell - 16)}" cy="${y0 + cell - 8 - py * (cell - 16)}" r="2.2" fill="${ACC}" fill-opacity="0.75"/>`;
    }
  });
  return wrap(s, W, H);
}

/** 折れ線グラフ（時系列）。 */
export function lineSVG(vals: number[], labels: string[], yLabel = ''): string {
  const W = 340;
  const H = 190;
  const L = 40;
  const B = 28;
  const T = 12;
  const plotW = W - L - 10;
  const plotH = H - T - B;
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const span = vMax - vMin || 1;
  const y0 = Math.floor(vMin - span * 0.15);
  const y1 = Math.ceil(vMax + span * 0.15);
  const X = (i: number) => L + (i / (vals.length - 1)) * plotW;
  const Y = (v: number) => H - B - ((v - y0) / (y1 - y0)) * plotH;
  let s = '';
  s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${AX}"/>`;
  s += `<line x1="${L}" y1="${H - B}" x2="${W - 10}" y2="${H - B}" stroke="${AX}"/>`;
  const step = Math.max(1, Math.ceil((y1 - y0) / 5));
  for (let v = Math.ceil(y0 / step) * step; v <= y1; v += step) {
    const y = Y(v);
    s += `<line x1="${L}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="#e5e5e5"/>`;
    s += tx(L - 4, y + 3, String(v), 'end', 8, MUT);
  }
  const path = vals
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i)},${Y(v)}`)
    .join(' ');
  s += `<path d="${path}" fill="none" stroke="${ACC}" stroke-width="1.8"/>`;
  vals.forEach((v, i) => {
    s += `<circle cx="${X(i)}" cy="${Y(v)}" r="2.6" fill="${ACC}"/>`;
  });
  labels.forEach((lb, i) => {
    if (labels.length > 13 && i % 3 !== 0) return;
    s += tx(X(i), H - B + 12, lb, 'middle', 7, MUT);
  });
  if (yLabel) s += tx(10, T + 4, yLabel, 'start', 9, MUT);
  return wrap(s, W, H);
}

/** 累積相対度数グラフ（折れ線）。bounds と cum(0〜1, 先頭0・末尾1)。 */
export function cumFreqSVG(bounds: number[], cum: number[]): string {
  const W = 340;
  const H = 200;
  const L = 38;
  const B = 30;
  const T = 12;
  const plotW = W - L - 10;
  const plotH = H - T - B;
  const vMin = bounds[0];
  const vMax = bounds[bounds.length - 1];
  const X = (v: number) => L + ((v - vMin) / (vMax - vMin)) * plotW;
  const Y = (p: number) => H - B - p * plotH;
  let s = '';
  s += `<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="${AX}"/>`;
  s += `<line x1="${L}" y1="${H - B}" x2="${W - 10}" y2="${H - B}" stroke="${AX}"/>`;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const y = Y(p);
    const emph = p === 0.25 || p === 0.5 || p === 0.75;
    s += `<line x1="${L}" y1="${y}" x2="${W - 10}" y2="${y}" stroke="${emph ? '#cbd5e1' : '#eee'}" ${emph ? 'stroke-dasharray="4 3"' : ''}/>`;
    s += tx(L - 4, y + 3, `${Math.round(p * 100)}%`, 'end', 8, MUT);
  }
  bounds.forEach((b) => {
    s += tx(X(b), H - B + 12, String(b), 'middle', 8, MUT);
  });
  const path = cum
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${X(bounds[i])},${Y(p)}`)
    .join(' ');
  s += `<path d="${path}" fill="none" stroke="${ACC}" stroke-width="1.8"/>`;
  cum.forEach((p, i) => {
    s += `<circle cx="${X(bounds[i])}" cy="${Y(p)}" r="2.6" fill="${ACC}"/>`;
  });
  s += tx(L + plotW / 2, H - 4, '階級の上限', 'middle', 9, MUT);
  s += tx(10, T + 4, '累積相対度数', 'start', 9, MUT);
  return wrap(s, W, H);
}

/** 回帰分析のソフト出力表（HTML table）。 */
export function regTableHTML(
  rows: { name: string; coef: string; se: string; t: string; p: string }[],
  r2: string,
  adjR2: string,
  n: number,
): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td style="text-align:left">${esc(r.name)}</td><td>${esc(r.coef)}</td><td>${esc(r.se)}</td><td>${esc(r.t)}</td><td>${esc(r.p)}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th style="text-align:left">変数</th><th>係数</th><th>標準誤差</th><th>t値</th><th>p値</th></tr></thead><tbody>${body}</tbody></table><table style="margin-top:4px"><tbody><tr><td style="text-align:left">R²</td><td>${esc(r2)}</td><td style="text-align:left">調整済みR²</td><td>${esc(adjR2)}</td><td style="text-align:left">n</td><td>${n}</td></tr></tbody></table>`;
}
