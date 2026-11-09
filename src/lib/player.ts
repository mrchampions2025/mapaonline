import { pathPosition } from "./navigation.ts";
export const HARBOR = { x: 1050, y: 1265 },
  FOREST = { x: 565, y: 1030 },
  SHIP = { x: 1200, y: 1390 };
export type Point = { x: number; y: number };
export type PlayerAction = {
  kind: "idle" | "chop" | "deliver" | "walk";
  from: Point;
  to: Point;
  started: number;
  duration: number;
  logs: number;
  path?: Point[];
  walkDuration?: number;
};
export const TREES: Point[] = [
  { x: 545, y: 1015 },
  { x: 585, y: 1040 },
  { x: 615, y: 1018 },
];
export const START: Point = { x: 560, y: 1060 };
export const VOYAGE_MS = 60000;
export const SEA_ROUTE: Point[] = [
  { x: 1200, y: 1390 },
  { x: 900, y: 1480 },
  { x: 500, y: 1440 },
  { x: 240, y: 1280 },
  { x: 260, y: 960 },
  { x: 420, y: 740 },
  { x: 820, y: 650 },
  { x: 1250, y: 650 },
  { x: 1410, y: 920 },
  { x: 1410, y: 1240 },
  { x: 1200, y: 1390 },
];
const legs = SEA_ROUTE.slice(1).map((p, i) =>
  Math.hypot(p.x - SEA_ROUTE[i].x, p.y - SEA_ROUTE[i].y),
);
const length = legs.reduce((a, b) => a + b, 0);
export function shipPosition(started: number, now: number, offset = 0) {
  let distance = Math.min(1, Math.max(0, (now - started) / VOYAGE_MS)) * length;
  for (let i = 0; i < legs.length; i++) {
    if (distance <= legs[i] || i === legs.length - 1) {
      const a = SEA_ROUTE[i],
        b = SEA_ROUTE[i + 1],
        t = Math.min(1, distance / legs[i]);
      const dx = b.x - a.x,
        dy = b.y - a.y,
        normal = offset * Math.sin(Math.PI * t);
      return {
        x: a.x + dx * t - (dy / legs[i]) * normal,
        y: a.y + dy * t + (dx / legs[i]) * normal,
        facing: dx >= 0 ? 1 : -1,
        progress: Math.min(1, Math.max(0, (now - started) / VOYAGE_MS)),
      };
    }
    distance -= legs[i];
  }
  return { ...SEA_ROUTE[0], facing: 1, progress: 1 };
}
export function playerPose(action: PlayerAction, now: number) {
  const elapsed = Math.max(0, now - action.started),
    walk =
      action.walkDuration ??
      (action.kind === "walk"
        ? action.duration
        : action.kind === "deliver"
          ? action.duration * 0.85
          : action.kind === "chop"
            ? action.duration * 0.45
            : 0);
  const t = walk ? Math.min(1, elapsed / walk) : 1;
  const position = action.path?.length
    ? pathPosition(action.path, t)
    : {
        x: action.from.x + (action.to.x - action.from.x) * t,
        y: action.from.y + (action.to.y - action.from.y) * t,
      };
  return {
    ...position,
    walking: t < 1,
    chopping: action.kind === "chop" && t === 1 && elapsed < action.duration,
    unloading: action.kind === "deliver" && t === 1,
    phase: elapsed / 1000,
  };
}
export const IDLE: PlayerAction = {
  kind: "idle",
  from: START,
  to: START,
  started: 0,
  duration: 0,
  logs: 0,
};
