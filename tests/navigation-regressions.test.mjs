import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAdventure,
  stepAdventure,
  walkTo,
} from "../src/lib/adventure.ts";
import { canWalk, distance } from "../src/lib/navigation.ts";
import { IDLE } from "../src/lib/player.ts";

test("un destino inaccesible cancela la ruta anterior y no sigue hacia otro lado", () => {
  const s = createAdventure();
  s.player = { x: 565, y: 1060 };
  s.action = { ...IDLE, from: s.player, to: s.player };
  assert.equal(walkTo(s, { x: 620, y: 1070 }), true);
  assert.ok(s.path?.length);
  assert.equal(walkTo(s, { x: 90, y: 600 }), false);
  assert.equal(s.path, null);
  const before = { ...s.player };
  stepAdventure(s, 1 / 60, Date.now());
  assert.deepEqual(s.player, before);
});
test("si aparece un obstáculo en una ruta, no atraviesa el último tramo ni camina eternamente", () => {
  const s = createAdventure();
  s.player = { x: 565, y: 1060 };
  s.action = { ...IDLE, from: s.player, to: s.player };
  s.path = [{ x: 580, y: 1060 }];
  s.obstacles = [{ left: 572, right: 590, top: 1050, bottom: 1070 }];
  for (let i = 0; i < 100; i++) stepAdventure(s, 1 / 60, Date.now());
  assert.ok(canWalk(s.player, s.obstacles));
  assert.equal(s.path, null);
  assert.equal(s.walking, false);
  assert.ok(distance(s.player, { x: 580, y: 1060 }) > 10);
});
test("cambiar varias veces de destino conserva la posición y obedece solo al último toque", () => {
  const s = createAdventure();
  s.player = { x: 565, y: 1060 };
  s.action = { ...IDLE, from: s.player, to: s.player };
  for (const target of [
    { x: 620, y: 1070 },
    { x: 590, y: 1100 },
    { x: 610, y: 1080 },
  ])
    assert.equal(walkTo(s, target), true);
  assert.deepEqual(s.player, { x: 565, y: 1060 });
  const goal = { ...s.path.at(-1) };
  for (let i = 0; i < 400; i++) stepAdventure(s, 1 / 60, Date.now());
  assert.ok(distance(s.player, goal) < 0.01);
});
