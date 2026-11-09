import { test } from "node:test";
import assert from "node:assert/strict";
import {
  walkingPath,
  canWalk,
  canSail,
  distance,
  MARKET_OBSTACLE,
  pathPosition,
  nearPoint,
} from "../src/lib/navigation.ts";
import {
  createAdventure,
  stepAdventure,
  saveAdventure,
  boardBoat,
  leaveBoat,
  HIDDEN_ANIMALS,
} from "../src/lib/adventure.ts";
import { TREES, HARBOR, START, IDLE, playerPose } from "../src/lib/player.ts";
test("la ruta al muelle rodea el puesto completo y no atraviesa agua ni esquinas", () => {
  for (const from of TREES) {
    const path = walkingPath(from, HARBOR);
    assert.ok(path?.length > 2);
    for (let i = 0; i <= 4000; i++)
      assert.ok(
        canWalk(pathPosition(path, i / 4000)),
        JSON.stringify(pathPosition(path, i / 4000)),
      );
  }
  assert.equal(
    canWalk({
      x: (MARKET_OBSTACLE.left + MARKET_OBSTACLE.right) / 2,
      y: (MARKET_OBSTACLE.top + MARKET_OBSTACLE.bottom) / 2,
    }),
    false,
  );
});
test("caminar y navegar responden al control, se detienen al soltar y no cruzan paredes", () => {
  const s = createAdventure(),
    initial = { ...s.player };
  stepAdventure(s, 0.016, 100);
  assert.deepEqual(s.player, initial);
  s.input = { x: 1, y: 0 };
  for (let i = 0; i < 60; i++) stepAdventure(s, 1 / 60, 100 + (i * 1000) / 60);
  assert.ok(distance(s.player, initial) > 20);
  assert.ok(canWalk(s.player));
  s.input = { x: 0, y: 0 };
  const stopped = { ...s.player };
  for (let i = 0; i < 60; i++) stepAdventure(s, 1 / 60, 2000 + i * 16);
  assert.deepEqual(s.player, stopped);
  s.player = { x: MARKET_OBSTACLE.left - 8, y: MARKET_OBSTACLE.top + 40 };
  s.input = { x: 1, y: 0 };
  for (let i = 0; i < 180; i++) stepAdventure(s, 1 / 60, 4000 + i * 16);
  assert.ok(s.player.x <= MARKET_OBSTACLE.left - 4);
  s.aboard = true;
  s.boat = { x: 800, y: 1480 };
  s.input = { x: 0, y: -1 };
  for (let i = 0; i < 600; i++) stepAdventure(s, 1 / 60, 8000 + i * 16);
  assert.ok(canSail(s.boat));
  assert.ok(s.boat.y > 1250);
});
test("velocidad independiente de 60 o 120 Hz y sin saltos al volver de segundo plano", () => {
  const a = createAdventure(),
    b = createAdventure();
  a.player = { x: 800, y: 1210 };
  b.player = { ...a.player };
  a.input = b.input = { x: 1, y: 0 };
  for (let i = 0; i < 60; i++) stepAdventure(a, 1 / 60, (i * 1000) / 60);
  for (let i = 0; i < 120; i++) stepAdventure(b, 1 / 120, (i * 1000) / 120);
  assert.ok(distance(a.player, b.player) < 0.01);
  const before = { ...a.player };
  stepAdventure(a, 1000, 1000000);
  assert.ok(distance(before, a.player) <= 62 * 0.05 + 0.001);
});
test("el barco no embarca a distancia, puede bajar en costas diferentes y conserva su posición", () => {
  const s = createAdventure();
  assert.equal(boardBoat(s), false);
  assert.equal(s.aboard, false);
  assert.ok(s.path?.length);
  s.player = nearPoint(s.boat, canWalk, 85);
  assert.ok(s.player);
  assert.equal(boardBoat(s), true);
  const parked = { ...s.boat };
  assert.equal(leaveBoat(s), true);
  assert.ok(canWalk(s.player));
  assert.deepEqual(s.boat, parked);
  s.aboard = true;
  s.boat = { x: 800, y: 600 };
  assert.equal(leaveBoat(s), false);
  assert.equal(s.aboard, true);
  for (const point of [
    { x: 280, y: 1260 },
    { x: 1250, y: 755 },
    { x: 1050, y: 1370 },
  ]) {
    const sea = nearPoint(point, canSail, 100);
    assert.ok(sea);
    s.boat = sea;
    const shore = nearPoint(sea, canWalk, 85);
    if (shore) {
      assert.equal(leaveBoat(s), true);
      assert.ok(canWalk(s.player));
      s.aboard = true;
    }
  }
});
test("las seis especies están en suelo accesible y el desplazamiento de trabajo sigue la ruta", () => {
  for (const a of HIDDEN_ANIMALS) assert.ok(canWalk(a), a.code);
  const path = walkingPath(TREES[2], HARBOR),
    a = {
      ...IDLE,
      kind: "deliver",
      from: TREES[2],
      to: HARBOR,
      started: 1000,
      walkDuration: 10000,
      duration: 11200,
      path,
      logs: 3,
    };
  for (let i = 0; i < 1000; i++) {
    const p = playerPose(a, 1000 + i * 11.2);
    assert.ok(canWalk(p));
  }
  assert.equal(playerPose(a, 13000).unloading, true);
});

test("recargar a bordo conserva barco y modo de navegación incluso en la coordenada de salida original", () => {
  const previous = globalThis.localStorage;
  let saved = null;
  globalThis.localStorage = {
    getItem: () => saved,
    setItem: (_, value) => {
      saved = value;
    },
  };
  try {
    const s = createAdventure();
    s.boat = { x: 1200, y: 1390 };
    s.aboard = true;
    saveAdventure(s);
    const restored = createAdventure();
    assert.equal(restored.aboard, true);
    assert.deepEqual(restored.boat, s.boat);
    restored.aboard = false;
    saveAdventure(restored);
    assert.equal(createAdventure().aboard, false);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});
