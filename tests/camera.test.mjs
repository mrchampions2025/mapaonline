import { test } from "node:test";
import assert from "node:assert/strict";
import { screenToWorld, anchoredCamera, panCamera } from "../src/lib/camera.ts";
import {
  MINE,
  MINE_OBSTACLE,
  mineUnlocked,
  mineObstacles,
} from "../src/lib/mine.ts";
import { canWalk, walkingPath, pathPosition } from "../src/lib/navigation.ts";

test("el punto bajo los dedos permanece fijo al ampliar y desplazar la pinza", () => {
  for (const fit of [0.22, 0.8, 1.2])
    for (const zoom of [1, 3, 8, 12]) {
      const start = { x: 620, y: 1020, zoom },
        p = { x: 120, y: 310 };
      const anchor = screenToWorld(p, start, fit, 195, 422);
      const end = { x: 155, y: 370 };
      const camera = anchoredCamera(
        anchor,
        end,
        Math.min(12, zoom * 1.5),
        fit,
        195,
        422,
      );
      const actual = screenToWorld(end, camera, fit, 195, 422);
      assert.ok(Math.hypot(actual.x - anchor.x, actual.y - anchor.y) < 1e-9);
    }
});
test("el arrastre usa el zoom de inicio, sin acumular error por movimiento", () => {
  const c = { x: 800, y: 1080, zoom: 8 };
  const moved = panCamera(c, 120, -80, 0.3);
  assert.equal(moved.x, 750);
  assert.ok(Math.abs(moved.y - 1113.3333333333333) < 1e-9);
  assert.deepEqual(panCamera(c, 0, 0, 0.3), c);
});
test("mina requiere 500 seguidores verificados, no habitantes ni entradas inválidas", () => {
  assert.equal(mineUnlocked(), false);
  for (const n of [0, 389, 499, NaN, Infinity])
    assert.equal(mineUnlocked(n), false);
  assert.equal(mineUnlocked(500), true);
  assert.equal(mineUnlocked(501), true);
});
test("la entrada de mina es accesible desde el bosque, las rocas son sólidas", () => {
  assert.equal(canWalk(MINE.entrance, [MINE_OBSTACLE]), true);
  assert.equal(canWalk(MINE, [MINE_OBSTACLE]), false);
  const path = walkingPath({ x: 565, y: 1030 }, MINE.entrance, [MINE_OBSTACLE]);
  assert.ok(path);
  for (let i = 0; i <= 1000; i++)
    assert.equal(canWalk(pathPosition(path, i / 1000), [MINE_OBSTACLE]), true);
});

test("al verificar 500 seguidores se libera el portal, las paredes siguen sólidas", () => {
  assert.equal(canWalk(MINE, mineObstacles(499)), false);
  assert.equal(canWalk(MINE, mineObstacles(500)), true);
  assert.equal(canWalk({ x: 670, y: 935 }, mineObstacles(500)), false);
});
