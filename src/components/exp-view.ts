import {
  type Band,
  BANDS,
  DEFAULT_SERVER,
  type ExpItem,
  ICON_URL,
  ITEM_BY_ID,
  itemsForPool,
  POOLS,
  type Server,
  SERVERS,
  type SlotDef,
  SLOTS,
} from '../lib/exp-data';
import { APP_VERSION } from '../changelog';
import { computeBreakdown } from '../lib/exp-math';
import {
  buildExpShareUrl,
  readExpState,
  type Selection,
  writeExpState,
} from '../lib/exp-permalink';
import {
  CLASS_BY_ID,
  CLASS_GROUPS,
  CLASSES,
  DEFAULT_CLASS_ID,
  type Gender,
  jobIconUrl,
  resolveGender,
} from '../lib/classes';
import { footerHtml } from '../lib/site-footer';

const RAGASSETS = 'https://assets.latam-tools.com.br';
// Taller render than the reference (169) so full headgear + under-ground poses
// (sit/dead) fit: 175px above the ground origin, 55px below.
const CANVAS = '200x230+100+175';

interface State {
  band: Band;
  selection: Selection;
  openSlot: string | null;
  openPools: Set<string>;
  job: number;
  classOpen: boolean;
  gender: Gender;
  bodyDir: number;
  action: number;
  server: Server;
}

const SERVER_STORAGE_KEY = 'ragcalc.server';

function readServer(): Server {
  try {
    const raw = localStorage.getItem(SERVER_STORAGE_KEY);
    if (raw && SERVERS.some((s) => s.code === raw)) return raw as Server;
  } catch {
    // localStorage may be unavailable (private mode) — fall back to default.
  }
  return DEFAULT_SERVER;
}

// Animation states offered by the action picker. `type` is the animationType
// half of the gateway's `action = type * 8 + bodyDir` encoding.
const ACTIONS: ReadonlyArray<{ type: number; label: string }> = [
  { type: 0, label: 'Parado' },
  { type: 1, label: 'Andar' },
  { type: 2, label: 'Sentar' },
  { type: 3, label: 'Pegar item' },
  { type: 4, label: 'Em guarda' },
  { type: 5, label: 'Atacar 1' },
  { type: 10, label: 'Atacar 2' },
  { type: 11, label: 'Atacar 3' },
  { type: 12, label: 'Conjurando' },
  { type: 6, label: 'Ferido' },
  { type: 7, label: 'Atordoado' },
  { type: 8, label: 'Morto' },
  { type: 9, label: 'Congelado' },
];

// Slots shown in the "principal" grid; cards sit as sub-slots under their parent.
// The principal slots laid out as independent vertical column stacks. Each card
// / extra slot sits directly under its parent within the same column, so the
// columns pack tightly with no cross-row gaps.
const PRINCIPAL_COLUMNS: string[][] = [
  ['topo', 'meio', 'baixo', 'arma'],
  ['armadura', 'cartaArmadura', 'escudo', 'capa'],
  ['calcado', 'cartaCalcado', 'acessorio1', 'acessorio2'],
];
const EXTRA_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Equipamentos Sombrios', keys: ['sombrioArma', 'sombrioEscudo', 'sombrioCalcado'] },
  { title: 'Visuais (Costume)', keys: ['visualTopo', 'visualMeio', 'visualCapa'] },
  { title: 'Pedras de EXP', keys: ['pedraTopo', 'pedraMeio', 'pedraBaixo'] },
];

