import { describe, expect, it } from 'vitest';
import {
  budgetForChance,
  expectedCost,
  probabilitiesAtBudgets,
  probabilityOfSuccess,
  type EnchantConfig,
} from './enchant-dp';
import { DIADEMA_CONFIG, MEMORAVEL_CONFIG } from './enchant-configs';

const CLOSE = 1e-9;

// A 1→2 single-transition config makes manual verification trivial.
function singleStep(cost: number, p: number): EnchantConfig {
  return {
    id: 'single',
    slug: 'single',
    title: 'single',
    shortTitle: 'single',
    itemName: 'item',
    itemNameShort: 'item',
    itemNameShortPlural: 'itens',
    description: '',
    referenceUrl: '',
    referenceLabel: '',
    transitions: [{ cost, successChance: p }],
  };
}

// Reference implementation: recursive with memo. For small budgets it matches
// the iterative DP; differences point to bugs in the production code.
function referenceProbability(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
  fragments: number,
): number {
  const memo = new Map<string, number>();
  const recur = (level: number, budget: number): number => {
    if (level >= targetLevel) return 1;
    if (level < 1) return recur(1, budget);
    if (level - 1 >= cfg.transitions.length) return 0; // out of bounds
    const t = cfg.transitions[level - 1]!;
    if (budget < t.cost) return 0;
    const key = `${level},${budget}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const remaining = budget - t.cost;
    const failLevel = Math.max(1, level - 1);
    const result =
      t.successChance * recur(level + 1, remaining) +
      (1 - t.successChance) * recur(failLevel, remaining);
    memo.set(key, result);
    return result;
  };
  return recur(startLevel, fragments);
}

// Monte Carlo simulation. Each trial walks the markov chain with the budget;
// returns the empirical P(reaching targetLevel before running out).
function simulate(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
  fragments: number,
  trials: number,
  seed = 1,
): number {
  // Mulberry32 deterministic PRNG so tests are reproducible.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let success = 0;
  for (let i = 0; i < trials; i++) {
    let level = startLevel;
    let budget = fragments;
    while (level < targetLevel) {
      const t = cfg.transitions[level - 1];
      if (!t || budget < t.cost) break;
      budget -= t.cost;
      if (rand() < t.successChance) level++;
      else level = Math.max(1, level - 1);
    }
    if (level >= targetLevel) success++;
  }
  return success / trials;
}

describe('probabilityOfSuccess — analytic 1→2 (failure self-loops at level 1)', () => {
  // For 1→2 with cost c and success p, after k attempts (k = floor(budget/c)):
  // P(success in k tries) = 1 - (1-p)^k.
  it('70% chance, k=1 → 70%', () => {
    expect(probabilityOfSuccess(singleStep(20, 0.7), 1, 2, 20)).toBeCloseTo(0.7, 12);
  });
  it('70% chance, k=2 → 91%', () => {
    expect(probabilityOfSuccess(singleStep(20, 0.7), 1, 2, 40)).toBeCloseTo(0.91, 12);
  });
  it('50% chance, k=7 → 99.21875%', () => {
    expect(probabilityOfSuccess(singleStep(4, 0.5), 1, 2, 28)).toBeCloseTo(
      1 - Math.pow(0.5, 7),
      12,
    );
  });
  it('budget less than cost → 0', () => {
    expect(probabilityOfSuccess(singleStep(20, 0.7), 1, 2, 10)).toBe(0);
  });
  it('start at target → 1 regardless of budget', () => {
    expect(probabilityOfSuccess(singleStep(20, 0.7), 2, 2, 0)).toBe(1);
    expect(probabilityOfSuccess(singleStep(20, 0.7), 2, 2, 100)).toBe(1);
  });
});

describe('expectedCost — geometric 1→2', () => {
  it('cost / p for failure self-loop at level 1', () => {
    expect(expectedCost(singleStep(20, 0.7), 1, 2)).toBeCloseTo(20 / 0.7, 9);
    expect(expectedCost(singleStep(4, 0.5), 1, 2)).toBeCloseTo(4 / 0.5, 9);
    expect(expectedCost(singleStep(40, 0.04), 1, 2)).toBeCloseTo(40 / 0.04, 9);
  });
  it('start at target → 0', () => {
    expect(expectedCost(singleStep(20, 0.7), 2, 2)).toBe(0);
  });
});

describe('probabilityOfSuccess — matches recursive reference (multi-transition)', () => {
  const cases: Array<[string, EnchantConfig, number, number, number]> = [
    ['Memorável 1→2 @ 20', MEMORAVEL_CONFIG, 1, 2, 20],
    ['Memorável 1→2 @ 100', MEMORAVEL_CONFIG, 1, 2, 100],
    ['Memorável 1→3 @ 200', MEMORAVEL_CONFIG, 1, 3, 200],
    ['Memorável 1→5 @ 2000', MEMORAVEL_CONFIG, 1, 5, 2000],
    ['Memorável 3→5 @ 500', MEMORAVEL_CONFIG, 3, 5, 500],
    ['Memorável 5→7 @ 1500', MEMORAVEL_CONFIG, 5, 7, 1500],
    ['Diadema 1→2 @ 4', DIADEMA_CONFIG, 1, 2, 4],
    ['Diadema 1→2 @ 28', DIADEMA_CONFIG, 1, 2, 28],
    ['Diadema 1→3 @ 50', DIADEMA_CONFIG, 1, 3, 50],
    ['Diadema 1→5 @ 100', DIADEMA_CONFIG, 1, 5, 100],
    ['Diadema 1→5 @ 28', DIADEMA_CONFIG, 1, 5, 28],
    ['Diadema 3→5 @ 60', DIADEMA_CONFIG, 3, 5, 60],
  ];
  for (const [label, cfg, start, target, frags] of cases) {
    it(label, () => {
      const dp = probabilityOfSuccess(cfg, start, target, frags);
      const ref = referenceProbability(cfg, start, target, frags);
      expect(dp).toBeCloseTo(ref, 12);
    });
  }
});

describe('probabilityOfSuccess — within Monte Carlo confidence band', () => {
  const cases: Array<[string, EnchantConfig, number, number, number]> = [
    ['Diadema 1→2 @ 28', DIADEMA_CONFIG, 1, 2, 28],
    ['Diadema 1→5 @ 100', DIADEMA_CONFIG, 1, 5, 100],
    ['Diadema 1→5 @ 200', DIADEMA_CONFIG, 1, 5, 200],
    ['Memorável 1→3 @ 200', MEMORAVEL_CONFIG, 1, 3, 200],
    ['Memorável 1→5 @ 2000', MEMORAVEL_CONFIG, 1, 5, 2000],
  ];
  for (const [label, cfg, start, target, frags] of cases) {
    it(label, () => {
      const dp = probabilityOfSuccess(cfg, start, target, frags);
      const mc = simulate(cfg, start, target, frags, 50_000, 42);
      // 50k trials → 1σ ≈ √(p(1-p)/n) ≤ 0.0023, so 5σ ≈ 0.012. Use 0.02 to be safe.
      expect(Math.abs(dp - mc)).toBeLessThan(0.02);
    });
  }
});

// Regression: user looked at Diadema 1→3 with various budgets and thought
// 28 frags → 49.5% felt wrong. A 1M-trial Monte Carlo confirms 49.547%, so
// these numbers are pinned down to catch any future drift.
describe('Diadema 1→3 — exact pinned values (verified vs 1M-trial Monte Carlo)', () => {
  const cases: Array<[number, number]> = [
    [10, 0.175],
    [20, 0.363125],
    [28, 0.49546875],
    [50, 0.7343814160156249],
    [100, 0.9398587636368371],
  ];
  for (const [budget, expected] of cases) {
    it(`P(1→3 | ${budget} frags) ≈ ${(expected * 100).toFixed(2)}%`, () => {
      expect(probabilityOfSuccess(DIADEMA_CONFIG, 1, 3, budget)).toBeCloseTo(
        expected,
        12,
      );
    });
  }
});

describe('budgetForChance — monotone over chance targets', () => {
  it('higher chance never costs less', () => {
    const ts = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99];
    for (const cfg of [MEMORAVEL_CONFIG, DIADEMA_CONFIG]) {
      for (let target = 2; target <= 6; target++) {
        const budgets = ts.map((c) => budgetForChance(cfg, 1, target, c));
        for (let i = 1; i < budgets.length; i++) {
          expect(budgets[i]!).toBeGreaterThanOrEqual(budgets[i - 1]!);
        }
      }
    }
  });

  it('returned budget actually achieves the requested chance', () => {
    const ts = [0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
    for (const cfg of [MEMORAVEL_CONFIG, DIADEMA_CONFIG]) {
      for (const target of [2, 3, 5]) {
        for (const c of ts) {
          const b = budgetForChance(cfg, 1, target, c);
          if (!Number.isFinite(b)) continue;
          const p = probabilityOfSuccess(cfg, 1, target, b);
          expect(p).toBeGreaterThanOrEqual(c - 1e-12);
        }
      }
    }
  });
});

describe('probabilitiesAtBudgets — matches singletons', () => {
  it('each budget matches probabilityOfSuccess', () => {
    const cases: Array<[EnchantConfig, number, number, number[]]> = [
      [DIADEMA_CONFIG, 1, 2, [0, 4, 8, 16, 28, 100]],
      [DIADEMA_CONFIG, 1, 5, [0, 50, 100, 500, 1000]],
      [MEMORAVEL_CONFIG, 1, 5, [0, 100, 1000, 5000]],
    ];
    for (const [cfg, start, target, budgets] of cases) {
      const batched = probabilitiesAtBudgets(cfg, start, target, budgets);
      const singles = budgets.map((b) =>
        probabilityOfSuccess(cfg, start, target, b),
      );
      for (let i = 0; i < budgets.length; i++) {
        expect(batched[i]).toBeCloseTo(singles[i]!, 12);
      }
    }
  });
});

describe('probabilities — invariants', () => {
  it('always in [0, 1]', () => {
    for (const cfg of [MEMORAVEL_CONFIG, DIADEMA_CONFIG]) {
      for (const target of [2, 5, 10]) {
        for (const b of [0, 1, 50, 500, 5000, 50000, 200000]) {
          const p = probabilityOfSuccess(cfg, 1, target, b);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1 + CLOSE);
        }
      }
    }
  });

  it('monotone in budget', () => {
    for (const cfg of [MEMORAVEL_CONFIG, DIADEMA_CONFIG]) {
      for (const target of [2, 5, 8]) {
        const budgets = [0, 10, 50, 100, 500, 2000, 10000, 100000];
        let prev = -Infinity;
        for (const b of budgets) {
          const p = probabilityOfSuccess(cfg, 1, target, b);
          expect(p).toBeGreaterThanOrEqual(prev - CLOSE);
          prev = p;
        }
      }
    }
  });
});
