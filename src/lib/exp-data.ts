import rawData from './exp-items.json';

// Level bands used across the dataset. Many items change value per band.
export type Band = 'ate99' | 'de100a174' | 'nv175mais';

export const BANDS: ReadonlyArray<{ key: Band; label: string; short: string }> = [
  { key: 'ate99', label: 'Nv. ≤ 99', short: '≤99' },
  { key: 'de100a174', label: 'Nv. 100–174', short: '100–174' },
  { key: 'nv175mais', label: 'Nv. 175+', short: '175+' },
];

export const DEFAULT_BAND: Band = 'de100a174';

export interface ExpItem {
  id: number;
  name: string;
  slot: string;
  exp: Record<Band, number>;
  caveats: string | null;
  raceOnly: string | null;
  view: number | null;
  dp: string;
  market: string | null;
}

export interface ExpSet {
  items: number[];
  bonus: number;
  note: string;
  bands?: Band[];
}

interface ExpData {
  items: ExpItem[];
  sets: ExpSet[];
}

const data = rawData as ExpData;

export const ITEMS: ReadonlyArray<ExpItem> = data.items;
export const SETS: ReadonlyArray<ExpSet> = data.sets;

export const ITEM_BY_ID: ReadonlyMap<number, ExpItem> = new Map(
  ITEMS.map((item) => [item.id, item]),
);

// One UI equip slot. `pool` is the item `slot` value whose items can go here
// (accessory slots share the "acessorio" pool). `group` drives grid layout.
export interface SlotDef {
  key: string;
  label: string;
  pool: string;
  group: 'principal' | 'carta' | 'sombrio' | 'visual' | 'pedra';
}

const ALL_SLOTS: ReadonlyArray<SlotDef> = [
  { key: 'topo', label: 'Topo', pool: 'topo', group: 'principal' },
  { key: 'meio', label: 'Meio', pool: 'meio', group: 'principal' },
  { key: 'baixo', label: 'Baixo', pool: 'baixo', group: 'principal' },
  { key: 'armadura', label: 'Armadura', pool: 'armadura', group: 'principal' },
  { key: 'arma', label: 'Arma', pool: 'arma', group: 'principal' },
  { key: 'escudo', label: 'Escudo', pool: 'escudo', group: 'principal' },
  { key: 'capa', label: 'Capa', pool: 'capa', group: 'principal' },
  { key: 'calcado', label: 'Calçado', pool: 'calcado', group: 'principal' },
  { key: 'acessorio1', label: 'Acessório 1', pool: 'acessorio', group: 'principal' },
  { key: 'acessorio2', label: 'Acessório 2', pool: 'acessorio', group: 'principal' },
  { key: 'cartaArmadura', label: 'Carta (Armadura)', pool: 'cartaArmadura', group: 'carta' },
  { key: 'cartaCalcado', label: 'Carta (Calçado)', pool: 'cartaCalcado', group: 'carta' },
  { key: 'sombrioArma', label: 'Sombrio (Arma)', pool: 'sombrioArma', group: 'sombrio' },
  { key: 'sombrioEscudo', label: 'Sombrio (Escudo)', pool: 'sombrioEscudo', group: 'sombrio' },
  { key: 'sombrioCalcado', label: 'Sombrio (Calçado)', pool: 'sombrioCalcado', group: 'sombrio' },
  { key: 'visualTopo', label: 'Visual (Topo)', pool: 'visualTopo', group: 'visual' },
  { key: 'visualMeio', label: 'Visual (Meio)', pool: 'visualMeio', group: 'visual' },
  { key: 'visualCapa', label: 'Visual (Capa)', pool: 'visualCapa', group: 'visual' },
  { key: 'pedraTopo', label: 'Pedra (Topo)', pool: 'pedraTopo', group: 'pedra' },
  { key: 'pedraMeio', label: 'Pedra (Meio)', pool: 'pedraMeio', group: 'pedra' },
  { key: 'pedraBaixo', label: 'Pedra (Baixo)', pool: 'pedraBaixo', group: 'pedra' },
];

// A pool goes empty when its items are removed (expired events). Hide those
// slots instead of rendering a picker with nothing to pick.
const POOLS_WITH_ITEMS: ReadonlySet<string> = new Set(ITEMS.map((item) => item.slot));

export const SLOTS: ReadonlyArray<SlotDef> = ALL_SLOTS.filter((s) =>
  POOLS_WITH_ITEMS.has(s.pool),
);

export const SLOT_BY_KEY: ReadonlyMap<string, SlotDef> = new Map(
  SLOTS.map((s) => [s.key, s]),
);

// Distinct item pools, in a stable order for the per-slot tables below the grid.
export const POOLS: ReadonlyArray<{ pool: string; label: string }> = (() => {
  const seen = new Set<string>();
  const out: { pool: string; label: string }[] = [];
  const labels: Record<string, string> = {
    topo: 'Topo',
    meio: 'Meio',
    baixo: 'Baixo',
    armadura: 'Armadura',
    arma: 'Arma',
    escudo: 'Escudo',
    capa: 'Capa',
    calcado: 'Calçado',
    acessorio: 'Acessório',
    cartaArmadura: 'Carta de Armadura',
    cartaCalcado: 'Carta de Calçado',
    sombrioArma: 'Equipamento Sombrio (Arma)',
    sombrioEscudo: 'Equipamento Sombrio (Escudo)',
    sombrioCalcado: 'Equipamento Sombrio (Calçado)',
    visualTopo: 'Visual (Topo)',
    visualMeio: 'Visual (Meio)',
    visualCapa: 'Visual (Capa)',
    pedraTopo: 'Pedra de EXP (Topo)',
    pedraMeio: 'Pedra de EXP (Meio)',
    pedraBaixo: 'Pedra de EXP (Baixo)',
  };
  for (const slot of SLOTS) {
    if (seen.has(slot.pool)) continue;
    seen.add(slot.pool);
    out.push({ pool: slot.pool, label: labels[slot.pool] ?? slot.pool });
  }
  return out;
})();

export function itemsForPool(pool: string): ExpItem[] {
  return ITEMS.filter((item) => item.slot === pool);
}

export const ICON_URL = (id: number): string =>
  `https://assets.latam-tools.com.br/icons/item/${id}.png`;

// gnjoylatam market servers — the `serverType` param in the Mercado links.
export type Server = 'FREYA' | 'NIDHOGG';

export const SERVERS: ReadonlyArray<{ code: Server; label: string }> = [
  { code: 'FREYA', label: 'Freya' },
  { code: 'NIDHOGG', label: 'Nidhogg' },
];

export const DEFAULT_SERVER: Server = 'FREYA';
