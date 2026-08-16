import {
  chanceForHammers,
  chancePerHammer,
  expectedHammers,
  hammersForChance,
  type MarteloConfig,
} from '../lib/martelo-math';
import { APP_VERSION } from '../changelog';
import { formatInt, formatPct, formatPctRow, formatZeny } from '../lib/format';
import { footerHtml } from '../lib/site-footer';

interface MarteloParams {
  alvo: number;
  preco: number | null;
}

const DEFAULT_PARAMS: MarteloParams = { alvo: 7, preco: null };
const CHANCE_TARGETS = [0.25, 0.5, 0.75, 0.9, 0.95, 0.99];

export function renderMarteloCalculator(
  root: HTMLElement,
  cfg: MarteloConfig,
): void {
  const initial = readParams();
  const state: MarteloParams = clamp(initial, cfg);

  root.innerHTML = `
    <header class="topbar">
      <a href="/" class="back-link" aria-label="Voltar para o início">← Voltar</a>
      <h1>${escapeHtml(cfg.title)}</h1>
    </header>
    <main class="calc">
      <section class="card inputs" aria-label="Parâmetros">
        <div class="field">
          <label for="alvo">Refino alvo (≥): <strong data-out="alvo">+${state.alvo}</strong></label>
          <input id="alvo" type="range" min="${cfg.minTarget}" max="${cfg.maxTarget}" step="1" value="${state.alvo}" />
        </div>
        <div class="field">
          <label for="preco">Preço por ${escapeHtml(cfg.itemName)} (zeny, opcional):</label>
          <input id="preco" type="number" min="0" step="any" inputmode="numeric"
            placeholder="ex: 100000" value="${state.preco ?? ''}" />
        </div>
        <p class="hint">Cada Martelo rola um refino independente — o refino atual não influencia o resultado.</p>
      </section>

      <section class="card summary" aria-labelledby="resumo-title">
        <h2 id="resumo-title">Resumo</h2>
        <div class="summary-grid">
          <div class="summary-stat">
            <div class="label">Chance por Martelo</div>
            <div class="value" data-out="chance-por-martelo">—</div>
            <div class="value-sub"></div>
          </div>
          <div class="summary-stat">
            <div class="label">Custo médio esperado</div>
            <div class="value" data-out="custo-medio-mart">—</div>
            <div class="value-sub" data-out="custo-medio-zeny"></div>
          </div>
          <div class="summary-stat">
            <div class="label">Custo mediano (50% de chance)</div>
            <div class="value" data-out="custo-mediano-mart">—</div>
            <div class="value-sub" data-out="custo-mediano-zeny"></div>
          </div>
        </div>
      </section>

      <section class="card" aria-labelledby="orcamento-title">
        <h2 id="orcamento-title">Calcule a quantidade de ${escapeHtml(cfg.itemName)}</h2>
        <table class="results">
          <thead><tr><th scope="col">Chance</th><th scope="col">${escapeHtml(cfg.itemNameShortPlural)}</th><th scope="col" data-zeny>Zeny</th></tr></thead>
          <tbody data-tbody="orcamento"></tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="chance-title">
        <h2 id="chance-title">Chance com X ${escapeHtml(cfg.itemNameShortPlural.toLowerCase())}</h2>
        <div class="custom-budget">
          <label for="custom-budget">Quantidade personalizada:</label>
          <input id="custom-budget" type="number" min="0" step="1" inputmode="numeric"
            placeholder="ex: 50" />
          <span class="custom-budget-result" data-out="custom-chance">—</span>
          <span class="custom-budget-zeny" data-out="custom-zeny" data-zeny></span>
        </div>
        <table class="results">
          <thead><tr><th scope="col">${escapeHtml(cfg.itemNameShortPlural)}</th><th scope="col">Chance</th><th scope="col" data-zeny>Zeny</th></tr></thead>
          <tbody data-tbody="chance"></tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="tabela-title">
        <h2 id="tabela-title">Tabela de Refinamento</h2>
        <table class="results">
          <thead>
            <tr>
              <th scope="col">Refino</th>
              <th scope="col">Chance</th>
            </tr>
          </thead>
          <tbody data-tbody="refinamento"></tbody>
        </table>
        <p class="reference">Fonte: <a href="${escapeHtml(cfg.referenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cfg.referenceLabel)}</a></p>
      </section>

      <section class="card share">
        <button type="button" data-action="share">🔗 Copiar link com configurações atuais</button>
        <span class="share-feedback" data-out="share-feedback" aria-live="polite"></span>
      </section>
    </main>
    ${footerHtml(APP_VERSION)}
  `;

  const alvoInput = root.querySelector<HTMLInputElement>('#alvo')!;
  const precoInput = root.querySelector<HTMLInputElement>('#preco')!;
  const customInput = root.querySelector<HTMLInputElement>('#custom-budget')!;
  const customResult = root.querySelector<HTMLElement>('[data-out="custom-chance"]')!;
  const customZeny = root.querySelector<HTMLElement>('[data-out="custom-zeny"]')!;
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-action="share"]')!;
  const shareFeedback = root.querySelector<HTMLElement>('[data-out="share-feedback"]')!;
  let customHammers: number | null = null;

  const onAlvo = () => {
    state.alvo = clampInt(alvoInput.value, cfg.minTarget, cfg.maxTarget, state.alvo);
    alvoInput.value = String(state.alvo);
    update();
  };

  const onPreco = () => {
    const raw = precoInput.value.trim();
    if (raw === '') {
      state.preco = null;
    } else {
      const n = Number.parseFloat(raw);
      state.preco = Number.isFinite(n) && n > 0 ? n : null;
    }
    update();
  };

  const onCustom = () => {
    const raw = customInput.value.trim();
    if (raw === '') {
      customHammers = null;
    } else {
      const n = Number.parseFloat(raw);
      customHammers = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
    renderCustom();
  };

  alvoInput.addEventListener('input', onAlvo);
  precoInput.addEventListener('input', onPreco);
  customInput.addEventListener('input', onCustom);

  shareBtn.addEventListener('click', async () => {
    const url = buildShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
      shareFeedback.textContent = 'Link copiado!';
    } catch {
      shareFeedback.textContent = url;
    }
    setTimeout(() => {
      shareFeedback.textContent = '';
    }, 2500);
  });

  update();

  function update(): void {
    writeParams(state);
    setText(root, '[data-out="alvo"]', `+${state.alvo}`);
    toggleZenyColumns(root, state.preco != null);

    const p = chancePerHammer(cfg, state.alvo);
    const expected = expectedHammers(cfg, state.alvo);
    const median = hammersForChance(cfg, state.alvo, 0.5);

    setText(root, '[data-out="chance-por-martelo"]', formatPct(p));
    setText(
      root,
      '[data-out="custo-medio-mart"]',
      `${formatInt(expected)} ${cfg.itemNameShortPlural.toLowerCase()}`,
    );
    setText(root, '[data-out="custo-medio-zeny"]', zenyOrEmpty(expected, state.preco));
    setText(
      root,
      '[data-out="custo-mediano-mart"]',
      `${formatInt(median)} ${cfg.itemNameShortPlural.toLowerCase()}`,
    );
    setText(root, '[data-out="custo-mediano-zeny"]', zenyOrEmpty(median, state.preco));

    renderOrcamento();
    renderChance();
    renderRefinamento();
    renderCustom();
  }

  function renderCustom(): void {
    if (customHammers == null) {
      customResult.textContent = '—';
      customZeny.textContent = '';
      return;
    }
    const chance = chanceForHammers(cfg, state.alvo, customHammers);
    customResult.textContent = `Chance: ${formatPct(chance)}`;
    customZeny.textContent =
      state.preco != null ? `(${formatZeny(customHammers * state.preco)})` : '';
  }

  function renderOrcamento(): void {
    const tbody = root.querySelector<HTMLTableSectionElement>('[data-tbody="orcamento"]')!;
    const budgets = CHANCE_TARGETS.map((c) => hammersForChance(cfg, state.alvo, c));
    // For target +1 every row collapses to 1 — drop dups so the table stays meaningful.
    const rows = CHANCE_TARGETS
      .map((chance, i) => ({ chance, budget: budgets[i]! }))
      .filter((row, i) => i === budgets.length - 1 || row.budget !== budgets[i + 1]);
    tbody.innerHTML = rows
      .map(
        ({ chance, budget }) => `<tr>
        <td>${formatPctRow(chance)}</td>
        <td>${formatInt(budget)}</td>
        <td data-zeny>${zenyOrEmpty(budget, state.preco)}</td>
      </tr>`,
      )
      .join('');
  }

  function renderChance(): void {
    const tbody = root.querySelector<HTMLTableSectionElement>('[data-tbody="chance"]')!;
    const samples = computeSamples(cfg, state.alvo);
    if (samples.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    const probs = samples.map((b) => chanceForHammers(cfg, state.alvo, b));
    tbody.innerHTML = samples
      .map(
        (b, i) => `<tr>
        <td>${formatInt(b)}</td>
        <td>${formatPct(probs[i]!)}</td>
        <td data-zeny>${zenyOrEmpty(b, state.preco)}</td>
      </tr>`,
      )
      .join('');
  }

  function renderRefinamento(): void {
    const tbody = root.querySelector<HTMLTableSectionElement>(
      '[data-tbody="refinamento"]',
    )!;
    tbody.innerHTML = cfg.refinements
      .map((r) => {
        const isTarget = r.level >= state.alvo;
        return `<tr${isTarget ? ' class="target-row"' : ''}>
        <td>+${r.level}</td>
        <td>${formatPct(r.chance)}</td>
      </tr>`;
      })
      .join('');
  }
}

