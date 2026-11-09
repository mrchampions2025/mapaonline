import { test } from "node:test";
import assert from "node:assert/strict";
import {
  playerPose,
  shipPosition,
  VOYAGE_MS,
  SEA_ROUTE,
  TREES,
  IDLE,
} from "../src/lib/player.ts";
test("la carga camina, corta al llegar y termina en el árbol sin saltos", () => {
  const a = {
    ...IDLE,
    kind: "chop",
    to: TREES[0],
    started: 1000,
    duration: 5500,
  };
  assert.deepEqual(playerPose(a, 0).x, IDLE.from.x);
  assert.equal(playerPose(a, 2000).walking, true);
  assert.equal(playerPose(a, 4000).chopping, true);
  assert.equal(playerPose(a, 6500).chopping, false);
  assert.equal(playerPose(a, 6500).x, TREES[0].x);
});
test("entrega: lleva los troncos hasta el muelle antes de descargar", () => {
  const a = {
    ...IDLE,
    kind: "deliver",
    to: { x: 1050, y: 1265 },
    duration: 9000,
    started: 1000,
    logs: 3,
  };
  assert.equal(playerPose(a, 6000).unloading, false);
  assert.equal(playerPose(a, 9900).unloading, true);
  assert.equal(playerPose(a, 9900).x, 1050);
});
test("ruta de 60 segundos cerrada, continua y alrededor de los cuatro lados de la isla", () => {
  const first = shipPosition(1000, 1000),
    last = shipPosition(1000, 1000 + VOYAGE_MS);
  assert.ok(Math.abs(first.x - last.x) < 1e-9);
  assert.ok(Math.abs(first.y - last.y) < 1e-9);
  const points = Array.from({ length: 601 }, (_, i) =>
    shipPosition(1000, 1000 + i * 100, 60),
  );
  for (let i = 1; i < points.length; i++)
    assert.ok(
      Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) <
        15,
    );
  assert.ok(Math.min(...points.map((p) => p.x)) < 300);
  assert.ok(Math.max(...points.map((p) => p.x)) > 1350);
  assert.ok(Math.min(...points.map((p) => p.y)) < 700);
  assert.ok(Math.max(...points.map((p) => p.y)) > 1400);
  assert.equal(shipPosition(1000, -10).progress, 0);
  assert.equal(shipPosition(1000, 100000).progress, 1);
  assert.equal(SEA_ROUTE.length, 11);
});