export function renderExpCalculator(root: HTMLElement): void {
  const initial = readExpState();
  const state: State = {
    band: initial.band,
    selection: initial.selection,
    openSlot: null,
    openPools: new Set(),
    job: DEFAULT_CLASS_ID,
    classOpen: false,
    gender: 'male',
    bodyDir: 0,
    action: 0,
    server: readServer(),
  };

  document.addEventListener('click', () => {
    let changed = false;
    if (state.openSlot !== null) {
      state.openSlot = null;
      changed = true;
    }
    if (state.classOpen) {
      state.classOpen = false;
      changed = true;
    }
    if (changed) render();
  });

  render();

  function selectedIds(): number[] {
    return [...state.selection.values()];
  }

  function equip(slotKey: string, id: number): void {
    state.selection.set(slotKey, id);
    state.openSlot = null;
    persist();
    render();
    flash(slotKey);
  }

  function equipToPool(pool: string, id: number): void {
    const slots = SLOTS.filter((s) => s.pool === pool);
    const target =
      slots.find((s) => !state.selection.has(s.key)) ?? slots[0];
    if (target) equip(target.key, id);
  }

  function clearSlot(slotKey: string): void {
    state.selection.delete(slotKey);
    state.openSlot = null;
    persist();
    render();
  }

  function setBand(band: Band): void {
    state.band = band;
    state.openSlot = null;
    persist();
    render();
  }

  function setServer(server: Server): void {
    state.server = server;
    try {
      localStorage.setItem(SERVER_STORAGE_KEY, server);
    } catch {
      // ignore — persistence is best-effort
    }
    render();
  }

  function persist(): void {
    writeExpState({ band: state.band, selection: state.selection });
  }

  function flash(slotKey: string): void {
    const el = root.querySelector<HTMLElement>(`.equip-slot[data-slot="${slotKey}"]`);
    if (!el) return;
    el.classList.remove('is-flash');
    // Reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add('is-flash');
  }

  function render(): void {
    const breakdown = computeBreakdown(selectedIds(), state.band);

    root.innerHTML = `
      <header class="topbar">
        <a href="/" class="back-link" aria-label="Voltar para o início">← Voltar</a>
        <h1>Conjunto de EXP</h1>
      </header>
      <main class="calc exp-calc">
        <section class="card exp-total-card">
          <div class="exp-total">
            <span class="exp-total-label">EXP total ao derrotar monstros</span>
            <strong class="exp-total-value">+${breakdown.total}%</strong>
          </div>
          <div class="top-controls">
            <fieldset class="band-select">
              <legend>Faixa de nível</legend>
              ${BANDS.map(
                (b) => `
                <label class="band-option${b.key === state.band ? ' is-active' : ''}">
                  <input type="radio" name="band" value="${b.key}" ${b.key === state.band ? 'checked' : ''} />
                  <span>${escapeHtml(b.label)}</span>
                </label>`,
              ).join('')}
            </fieldset>
            <label class="server-select">
              <span>Servidor (links do Mercado)</span>
              <select data-server>
                ${SERVERS.map(
                  (s) =>
                    `<option value="${s.code}" ${s.code === state.server ? 'selected' : ''}>${escapeHtml(s.label)}</option>`,
                ).join('')}
              </select>
            </label>
          </div>
        </section>

        <section class="card exp-builder" aria-label="Montagem do conjunto">
          <div class="exp-builder-grid">
            <div class="equip-area">
              ${renderPrincipalGrid()}
              ${EXTRA_GROUPS.map(renderGroup).join('')}
            </div>
            ${renderCharacter()}
          </div>
          <p class="hint">Clique em um slot para escolher um item. Itens de acessório
            podem ir nos dois slots. Cartas e equipamentos sem visual não aparecem no boneco.</p>
        </section>

        <section class="card exp-cart" aria-labelledby="cart-title">
          <h2 id="cart-title">Lista de Equipamentos</h2>
          ${renderCart(breakdown)}
        </section>

        <section class="exp-tables" aria-label="Itens por slot">
          ${POOLS.map((p) => renderPoolTable(p.pool, p.label)).join('')}
        </section>

        <section class="card share">
          <button type="button" data-action="share">🔗 Copiar link com o conjunto atual</button>
          <span class="share-feedback" data-out="share-feedback" aria-live="polite"></span>
        </section>
      </main>
      ${footerHtml(APP_VERSION)}
    `;

    bindEvents();
    if (state.openSlot) {
      root.querySelector<HTMLInputElement>('.slot-dropdown .dd-filter')?.focus();
    }
    if (state.classOpen) {
      const popup = root.querySelector<HTMLElement>('.class-popup');
      const selEl = popup?.querySelector<HTMLElement>('.class-option.is-selected');
      if (popup && selEl) {
        popup.scrollTop = selEl.offsetTop - popup.clientHeight / 2 + selEl.clientHeight / 2;
      }
    }
  }

  function renderPrincipalGrid(): string {
    const cols = PRINCIPAL_COLUMNS.map(
      (keys) =>
        `<div class="equip-col">${keys
          .map((k) => renderSlot(SLOTS.find((s) => s.key === k)!))
          .join('')}</div>`,
    ).join('');
    return `<div class="equip-group"><div class="equip-columns">${cols}</div></div>`;
  }

  function renderGroup(group: { title: string; keys: string[] }): string {
    const slots = group.keys
      .map((k) => SLOTS.find((s) => s.key === k))
      .filter((s): s is SlotDef => s != null);
    return `<div class="equip-group">
      <div class="equip-group-title">${escapeHtml(group.title)}</div>
      <div class="equip-grid">
        ${slots.map((s) => `<div class="equip-cell">${renderSlot(s)}</div>`).join('')}
      </div>
    </div>`;
  }

  function renderSlot(slot: SlotDef): string {
    const id = state.selection.get(slot.key);
    const item = id != null ? ITEM_BY_ID.get(id) : undefined;
    const open = state.openSlot === slot.key;
    const filled = item != null;
    const isCard = slot.group === 'carta';
    const cls = `equip-slot${isCard ? ' equip-slot--card' : ''}${filled ? ' is-filled' : ''}${open ? ' is-open' : ''}`;
    const body = filled
      ? `${icon(item.id, 22, 'slot-icon')}
         <span class="slot-name">${escapeHtml(item.name)}</span>
         <span class="slot-exp">+${item.exp[state.band]}%</span>`
      : `<span class="slot-empty">Selecionar…</span>`;
    return `<div class="${cls}" data-slot="${slot.key}" tabindex="0" role="button"
        aria-label="${escapeHtml(slot.label)}">
      <span class="slot-tag">${escapeHtml(slot.label)}</span>
      <div class="slot-body">${body}</div>
      ${open ? renderDropdown(slot) : ''}
    </div>`;
  }

  function renderDropdown(slot: SlotDef): string {
    const items = itemsForPool(slot.pool);
    const rows = items
      .map(
        (it) => `<button type="button" class="dd-row" data-equip="${it.id}"
          data-slot="${slot.key}" data-name="${escapeHtml(it.name.toLowerCase())}">
          ${icon(it.id, 18, 'dd-icon')}
          <span class="dd-name">${escapeHtml(it.name)}</span>
          ${raceBadge(it)}
          <span class="dd-exp">+${it.exp[state.band]}%</span>
        </button>`,
      )
      .join('');
    const canRemove = state.selection.has(slot.key);
    return `<div class="slot-dropdown" data-dd>
      <input type="text" class="dd-filter" placeholder="Filtrar…" aria-label="Filtrar itens" />
      ${canRemove ? `<button type="button" class="dd-row dd-remove" data-remove="${slot.key}">✕ Remover</button>` : ''}
      <div class="dd-rows">${rows || '<div class="dd-empty">Nenhum item.</div>'}</div>
    </div>`;
  }

  function renderCharacter(): string {
    const url = characterUrl(state);
    const cls = CLASS_BY_ID.get(state.job);
    const activeGender = resolveGender(state.job, state.gender);
    const hasMale = !cls || cls.genders.includes('male');
    const hasFemale = !cls || cls.genders.includes('female');
    const options = CLASS_GROUPS.map((g) => {
      const items = CLASSES.filter((c) => c.group === g.key);
      if (items.length === 0) return '';
      return `<div class="class-group-label">${escapeHtml(g.label)}</div>${items
        .map((c) => {
          const sel = c.id === state.job;
          return `<button type="button" class="class-option${sel ? ' is-selected' : ''}"
            role="option" aria-selected="${sel}" data-class-id="${c.id}">
            ${classIcon(c.id)}
            <span class="class-option-name">${escapeHtml(c.name)}</span>
          </button>`;
        })
        .join('')}`;
    }).join('');
    return `<div class="character-viewer">
      <div class="character-stage">
        <img class="character-sprite" src="${escapeHtml(url)}" alt="Prévia do personagem" decoding="async" />
      </div>
      <div class="class-picker" data-class-picker>
        <button type="button" class="class-trigger" data-class-toggle
          aria-haspopup="listbox" aria-expanded="${state.classOpen}">
          ${classIcon(state.job)}
          <span class="class-trigger-name">${escapeHtml(cls?.name ?? String(state.job))}</span>
          <span class="class-caret">▾</span>
        </button>
        <div class="class-popup" role="listbox" ${state.classOpen ? '' : 'hidden'}>
          ${options}
        </div>
      </div>
      <select class="action-select" data-action-select aria-label="Ação do personagem">
        ${ACTIONS.map(
          (a) =>
            `<option value="${a.type}" ${a.type === state.action ? 'selected' : ''}>${escapeHtml(a.label)}</option>`,
        ).join('')}
      </select>
      <div class="character-controls">
        <button type="button" class="rot-btn" data-rot="-1" aria-label="Girar para a esquerda">←</button>
        <div class="gender-toggle">
          <button type="button" data-gender="male" class="${activeGender === 'male' ? 'is-active' : ''}" ${hasMale ? '' : 'disabled'}>♂</button>
          <button type="button" data-gender="female" class="${activeGender === 'female' ? 'is-active' : ''}" ${hasFemale ? '' : 'disabled'}>♀</button>
        </div>
        <button type="button" class="rot-btn" data-rot="1" aria-label="Girar para a direita">→</button>
      </div>
    </div>`;
  }

  function renderCart(breakdown: ReturnType<typeof computeBreakdown>): string {
    const rows: string[] = [];
    for (const slot of SLOTS) {
      const id = state.selection.get(slot.key);
      if (id == null) continue;
      const item = ITEM_BY_ID.get(id);
      if (!item) continue;
      rows.push(`<li class="cart-row">
        ${icon(item.id, 24, 'cart-icon')}
        <div class="cart-main">
          <span class="cart-name">${escapeHtml(item.name)}${raceBadge(item)}</span>
          <span class="cart-links">${itemLinks(item, state.server)}</span>
        </div>
        <span class="cart-exp">+${item.exp[state.band]}%</span>
        <button type="button" class="cart-remove" data-remove="${slot.key}" aria-label="Remover ${escapeHtml(item.name)}">✕</button>
      </li>`);
    }
    for (const s of breakdown.sets) {
      rows.push(`<li class="cart-row cart-row--set">
        <span class="cart-set-icon">＋</span>
        <span class="cart-name">${escapeHtml(s.set.note)}</span>
        <span class="cart-exp">+${s.bonus}%</span>
      </li>`);
    }
    if (rows.length === 0) {
      return `<p class="cart-empty">Nenhum item selecionado ainda.</p>`;
    }
    return `<ul class="cart-list">${rows.join('')}</ul>
      <div class="cart-total">Total: <strong>+${breakdown.total}%</strong></div>`;
  }

  function renderPoolTable(pool: string, label: string): string {
    const items = itemsForPool(pool);
    const selected = new Set(selectedIds());
    const rows = items
      .map((it) => {
        const isSel = selected.has(it.id);
        return `<tr class="pool-row${isSel ? ' is-selected' : ''}" data-equip="${it.id}" data-pool="${pool}">
          <td class="pool-icon-cell">${icon(it.id, 22, 'pool-icon')}</td>
          <td class="pool-name-cell">
            <span class="pool-name">${escapeHtml(it.name)}${raceBadge(it)}</span>
            ${it.caveats ? `<span class="pool-caveat">${escapeHtml(it.caveats)}</span>` : ''}
          </td>
          <td class="pool-exp-cell">+${it.exp[state.band]}%</td>
          <td class="pool-links-cell">${itemLinks(it, state.server)}</td>
        </tr>`;
      })
      .join('');
    return `<details class="pool-table" data-pool-table="${pool}" ${state.openPools.has(pool) ? 'open' : ''}>
      <summary>${escapeHtml(label)} <span class="pool-count">${items.length}</span></summary>
      <div class="pool-table-scroll">
        <table class="pool-items">
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>`;
  }

  function bindEvents(): void {
    root.querySelectorAll<HTMLElement>('.equip-slot').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.slot-dropdown')) return; // dropdown handles its own
        e.stopPropagation();
        const key = el.dataset.slot!;
        state.openSlot = state.openSlot === key ? null : key;
        render();
      });
    });

    root.querySelectorAll<HTMLElement>('.dd-row[data-equip]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        equip(el.dataset.slot!, Number(el.dataset.equip));
      });
    });

    root.querySelectorAll<HTMLElement>('[data-remove]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSlot(el.dataset.remove!);
      });
    });

    const filter = root.querySelector<HTMLInputElement>('.slot-dropdown .dd-filter');
    if (filter) {
      filter.addEventListener('click', (e) => e.stopPropagation());
      filter.addEventListener('input', () => {
        const q = filter.value.trim().toLowerCase();
        root.querySelectorAll<HTMLElement>('.dd-rows .dd-row[data-equip]').forEach((row) => {
          const name = row.dataset.name ?? '';
          row.style.display = name.includes(q) ? '' : 'none';
        });
      });
    }

    root.querySelectorAll<HTMLInputElement>('input[name="band"]').forEach((el) => {
      el.addEventListener('change', () => setBand(el.value as Band));
    });

    const serverSelect = root.querySelector<HTMLSelectElement>('[data-server]');
    serverSelect?.addEventListener('change', () => setServer(serverSelect.value as Server));

    root.querySelectorAll<HTMLElement>('.pool-row[data-equip]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-stop]')) return; // let DP/market links work
        equipToPool(el.dataset.pool!, Number(el.dataset.equip));
      });
    });
    root.querySelectorAll<HTMLElement>('[data-stop]').forEach((el) => {
      el.addEventListener('click', (e) => e.stopPropagation());
    });

    const classToggle = root.querySelector<HTMLElement>('[data-class-toggle]');
    classToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.classOpen = !state.classOpen;
      render();
    });
    root.querySelectorAll<HTMLElement>('.class-option[data-class-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        state.job = Number(el.dataset.classId);
        state.classOpen = false;
        render();
      });
    });

    const actionSelect = root.querySelector<HTMLSelectElement>('[data-action-select]');
    actionSelect?.addEventListener('change', () => {
      state.action = Number(actionSelect.value);
      render();
    });

    root.querySelectorAll<HTMLDetailsElement>('[data-pool-table]').forEach((el) => {
      el.addEventListener('toggle', () => {
        const pool = el.dataset.poolTable!;
        if (el.open) state.openPools.add(pool);
        else state.openPools.delete(pool);
      });
    });

    root.querySelectorAll<HTMLElement>('[data-gender]').forEach((el) => {
      el.addEventListener('click', () => {
        state.gender = el.dataset.gender as Gender;
        render();
      });
    });
    root.querySelectorAll<HTMLElement>('[data-rot]').forEach((el) => {
      el.addEventListener('click', () => {
        const d = Number(el.dataset.rot);
        state.bodyDir = (state.bodyDir + d + 8) % 8;
        render();
      });
    });

    const shareBtn = root.querySelector<HTMLButtonElement>('[data-action="share"]');
    const feedback = root.querySelector<HTMLElement>('[data-out="share-feedback"]');
    shareBtn?.addEventListener('click', async () => {
      const url = buildExpShareUrl({ band: state.band, selection: state.selection });
      try {
        await navigator.clipboard.writeText(url);
        if (feedback) feedback.textContent = 'Link copiado!';
      } catch {
        if (feedback) feedback.textContent = url;
      }
      setTimeout(() => {
        if (feedback) feedback.textContent = '';
      }, 2500);
    });
  }
}

