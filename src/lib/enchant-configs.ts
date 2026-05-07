import type { EnchantConfig } from './enchant-dp';

export const MEMORAVEL_CONFIG: EnchantConfig = {
  id: 'memoravel',
  slug: 'memoravel',
  title: 'Memorável',
  shortTitle: 'Memorável',
  itemName: 'Fragmento Ominoso',
  itemNameShort: 'Fragmento',
  itemNameShortPlural: 'Fragmentos',
  description:
    'Calcule a quantidade de Fragmentos Ominosos para encantar a insígnia do Chapéu Memorável.',
  referenceUrl: 'https://browiki.org/wiki/Tumba_da_Honra',
  referenceLabel: 'Tumba da Honra (browiki.org)',
  transitions: [
    { cost: 20, successChance: 0.70 },
    { cost: 40, successChance: 0.50 },
    { cost: 50, successChance: 0.35 },
    { cost: 70, successChance: 0.25 },
    { cost: 100, successChance: 0.18 },
    { cost: 150, successChance: 0.13 },
    { cost: 250, successChance: 0.09 },
    { cost: 500, successChance: 0.06 },
    { cost: 1000, successChance: 0.04 },
  ],
};

export const DIADEMA_CONFIG: EnchantConfig = {
  id: 'diadema',
  slug: 'diadema',
  title: 'Diadema Temporal',
  shortTitle: 'Diadema Temporal',
  itemName: 'Poder Temporal',
  itemNameShort: 'Poder',
  itemNameShortPlural: 'Poderes',
  description:
    'Calcule a quantidade de Poderes Temporais para encantar a insígnia da Diadema Temporal.',
  referenceUrl: 'https://browiki.org/wiki/Glastheim',
  referenceLabel: 'Glastheim (browiki.org)',
  transitions: [
    { cost: 4, successChance: 0.50 },
    { cost: 6, successChance: 0.35 },
    { cost: 8, successChance: 0.20 },
    { cost: 10, successChance: 0.10 },
    { cost: 12, successChance: 0.07 },
    { cost: 16, successChance: 0.05 },
    { cost: 20, successChance: 0.02 },
    { cost: 28, successChance: 0.01 },
    { cost: 40, successChance: 0.01 },
  ],
};

export const CALCULATORS: EnchantConfig[] = [MEMORAVEL_CONFIG, DIADEMA_CONFIG];
