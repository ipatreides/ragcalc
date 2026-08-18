// Build src/lib/classes.json — the playable-class list the class picker reads
// (src/lib/classes.ts → CLASSES).
//
// Source of truth is the sibling project ragassets, which extracts the class
// table straight from the LATAM client and serves it alongside the other data
// tables:
//   https://assets.latam-tools.com.br/raw/classes.json
// That replaces hand-copying the file from latamvisuais, which is how this copy
// went stale (it was missing a whole class and four renamed ones).
//
// Upstream shape — a JSON array, one record per class:
//   { "id": 4309, "renderId": 4302, "jt": "JT_SKY_EMPEROR",
//     "name": "Mestre Celestial" | null, "race": "human" | "doram",
//     "sprite": …, "palette": …, "palettes": { "m": {…}, "f": {…} },
//     "outfits": […], "unreleased": false }
//
// We keep only what the app consumes. Notably:
//   * `id` in the output is upstream's `renderId` — the id ragassets renders and
//     serves icons for, and the only id this app ever puts in a URL. For all but
//     the newest expanded 4th classes the two are equal.
//   * `genders` replaces the per-gender palette sets: the picker only asks
//     *whether* a body sprite exists, never which colors it has, and the
//     swatches were ~80% of the vendored file's bytes.
//   * `group` does not exist upstream at all — it is this project's own
//     categorization for the grouped <select>, so it lives in GROUPS below and
//     also fixes the order classes appear in.
//
// Usage:
//   node tools/sync-classes.mjs                         # fetch from ragassets, write src/lib/classes.json
//   node tools/sync-classes.mjs --input classes.json    # use a local copy instead of fetching
//   node tools/sync-classes.mjs --url <url>             # override the source URL
//   node tools/sync-classes.mjs --out <path>            # override the output file

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_URL = "https://assets.latam-tools.com.br/raw/classes.json";
const DEFAULT_OUT = "src/lib/classes.json";

// Every class the picker offers, by group, in display order. Groups are keyed by
// CLASS_GROUPS in src/lib/classes.ts (which carries their pt-BR labels). A class
// upstream ships that is missing here is a hard error, so a client update that
// adds one can't slip into the picker unclassified.
const GROUPS = {
  novice: ["JT_NOVICE"],
  first: ["JT_SWORDMAN", "JT_MAGICIAN", "JT_ARCHER", "JT_ACOLYTE", "JT_MERCHANT", "JT_THIEF"],
  second: [
    "JT_KNIGHT", "JT_CRUSADER", "JT_PRIEST", "JT_MONK", "JT_WIZARD", "JT_SAGE", "JT_HUNTER",
    "JT_BARD", "JT_DANCER", "JT_BLACKSMITH", "JT_ALCHEMIST", "JT_ASSASSIN", "JT_ROGUE",
  ],
  trans: [
    "JT_NOVICE_H", "JT_SWORDMAN_H", "JT_MAGICIAN_H", "JT_ARCHER_H", "JT_ACOLYTE_H",
    "JT_MERCHANT_H", "JT_THIEF_H", "JT_KNIGHT_H", "JT_CRUSADER_H", "JT_PRIEST_H", "JT_MONK_H",
    "JT_WIZARD_H", "JT_SAGE_H", "JT_HUNTER_H", "JT_BARD_H", "JT_DANCER_H", "JT_BLACKSMITH_H",
    "JT_ALCHEMIST_H", "JT_ASSASSIN_H", "JT_ROGUE_H",
  ],
  third: [
    "JT_RUNE_KNIGHT", "JT_ROYAL_GUARD", "JT_ARCH_BISHOP", "JT_SURA", "JT_WARLOCK", "JT_SORCERER",
    "JT_RANGER", "JT_MINSTREL", "JT_WANDERER", "JT_MECHANIC", "JT_GENETIC",
    "JT_GUILLOTINE_CROSS", "JT_SHADOW_CHASER",
  ],
  fourth: [
    "JT_DRAGON_KNIGHT", "JT_IMPERIAL_GUARD", "JT_CARDINAL", "JT_INQUISITOR", "JT_ARCH_MAGE",
    "JT_ELEMENTAL_MASTER", "JT_WINDHAWK", "JT_TROUBADOUR", "JT_TROUVERE", "JT_MEISTER",
    "JT_BIOLO", "JT_SHADOW_CROSS", "JT_ABYSS_CHASER", "JT_HYPER_NOVICE",
  ],
  expanded: [
    "JT_SUPERNOVICE", "JT_GUNSLINGER", "JT_REBELLION", "JT_NINJA", "JT_KAGEROU", "JT_OBORO",
    "JT_SHINKIRO", "JT_SHIRANUI", "JT_TAEKWON", "JT_STAR_GLADIATOR", "JT_STAR_EMPEROR",
    "JT_SKY_EMPEROR", "JT_SOUL_LINKER", "JT_SOUL_REAPER", "JT_SOUL_ASCETIC", "JT_NIGHT_WATCH",
  ],
  doram: ["JT_SUMMONER", "JT_SPIRIT_HANDLER"],
};