function characterUrl(state: State): string {
  const viewOf = (slotKey: string): number | null => {
    const id = state.selection.get(slotKey);
    if (id == null) return null;
    return ITEM_BY_ID.get(id)?.view ?? null;
  };
  const headTop = viewOf('visualTopo') ?? viewOf('topo');
  const headMid = viewOf('visualMeio') ?? viewOf('meio');
  const headLow = viewOf('baixo');
  const garment = viewOf('visualCapa') ?? viewOf('capa');
  const shield = viewOf('escudo');
  const headgear = [...new Set([headTop, headMid, headLow].filter((v): v is number => v != null))];

  const p = new URLSearchParams();
  p.set('job', String(state.job));
  p.set('gender', resolveGender(state.job, state.gender));
  p.set('head', '1');
  if (headgear.length) p.set('headgear', headgear.join(','));
  if (garment != null) p.set('garment', String(garment));
  if (shield != null) p.set('shield', String(shield));
  p.set('action', String(state.action * 8 + state.bodyDir));
  p.set('headdir', '0');
  p.set('canvas', CANVAS);
  return `${RAGASSETS}/image?${p.toString()}`;
}

function classIcon(id: number): string {
  return `<img class="class-icon" src="${jobIconUrl(id)}" alt="" loading="lazy"
    decoding="async" onerror="this.classList.add('is-missing')" />`;
}

function icon(id: number, size: number, cls: string): string {
  return `<img class="${cls}" src="${ICON_URL(id)}" alt="" width="${size}" height="${size}"
    loading="lazy" onerror="this.style.visibility='hidden'" />`;
}

function itemLinks(item: ExpItem, server: Server): string {
  const market = item.market
    ? `<a href="${escapeHtml(marketUrl(item.market, server))}" target="_blank" rel="noopener noreferrer" data-stop>Mercado</a>`
    : `<span class="not-tradeable">não comercializável</span>`;
  return `<a href="${escapeHtml(item.dp)}" target="_blank" rel="noopener noreferrer" data-stop>DP</a>${market}`;
}

// The dataset's market links bake in serverType=FREYA; swap in the chosen server.
function marketUrl(url: string, server: Server): string {
  return url.replace(/([?&]serverType=)[^&]*/, `$1${server}`);
}

function raceBadge(item: ExpItem): string {
  if (!item.raceOnly) return '';
  return ` <span class="race-badge" title="Bônus apenas contra a raça ${escapeHtml(item.raceOnly)}">${escapeHtml(item.raceOnly)}</span>`;
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
