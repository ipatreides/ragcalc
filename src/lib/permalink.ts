export interface CalcParams {
  atual: number;
  alvo: number;
  preco: number | null;
}

export function readParams(defaults: CalcParams): CalcParams {
  const url = new URL(window.location.href);
  const atual = parseIntParam(url.searchParams.get('atual'), defaults.atual);
  const alvo = parseIntParam(url.searchParams.get('alvo'), defaults.alvo);
  const preco = parseFloatParam(url.searchParams.get('preco'), defaults.preco);
  return { atual, alvo, preco };
}

export function writeParams(params: CalcParams, defaults: CalcParams): void {
  const url = new URL(window.location.href);
  setOrDelete(url.searchParams, 'atual', params.atual, defaults.atual);
  setOrDelete(url.searchParams, 'alvo', params.alvo, defaults.alvo);
  setOrDeleteFloat(url.searchParams, 'preco', params.preco, defaults.preco);
  history.replaceState(null, '', url.toString());
}

export function buildShareUrl(params: CalcParams, defaults: CalcParams): string {
  const url = new URL(window.location.href);
  setOrDelete(url.searchParams, 'atual', params.atual, defaults.atual);
  setOrDelete(url.searchParams, 'alvo', params.alvo, defaults.alvo);
  setOrDeleteFloat(url.searchParams, 'preco', params.preco, defaults.preco);
  return url.toString();
}

function parseIntParam(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseFloatParam(raw: string | null, fallback: number | null): number | null {
  if (raw == null) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function setOrDelete(p: URLSearchParams, key: string, value: number, fallback: number): void {
  if (value === fallback) p.delete(key);
  else p.set(key, String(value));
}

function setOrDeleteFloat(
  p: URLSearchParams,
  key: string,
  value: number | null,
  fallback: number | null,
): void {
  if (value === fallback || value == null) p.delete(key);
  else p.set(key, String(value));
}
