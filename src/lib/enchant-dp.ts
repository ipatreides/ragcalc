export interface EnchantTransition {
  cost: number;
  successChance: number;
}

export interface EnchantConfig {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  itemName: string;
  itemNameShort: string;
  itemNameShortPlural: string;
  description: string;
  referenceUrl: string;
  referenceLabel: string;
  transitions: EnchantTransition[];
}

// Hard cap for the budget axis in the iterative DP.
// 10 levels × 500k buckets × 8 bytes = 40MB. Higher caps blow up memory.
// Realistic use cases (short hops between levels) finish well under this.
// Long-shot cases (e.g. 1→10) report Infinity instead of crashing.
export const MAX_TRACTABLE_BUDGET = 500_000;

export function maxLevel(cfg: EnchantConfig): number {
  return cfg.transitions.length + 1;
}

function validate(cfg: EnchantConfig, startLevel: number, targetLevel: number): void {
  const max = maxLevel(cfg);
  if (!Number.isInteger(startLevel) || !Number.isInteger(targetLevel)) {
    throw new Error('Levels must be integers');
  }
  if (startLevel < 1 || startLevel > max) {
    throw new Error(`startLevel out of range [1, ${max}]: ${startLevel}`);
  }
  if (targetLevel < 1 || targetLevel > max) {
    throw new Error(`targetLevel out of range [1, ${max}]: ${targetLevel}`);
  }
  if (startLevel > targetLevel) {
    throw new Error(`startLevel (${startLevel}) > targetLevel (${targetLevel})`);
  }
}

function transitionAt(cfg: EnchantConfig, level: number): EnchantTransition {
  const t = cfg.transitions[level - 1];
  if (!t) throw new Error(`No transition for level ${level}`);
  return t;
}

// Bottom-up DP table indexed P[level * (cap+1) + budget].
// Levels are 1..max; index 0 is unused for clarity.
function buildTable(cfg: EnchantConfig, targetLevel: number, cap: number): Float64Array {
  const max = maxLevel(cfg);
  const stride = cap + 1;
  const P = new Float64Array((max + 1) * stride);

  // Levels >= target: success guaranteed regardless of budget.
  for (let level = targetLevel; level <= max; level++) {
    const base = level * stride;
    for (let b = 0; b <= cap; b++) P[base + b] = 1;
  }

  // Levels < target: fill in budget order so P[*][b - cost] is already known.
  for (let b = 0; b <= cap; b++) {
    for (let level = 1; level < targetLevel; level++) {
      const t = cfg.transitions[level - 1]!;
      if (b < t.cost) {
        P[level * stride + b] = 0;
        continue;
      }
      const remaining = b - t.cost;
      const failLevel = Math.max(1, level - 1);
      const pSucc = P[(level + 1) * stride + remaining]!;
      const pFail = P[failLevel * stride + remaining]!;
      P[level * stride + b] = t.successChance * pSucc + (1 - t.successChance) * pFail;
    }
  }

  return P;
}

export function probabilityOfSuccess(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
  fragments: number,
): number {
  validate(cfg, startLevel, targetLevel);
  if (startLevel === targetLevel) return 1;
  if (!Number.isFinite(fragments) || fragments <= 0) return 0;

  const cap = Math.min(Math.floor(fragments), MAX_TRACTABLE_BUDGET);
  const stride = cap + 1;
  const P = buildTable(cfg, targetLevel, cap);
  return P[startLevel * stride + cap]!;
}

// Returns probabilities at multiple budgets in one DP pass — much cheaper than
// calling probabilityOfSuccess once per budget.
export function probabilitiesAtBudgets(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
  budgets: number[],
): number[] {
  validate(cfg, startLevel, targetLevel);
  if (startLevel === targetLevel) return budgets.map(() => 1);
  if (budgets.length === 0) return [];

  const maxB = Math.max(0, ...budgets);
  const cap = Math.min(maxB, MAX_TRACTABLE_BUDGET);
  const stride = cap + 1;
  const P = buildTable(cfg, targetLevel, cap);
  const base = startLevel * stride;
  return budgets.map((b) => {
    if (b <= 0) return 0;
    if (b >= cap) return P[base + cap]!;
    return P[base + Math.floor(b)]!;
  });
}

export function expectedCost(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
): number {
  validate(cfg, startLevel, targetLevel);
  if (startLevel === targetLevel) return 0;

  // Unknowns: E[1], E[2], ..., E[targetLevel-1]. E[targetLevel] = 0.
  // For level n in [1, targetLevel-1]:
  //   E[n] = c_n + p_n * E[n+1] + (1-p_n) * E[max(1, n-1)]
  // Linear system. Use Gaussian elimination on a small (≤ 9x9) matrix.

  const n = targetLevel - 1;
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const b: number[] = new Array(n).fill(0);

  for (let level = 1; level <= n; level++) {
    const t = transitionAt(cfg, level);
    const i = level - 1;
    A[i]![i] = 1;
    if (level + 1 <= n) {
      A[i]![level] = -t.successChance;
    }
    const failLevel = Math.max(1, level - 1);
    A[i]![failLevel - 1]! += -(1 - t.successChance);
    b[i] = t.cost;
  }

  return gaussianSolve(A, b)[startLevel - 1]!;
}

function gaussianSolve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[pivot]![col]!)) pivot = row;
    }
    if (pivot !== col) [M[col], M[pivot]] = [M[pivot]!, M[col]!];
    const pv = M[col]![col]!;
    if (Math.abs(pv) < 1e-12) throw new Error('Singular matrix in expectedCost');
    for (let row = col + 1; row < n; row++) {
      const factor = M[row]![col]! / pv;
      for (let k = col; k <= n; k++) {
        M[row]![k]! -= factor * M[col]![k]!;
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row]![n]!;
    for (let col = row + 1; col < n; col++) sum -= M[row]![col]! * x[col]!;
    x[row] = sum / M[row]![row]!;
  }
  return x;
}

// Returns Infinity if the chance can't be hit within MAX_TRACTABLE_BUDGET.
export function budgetForChance(
  cfg: EnchantConfig,
  startLevel: number,
  targetLevel: number,
  chance: number,
): number {
  validate(cfg, startLevel, targetLevel);
  if (chance <= 0) return 0;
  if (chance > 1) throw new Error(`chance must be ≤ 1, got ${chance}`);
  if (startLevel === targetLevel) return 0;

  // Build the DP table once at the cap, then binary-search on the cached row.
  const cap = MAX_TRACTABLE_BUDGET;
  const stride = cap + 1;
  const P = buildTable(cfg, targetLevel, cap);
  const base = startLevel * stride;

  if (P[base + cap]! < chance) return Infinity;

  let lo = 0;
  let hi = cap;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (P[base + mid]! >= chance) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