function computeSamples(cfg: MarteloConfig, target: number): number[] {
  const lo = hammersForChance(cfg, target, 0.1);
  const hi = hammersForChance(cfg, target, 0.95);
  const lower = Number.isFinite(lo) ? Math.max(1, lo) : 1;
  const upper = Number.isFinite(hi) ? hi : lower;
  if (upper <= lower) return [roundToNice(upper)];
  const stops = 6;
  const out = new Set<number>();
  for (let i = 0; i < stops; i++) {
    const ratio = i / (stops - 1);
    const v = Math.round(lower + (upper - lower) * ratio);
    out.add(roundToNice(v));
  }
  return [...out].sort((a, b) => a - b);
}

function roundToNice(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const lead = n / mag;
  let nice: number;
  if (lead < 1.5) nice = 1;
  else if (lead < 3.5) nice = 2;
  else if (lead < 7.5) nice = 5;
  else nice = 10;
  return Math.max(1, Math.round(nice * mag));
}

function readParams(): MarteloParams {
  const url = new URL(window.location.href);
  const alvoRaw = url.searchParams.get('alvo');
  const precoRaw = url.searchParams.get('preco');
  const alvo = alvoRaw != null ? Number.parseInt(alvoRaw, 10) : DEFAULT_PARAMS.alvo;
  const preco = precoRaw != null ? Number.parseFloat(precoRaw) : null;
  return {
    alvo: Number.isFinite(alvo) ? alvo : DEFAULT_PARAMS.alvo,
    preco: preco != null && Number.isFinite(preco) && preco > 0 ? preco : null,
  };
}

