import {
  budgetForChance,
  expectedCost,
  maxLevel,
  probabilitiesAtBudgets,
  type EnchantConfig,
} from '../lib/enchant-dp';
import { formatInt, formatPct, formatPctRow, formatZeny } from '../lib/format';
import {
  buildShareUrl,
  readParams,
  writeParams,
  type CalcParams,
} from '../lib/permalink';

const DEFAULT_PARAMS: CalcParams = { atual: 1, alvo: 5, preco: null };
const CHANCE_TARGETS = [0.25, 0.5, 0.75, 0.9, 0.95, 0.99];

interface State extends CalcParams {}

export function renderCalculator(root: HTMLElement, cfg: EnchantConfig): void {
  const max = maxLevel(cfg);
  const initial = readParams(DEFAULT_PARAMS);
  const state: State = clamp(initial, max);
  const budgetSamples = computeBudgetSamples(cfg);

  root.innerHTML = `
    <header class="topbar">
      <a href="/" class="back-link" aria-label="Voltar para o início">← Voltar</a>
      <h1>${escapeHtml(cfg.title)}</h1>
    </header>
    <main class="calc">
      <section class="card inputs" aria-label="Parâmetros">
        <div class="field">
          <label for="atual">Nível atual: <strong data-out="atual">${state.atual}</strong></label>
          <input id="atual" type="range" min="1" max="${max - 1}" step="1" value="${state.atual}" />
        </div>
        <div class="field">
          <label for="alvo">Nível alvo: <strong data-out="alvo">${state.alvo}</strong></label>
          <input id="alvo" type="range" min="2" max="${max}" step="1" value="${state.alvo}" />
        </div>
        <div class="field">
          <label for="preco">Preço por ${escapeHtml(cfg.itemName)} (zeny, opcional):</label>
          <input id="preco" type="number" min="0" step="any" inputmode="numeric"
            placeholder="ex: 1500" value="${state.preco ?? ''}" />
        </div>
      </section>

      <section class="card summary" aria-labelledby="resumo-title">
        <h2 id="resumo-title">Resumo</h2>
        <div class="summary-grid">
          <div class="summary-stat">
            <div class="label">Custo médio esperado</div>
            <div class="value" data-out="custo-medio-frag">—</div>
            <div class="value-sub" data-out="custo-medio-zeny"></div>
          </div>
          <div class="summary-stat">
            <div class="label">Custo mediano (50% de chance)</div>
            <div class="value" data-out="custo-mediano-frag">—</div>
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
            placeholder="ex: 1500" />
          <span class="custom-budget-result" data-out="custom-chance">—</span>
          <span class="custom-budget-zeny" data-out="custom-zeny" data-zeny></span>
        </div>
        <table class="results">
          <thead><tr><th scope="col">${escapeHtml(cfg.itemNameShortPlural)}</th><th scope="col">Chance</th><th scope="col" data-zeny>Zeny</th></tr></thead>
          <tbody data-tbody="chance"></tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="tabela-title">
        <h2 id="tabela-title">Tabela de Encantamento</h2>
        <table class="results">
          <thead>
            <tr>
              <th scope="col">Nível</th>
              <th scope="col">${escapeHtml(cfg.itemName)}</th>
              <th scope="col">Chance</th>
            </tr>
          </thead>
          <tbody>
            ${cfg.transitions
              .map(
                (t, i) => `<tr>
                  <td>${i + 1} → ${i + 2}</td>
                  <td>${formatInt(t.cost)}</td>
                  <td>${formatPctRow(t.successChance)}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        <p class="reference">Fonte: <a href="${escapeHtml(cfg.referenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(cfg.referenceLabel)}</a></p>
      </section>

      <section class="card share">
        <button type="button" data-action="share">🔗 Copiar link com configurações atuais</button>
        <span class="share-feedback" data-out="share-feedback" aria-live="polite"></span>
      </section>
    </main>
    <footer class="site-footer">
      <p>Veja também: <a href="https://ragnarecap.web.app/" target="_blank" rel="noopener noreferrer">RagnaRecap</a> — análise de replays de Ragnarok Online.</p>
      <p>Projeto open source. Sugestões e bugs no <a href="https://github.com/adsonpleal/ragcalc" target="_blank" rel="noopener noreferrer">GitHub</a>.</p>
    </footer>
  `;

  const atualInput = root.querySelector<HTMLInputElement>('#atual')!;
  const alvoInput = root.querySelector<HTMLInputElement>('#alvo')!;
  const precoInput = root.querySelector<HTMLInputElement>('#preco')!;
  const customInput = root.querySelector<HTMLInputElement>('#custom-budget')!;
  const customResult = root.querySelector<HTMLElement>('[data-out="custom-chance"]')!;
  const customZeny = root.querySelector<HTMLElement>('[data-out="custom-zeny"]')!;
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-action="share"]')!;
  const shareFeedback = root.querySelector<HTMLElement>('[data-out="share-feedback"]')!;
  let customBudget: number | null = null;

  const onAtual = () => {
    const v = clampInt(atualInput.value, 1, max - 1, state.atual);
    state.atual = v;
    if (state.alvo <= state.atual) {
      state.alvo = Math.min(max, state.atual + 1);
      alvoInput.value = String(state.alvo);
    }
    atualInput.value = String(state.atual);
    update();
  };

  const onAlvo = () => {
    const v = clampInt(alvoInput.value, 2, max, state.alvo);
    state.alvo = v;
    if (state.atual >= state.alvo) {
      state.atual = Math.max(1, state.alvo - 1);
      atualInput.value = String(state.atual);
    }
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
      customBudget = null;
    } else {
      const n = Number.parseFloat(raw);
      customBudget = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
    renderCustom();
  };

  atualInput.addEventListener('input', onAtual);
  alvoInput.addEventListener('input', onAlvo);
  precoInput.addEventListener('input', onPreco);
  customInput.addEventListener('input', onCustom);

  shareBtn.addEventListener('click', async () => {
    const url = buildShareUrl(state, DEFAULT_PARAMS);
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
    writeParams(state, DEFAULT_PARAMS);
    setText(root, '[data-out="atual"]', String(state.atual));
    setText(root, '[data-out="alvo"]', String(state.alvo));
    toggleZenyColumns(root, state.preco != null);

    const expected = expectedCost(cfg, state.atual, state.alvo);
    const median = budgetForChance(cfg, state.atual, state.alvo, 0.5);

    setText(root, '[data-out="custo-medio-frag"]', `${formatInt(expected)} ${cfg.itemNameShortPlural.toLowerCase()}`);
    setText(root, '[data-out="custo-medio-zeny"]', zenyOrEmpty(expected, state.preco));

    setText(root, '[data-out="custo-mediano-frag"]', `${formatInt(median)} ${cfg.itemNameShortPlural.toLowerCase()}`);
    setText(root, '[data-out="custo-mediano-zeny"]', zenyOrEmpty(median, state.preco));

    renderOrcamento();
    renderChance();
    renderCustom();
  }

  function renderCustom(): void {
    if (customBudget == null) {
      customResult.textContent = '—';
      customZeny.textContent = '';
      return;
    }
    const p = probabilitiesAtBudgets(cfg, state.atual, state.alvo, [customBudget])[0]!;
    customResult.textContent = `Chance: ${formatPct(p)}`;
    customZeny.textContent = state.preco != null ? `(${formatZeny(customBudget * state.preco)})` : '';
  }

  function renderOrcamento(): void {
    const tbody = root.querySelector<HTMLTableSectionElement>('[data-tbody="orcamento"]')!;
    const budgets = CHANCE_TARGETS.map((c) => budgetForChance(cfg, state.atual, state.alvo, c));
    // Drop rows whose budget collapses with a higher target — the displayed
    // chance would be misleading (e.g. "25%: 4" when 4 frags actually grants 50%).
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
    const samples = budgetSamples(state.atual, state.alvo);
    if (samples.length === 0) {
      tbody.innerHTML = '';
      return;
    }
    const probs = probabilitiesAtBudgets(cfg, state.atual, state.alvo, samples);
    tbody.innerHTML = samples
      .map((b, i) => {
        return `<tr>
        <td>${formatInt(b)}</td>
        <td>${formatPct(probs[i]!)}</td>
        <td data-zeny>${zenyOrEmpty(b, state.preco)}</td>
      </tr>`;
      })
      .join('');
  }
}

function computeBudgetSamples(
  cfg: EnchantConfig,
): (atual: number, alvo: number) => number[] {
  return (atual, alvo) => {
    if (atual === alvo) return [];
    const lo = budgetForChance(cfg, atual, alvo, 0.10);
    const hi = budgetForChance(cfg, atual, alvo, 0.95);
    const fallbackHi = Math.max(
      cfg.transitions[atual - 1]!.cost * 200,
      expectedCost(cfg, atual, alvo) * 4,
    );
    const lower = Number.isFinite(lo) ? Math.max(1, lo) : 1;
    const upper = Number.isFinite(hi) ? hi : fallbackHi;
    if (upper <= lower) return [roundToNice(upper)];
    const stops = 6;
    const out = new Set<number>();
    for (let i = 0; i < stops; i++) {
      const ratio = i / (stops - 1);
      const v = Math.round(lower + (upper - lower) * ratio);
      out.add(roundToNice(v));
    }
    return [...out].sort((a, b) => a - b);
  };
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
  return Math.round(nice * mag);
}

function clamp(p: CalcParams, max: number): State {
  let atual = clampInt(String(p.atual), 1, max - 1, 1);
  let alvo = clampInt(String(p.alvo), 2, max, max);
  if (alvo <= atual) alvo = Math.min(max, atual + 1);
  return { atual, alvo, preco: p.preco };
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

function zenyOrEmpty(fragments: number, price: number | null): string {
  if (price == null) return '';
  return formatZeny(fragments * price);
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
