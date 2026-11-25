// node scripts/originality.test.mjs — self-check for the originality rules on tiny made-up reels
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "./originality.mjs";

const root = mkdtempSync(join(tmpdir(), "originality-"));
const reel = (name, s) => { mkdirSync(join(root, "hyperframes", name), { recursive: true }); writeFileSync(join(root, "hyperframes", name, "script.json"), JSON.stringify(s)); };
const pair = (a, b, defA, defB, example) => [
  { text: `This is ${a}.`, pair: "p1", show: "left" }, { text: `This is ${b}.`, pair: "p1", show: "right" },
  { text: "What's the difference?", pair: "p1", question: true },
  { text: defA, pair: "p1", focus: "left" }, { text: defB, pair: "p1", focus: "right" },
  ...(example ? [{ text: example, pair: "p1" }] : []),
];
const cards = (a, b) => ({ [a]: { label: a, facts: [["Fact", "1"]], art: "<svg/>" }, [b]: { label: b, facts: [["Fact", "2"]], art: "<svg/>" } });
writeFileSync(join(root, "TOPICS.md"), "| 2026-11-01 | first | Celsius vs Fahrenheit |\n| 2026-11-02 | second | Lake vs Pond |\n");

reel("first", { pairs: { p1: { left: "celsius", right: "fahrenheit" } }, cards: cards("celsius", "fahrenheit"), lines: [
  { text: "Hot or cold?", pair: "intro" },
  ...pair("Celsius", "Fahrenheit", "Celsius uses water's freezing point as zero.", "Fahrenheit puts it at 32.", "Water boils at 100 degrees Celsius, which is 212 Fahrenheit!"),
  { text: "I still double it and add 30.", pair: "tip", recap: { term: "Joe's tip", means: "C×2+30" } }, { text: "auto", cta: true }] });
// a good, different reel
reel("second", { pairs: { p1: { left: "lake", right: "pond" } }, cards: cards("lake", "pond"), lines: [
  { text: "True or false: a pond is just a small lake?", pair: "intro" },
  ...pair("a lake", "a pond", "A lake is deep enough that sunlight can't reach the bottom.", "In a pond, plants can grow all the way across.", "Lake Baikal goes down more than 1,600 meters."),
  { text: "My trick: if you can't see the bottom, call it a lake.", pair: "tip", recap: { term: "Joe's tip", means: "deep = lake" } }, { text: "auto", cta: true }] });
// a lazy copy of "first": same topic, same words
reel("third", JSON.parse(JSON.stringify({ pairs: { p1: { left: "celsius", right: "fahrenheit" } }, cards: cards("celsius", "fahrenheit"), lines: [
  { text: "Hot or cold?", pair: "intro" },
  ...pair("Celsius", "Fahrenheit", "Celsius uses water's freezing point as zero.", "Fahrenheit puts it at 32.", "Water boils at 100 degrees Celsius, which is 212 Fahrenheit!"),
  { text: "auto", cta: true }] })));

try {
  const first = check("first", root);
  assert.equal(first.pass, true, "the first reel has nothing to copy");
  const second = check("second", root);
  assert.equal(second.pass, true, JSON.stringify(second.results));
  assert.equal(second.prev, "first");
  const third = check("third", root);
  assert.equal(third.pass, false);
  const rules = third.results.filter((o) => o.level === "fail").map((o) => o.rule).sort();
  assert.deepEqual(rules, ["perspective", "repetitive", "template"], JSON.stringify(third.results));
  // re-checking an older reel never fails because a NEWER reel copied it
  assert.equal(check("first", root).pass, true);
  console.log("originality ✓");
} finally {
  rmSync(root, { recursive: true, force: true });
}
