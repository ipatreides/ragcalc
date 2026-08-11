---
name: sync-with-ragassets
description: Regenerate src/lib/classes.json (the class picker's list) from ragassets' /raw/classes.json. Use after a LATAM client update, when a class is missing from the picker, or when a class name or icon looks wrong.
---

# Sync the class list from ragassets

`src/lib/classes.json` is the list the Conjunto de EXP class picker reads
(`src/lib/classes.ts` → `CLASSES`). It is **generated, never edited by hand**.

The source of truth is the sibling project **ragassets**, which extracts the
class table straight from the LATAM client GRF and serves it at
<https://assets.latam-tools.com.br/raw/classes.json>.

## Why this exists

This file used to be hand-copied out of latamvisuais' `public/db/classes.json`.
That silently went stale: it was one whole class behind (Druida, the doram 4th
class) and carried four placeholder names the client had since translated
(`Magus`, `Maestro`, `Executor`, `Hyper Novice`). Nothing checks freshness
automatically — but re-running one command is cheap enough to do on every client
update, which hand-merging a 23 kB JSON never was.

## Run it

```bash
node tools/sync-classes.mjs
```

Options: `--input <file>` to read a local copy instead of fetching (useful
against `C:\Users\adson\dev\ragassets\resources\raw\classes.json` before
ragassets is redeployed), `--url <url>` to override the source, `--out <path>`
to write elsewhere.

## What it produces

One record per playable class, in picker order:

```json
{"id":4302,"jt":"JT_SKY_EMPEROR","name":"Mestre Celestial","group":"expanded","genders":["male","female"]}
```

Only what the app consumes — upstream's palette swatches, sprite names and
alternative outfits are for paperdoll renderers, not for this picker.

- `id` is upstream's **`renderId`**, not its `id`. For the newest expanded 4th
  classes the client's job id (4309–4315) is the always-mounted sprite;
  ragassets renders and serves icons at 4302–4308. `id` is the only id this app
  ever puts in a URL (`/image?job=` and `/icons/job/<id>.png`), so it must be
  the render one. They are equal for every other class.
- `group` does **not** exist upstream. It is this project's own categorization
  for the grouped `<select>`, so it lives in `GROUPS` in `tools/sync-classes.mjs`,
  which also fixes the order classes appear in. Labels are in `CLASS_GROUPS`
  (`src/lib/classes.ts`).
- `genders` is which body sprites the client ships, so gender-locked classes
  (Musa, Poeta, Diva…) grey out the wrong toggle.
- Classes upstream marks `unreleased` are dropped: that flag means the server
  ships no party icon, which is exactly the file `jobIconUrl()` points at.

## When to run it

After a LATAM client update, or whenever a class is missing/misnamed in the
picker. Regenerate ragassets' own tables first (see its `/deploy` skill) — this
script is only as fresh as `/raw/classes.json`.

## Verify

```bash
git diff --stat src/lib/classes.json   # expect a small, readable diff
npm test && npm run typecheck && npm run build
```

The script **refuses to write** rather than produce a half-right table. If it
exits with `classes.json is out of step with the source table`, act on it:

- `… is new upstream` — a client update added a class. Put its `jt` in the right
  `GROUPS` bucket in `tools/sync-classes.mjs`, in the position it should appear.
- `… is no longer in the source table` — a class vanished upstream. Confirm that
  is intentional before removing it from `GROUPS`.
- `… has no client label` — the client ships no name for it yet. Add one to
  `NAME_OVERRIDES` and drop it again once the client names it.

Two tests back this up, both offline:

- `tools/sync-classes.test.mjs` runs the transform over a committed slice of the
  real upstream table (`tools/fixtures/classes-raw.json`, swatches stripped) and
  asserts the result equals the committed `src/lib/classes.json`. **If you change
  `GROUPS`, `NAME_OVERRIDES` or the projection, refresh that fixture too** when
  the upstream table itself changed — regenerate it from ragassets' real file.
- `src/lib/classes.test.ts` pins the `{id, name, group, genders}` the picker sees
  for a few representative classes.

A name or class change here is user-visible: add a changelog entry
(`src/changelog.ts` **and** `CHANGELOG.md`) and bump the version, or the deploy
ships silently.
