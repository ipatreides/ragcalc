import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { projectClasses } from "./sync-classes.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8"));

// The real /raw/classes.json with the color swatches stripped — every field the
// projection reads, none of the megabytes it ignores. No network, ever.
const FIXTURE = read("./fixtures/classes-raw.json");
const COMMITTED = read("../src/lib/classes.json");

const byJt = (out, jt) => out.classes.find((c) => c.jt === jt);

describe("projectClasses", () => {
  it("reproduces the committed src/lib/classes.json exactly", () => {
    // Guards against the vendored file being hand-edited: it must be nothing
    // but the output of this script over the upstream table.
    expect(projectClasses(FIXTURE)).toEqual(COMMITTED);
  });

  it("uses ragassets' renderId as the id, not the client job id", () => {
    // Sky Emperor is 4309 in the client but ragassets renders and serves its
    // icon at 4302 — 4302 is the only id this app ever puts in a URL.
    expect(byJt(projectClasses(FIXTURE), "JT_SKY_EMPEROR").id).toBe(4302);
    // Everything else renders at its client id, where the two are equal.
    expect(byJt(projectClasses(FIXTURE), "JT_NOVICE").id).toBe(0);
  });

  it("derives genders from the body palettes the client ships", () => {
    const out = projectClasses(FIXTURE);
    expect(byJt(out, "JT_NOVICE").genders).toEqual(["male", "female"]);
    expect(byJt(out, "JT_TROUBADOUR").genders).toEqual(["male"]);
    expect(byJt(out, "JT_TROUVERE").genders).toEqual(["female"]);
  });

  it("groups and orders classes by the local table, not by source order", () => {
    const out = projectClasses([...FIXTURE].reverse());
    expect(out.classes.map((c) => c.jt)).toEqual(COMMITTED.classes.map((c) => c.jt));
    expect(byJt(out, "JT_SPIRIT_HANDLER").group).toBe("doram");
  });

  it("falls back to a local name when the client ships no label", () => {
    expect(byJt(projectClasses(FIXTURE), "JT_SHINKIRO").name).toBe("Shinkiro");
  });

  it("drops classes the server has not released", () => {
    const src = FIXTURE.map((c) => (c.jt === "JT_SPIRIT_HANDLER" ? { ...c, unreleased: true } : c));
    expect(byJt(projectClasses(src), "JT_SPIRIT_HANDLER")).toBeUndefined();
  });

  it("refuses to write a table with an unclassified class", () => {
    const src = [...FIXTURE, { ...FIXTURE[0], jt: "JT_MOONLIGHT_FLOWER", id: 9001, renderId: 9001 }];
    expect(() => projectClasses(src)).toThrow(/JT_MOONLIGHT_FLOWER is new upstream/);
  });

  it("refuses to write a table that silently lost a class", () => {
    const src = FIXTURE.filter((c) => c.jt !== "JT_SUMMONER");
    expect(() => projectClasses(src)).toThrow(/JT_SUMMONER is no longer in the source table/);
  });

  it("refuses an unnamed class with no local override", () => {
    const src = FIXTURE.map((c) => (c.jt === "JT_NOVICE" ? { ...c, name: null } : c));
    expect(() => projectClasses(src)).toThrow(/JT_NOVICE has no client label/);
  });
});