const CLASSIFIED = new Set(Object.values(GROUPS).flat());

// Classes the LATAM client ships without a label (`name: null` upstream). Kept
// here so the picker never shows a blank row; drop an entry once it is named.
const NAME_OVERRIDES = {
  JT_SHINKIRO: "Shinkiro",
  JT_SHIRANUI: "Shiranui",
};

/**
 * Reshape ragassets' /raw/classes.json into the file src/lib/classes.ts imports.
 * Pure and side-effect free — throws with a full list of problems rather than
 * writing a half-right table.
 */
export function projectClasses(raw) {
  if (!Array.isArray(raw)) throw new Error("Expected classes.json to be a JSON array of class objects.");

  const byJt = new Map(raw.map((c) => [c.jt, c]));
  const problems = [];

  for (const jt of byJt.keys()) {
    if (!CLASSIFIED.has(jt)) problems.push(`${jt} is new upstream — add it to a group in tools/sync-classes.mjs`);
  }

  const classes = [];
  for (const [group, members] of Object.entries(GROUPS)) {
    for (const jt of members) {
      const c = byJt.get(jt);
      if (!c) {
        problems.push(`${jt} is no longer in the source table — remove it from GROUPS`);
        continue;
      }
      // `unreleased` means the server ships no party icon for the class, which
      // is exactly the file jobIconUrl() points at — so it would render broken.
      if (c.unreleased) continue;

      const name = c.name ?? NAME_OVERRIDES[jt];
      if (!name) problems.push(`${jt} has no client label — add one to NAME_OVERRIDES`);

      const genders = [];
      if (c.palettes?.m) genders.push("male");
      if (c.palettes?.f) genders.push("female");
      if (!genders.length) problems.push(`${jt} has no body sprite for either gender`);

      classes.push({ id: c.renderId ?? c.id, jt, name, group, genders });
    }
  }

  if (problems.length) throw new Error(`classes.json is out of step with the source table:\n  - ${problems.join("\n  - ")}`);
  return { classes };
}

async function main(argv) {
  const args = parseArgs(argv);
  const outPath = resolve(args.out ?? DEFAULT_OUT);
  const out = projectClasses(await loadSource(args));

  // One record per line: small enough to stay cheap to ship, structured enough
  // that a client update shows up as a readable diff.
  const body = out.classes.map((c) => JSON.stringify(c)).join(",\n");
  writeFileSync(outPath, `{"classes":[\n${body}\n]}\n`);

  const dropped = CLASSIFIED.size - out.classes.length;
  console.log(
    `classes.json: ${out.classes.length} classes → ${outPath}` +
      (dropped ? ` (${dropped} not released on this server)` : ""),
  );
}

async function loadSource(args) {
  if (args.input) {
    const p = resolve(args.input);
    console.log(`Reading ${p}`);
    return JSON.parse(readFileSync(p, "utf8"));
  }
  const url = args.url ?? DEFAULT_URL;
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") out.input = argv[++i];
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else {
      console.error("usage: node tools/sync-classes.mjs [--input <classes.json>] [--url <url>] [--out <path>]");
      process.exit(1);
    }
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