function writeParams(params: MarteloParams): void {
  const url = new URL(window.location.href);
  if (params.alvo === DEFAULT_PARAMS.alvo) url.searchParams.delete('alvo');
  else url.searchParams.set('alvo', String(params.alvo));
  if (params.preco == null) url.searchParams.delete('preco');
  else url.searchParams.set('preco', String(params.preco));
  history.replaceState(null, '', url.toString());
}

function buildShareUrl(params: MarteloParams): string {
  const url = new URL(window.location.href);
  if (params.alvo === DEFAULT_PARAMS.alvo) url.searchParams.delete('alvo');
  else url.searchParams.set('alvo', String(params.alvo));
  if (params.preco == null) url.searchParams.delete('preco');
  else url.searchParams.set('preco', String(params.preco));
  return url.toString();
}

function clamp(p: MarteloParams, cfg: MarteloConfig): MarteloParams {
  const alvo = clampInt(String(p.alvo), cfg.minTarget, cfg.maxTarget, DEFAULT_PARAMS.alvo);
  return { alvo, preco: p.preco };
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function setText(root: HTMLElement, selector: string, value: string): void {
  const el = root.querySelector(selector);
  if (el) el.textContent = value;
}

function toggleZenyColumns(root: HTMLElement, show: boolean): void {
  root.querySelectorAll<HTMLElement>('[data-zeny]').forEach((el) => {
    el.style.display = show ? '' : 'none';
  });
}

function zenyOrEmpty(hammers: number, price: number | null): string {
  if (price == null) return '';
  return formatZeny(hammers * price);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
}
