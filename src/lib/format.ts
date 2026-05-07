const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const pctIntFmt = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 0,
});
const decFmt = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return intFmt.format(Math.round(n));
}

export function formatZeny(zeny: number): string {
  if (!Number.isFinite(zeny) || zeny <= 0) return '—';
  if (zeny >= 1_000_000_000) return `${decFmt.format(zeny / 1_000_000_000)}B z`;
  if (zeny >= 1_000_000) return `${decFmt.format(zeny / 1_000_000)}M z`;
  if (zeny >= 10_000) return `${decFmt.format(zeny / 1_000)}K z`;
  return `${formatInt(zeny)} z`;
}

export function formatPct(p: number): string {
  if (!Number.isFinite(p)) return '—';
  if (p >= 0.999) return '≥ 99,9%';
  if (p < 0.001 && p > 0) return '< 0,1%';
  return pctFmt.format(p);
}

export function formatPctRow(p: number): string {
  if (!Number.isFinite(p)) return '—';
  return pctIntFmt.format(p);
}
