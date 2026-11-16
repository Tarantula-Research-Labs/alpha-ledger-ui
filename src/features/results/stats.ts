// Small statistics used by the results dashboard. The research numbers themselves come from MLflow;
// these only summarise logged per-fold tables and daily returns (means, CIs, equity curves).

export const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

export const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

export function sd(a: number[]): number {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

export function median(a: number[]): number {
  const b = [...a].sort((x, y) => x - y);
  const n = b.length;
  return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
}

export function quantile(a: number[], q: number): number {
  const b = [...a].sort((x, y) => x - y);
  const p = (b.length - 1) * q;
  const i = Math.floor(p);
  return b[i] + (b[Math.min(i + 1, b.length - 1)] - b[i]) * (p - i);
}

// 97.5% point of the t distribution (Cornish-Fisher expansion; accurate to ~3 decimals for df >= 3).
function t975(df: number): number {
  const z = 1.959964;
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}

export interface CI {
  m: number;
  lo: number;
  hi: number;
  n: number;
  s: number;
}

/** Mean with a 95% t-interval over the finite values (n = folds). */
export function tCI(values: (number | null | undefined)[]): CI {
  const a = values.filter(isNum);
  const n = a.length;
  const m = n ? mean(a) : NaN;
  const s = sd(a);
  const h = n > 1 ? (t975(n - 1) * s) / Math.sqrt(n) : NaN;
  return { m, lo: m - h, hi: m + h, n, s };
}

export function corr(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

function ranks(a: number[]): number[] {
  const order = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const r = new Array<number>(a.length);
  let k = 0;
  while (k < order.length) {
    let j = k;
    while (j + 1 < order.length && order[j + 1][0] === order[k][0]) j++;
    const avg = (k + j) / 2;
    for (let t = k; t <= j; t++) r[order[t][1]] = avg;
    k = j + 1;
  }
  return r;
}

export const spearman = (a: number[], b: number[]) => corr(ranks(a), ranks(b));

/** Share k/n with a 95% Wilson interval (behaves well for small n and shares near 0 or 1). */
export function wilson(k: number, n: number): { p: number; lo: number; hi: number; k: number; n: number } {
  if (!n) return { p: NaN, lo: NaN, hi: NaN, k, n };
  const z = 1.959964;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { p, lo: centre - half, hi: centre + half, k, n };
}

/** Equity curve (starting at 1) from daily log returns. */
export function equityFromLog(logRets: number[]): number[] {
  let s = 0;
  return logRets.map((x) => Math.exp((s += x)));
}

export function drawdown(equity: number[]): number[] {
  let peak = -Infinity;
  return equity.map((e) => {
    peak = Math.max(peak, e);
    return e / peak - 1;
  });
}

/** Compounded simple return over a slice of daily log returns. */
export const periodReturn = (logRets: number[]) => Math.exp(logRets.reduce((s, x) => s + x, 0)) - 1;

/** AUC: chance a random positive gets a higher score than a random negative (ties count half). 0.5 = random. */
export function auc(scores: number[], labels: number[]): number {
  const pos = labels.filter((y) => y === 1).length;
  const neg = labels.length - pos;
  if (!pos || !neg) return NaN;
  const r = ranks(scores);
  const sumPos = r.reduce((s, x, i) => s + (labels[i] === 1 ? x + 1 : 0), 0);
  return (sumPos - (pos * (pos + 1)) / 2) / (pos * neg);
}

/** ROC curve points (false positive rate, true positive rate), from the highest score down. */
export function rocCurve(scores: number[], labels: number[]): { fpr: number; tpr: number }[] {
  const pos = labels.filter((y) => y === 1).length;
  const neg = labels.length - pos;
  if (!pos || !neg) return [];
  const order = scores.map((s, i) => [s, labels[i]] as const).sort((a, b) => b[0] - a[0]);
  const pts = [{ fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  for (let i = 0; i < order.length; i++) {
    if (order[i][1] === 1) tp++;
    else fp++;
    if (i === order.length - 1 || order[i + 1][0] !== order[i][0]) pts.push({ fpr: fp / neg, tpr: tp / pos });
  }
  return pts;
}
