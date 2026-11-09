import { LAND_ROWS } from "./terrain.ts";
import { FIRST_MARKET } from "./nation.ts";
import type { Point } from "./player.ts";
export type Obstacle = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export const MARKET_OBSTACLE: Obstacle = {
  left: FIRST_MARKET.x - 51,
  right: FIRST_MARKET.x + 51,
  top: FIRST_MARKET.y - 87,
  bottom: FIRST_MARKET.y + 23,
};
export function landAt(p: Point): boolean {
  if (p.x < 8 || p.x > 1592 || p.y < 8 || p.y > 1992) return false;
  const row = LAND_ROWS[Math.round(p.y / 8)];
  if (!row) return false;
  const x = Math.round(p.x / 8);
  for (let i = 0; i < row.length; i += 2)
    if (x >= row[i] && x <= row[i + 1]) return true;
  return false;
}
export function blocked(
  p: Point,
  obstacles: Obstacle[] = [MARKET_OBSTACLE],
  radius = 4,
) {
  return obstacles.some(
    (o) =>
      p.x > o.left - radius &&
      p.x < o.right + radius &&
      p.y > o.top - radius &&
      p.y < o.bottom + radius,
  );
}
export function canWalk(p: Point, obstacles: Obstacle[] = [MARKET_OBSTACLE]) {
  return (
    landAt(p) &&
    !blocked(p, obstacles) &&
    [
      [3, 0],
      [-3, 0],
      [0, 3],
      [0, -3],
    ].every(([x, y]) => landAt({ x: p.x + x, y: p.y + y }))
  );
}
export function canSail(p: Point) {
  return (
    p.x > 90 &&
    p.x < 1510 &&
    p.y > 540 &&
    p.y < 1620 &&
    [
      [0, 0],
      [28, 0],
      [-28, 0],
      [0, 22],
      [0, -22],
      [20, 16],
      [-20, 16],
      [20, -16],
      [-20, -16],
    ].every(([x, y]) => !landAt({ x: p.x + x, y: p.y + y }))
  );
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function nearPoint(
  origin: Point,
  predicate: (p: Point) => boolean,
  max = 90,
): Point | null {
  if (predicate(origin)) return { ...origin };
  for (let r = 8; r <= max; r += 4)
    for (let a = 0; a < Math.PI * 2; a += Math.min(0.25, 4 / r)) {
      const p = {
        x: origin.x + Math.cos(a) * r,
        y: origin.y + Math.sin(a) * r,
      };
      if (predicate(p)) return p;
    }
  return null;
}
function clearLine(a: Point, b: Point, obstacles: Obstacle[]) {
  const n = Math.ceil(distance(a, b) / 3);
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0;
    if (
      !canWalk(
        { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        obstacles,
      )
    )
      return false;
  }
  return true;
}
export function walkingPath(
  from: Point,
  target: Point,
  obstacles: Obstacle[] = [MARKET_OBSTACLE],
): Point[] | null {
  const end = nearPoint(target, (p) => canWalk(p, obstacles), 24),
    start = nearPoint(from, (p) => canWalk(p, obstacles), 24);
  if (!end || !start) return null;
  if (clearLine(start, end, obstacles)) return [from, start, end];
  const key = (x: number, y: number) => y * 200 + x,
    decode = (k: number) => ({ x: (k % 200) * 8, y: Math.floor(k / 200) * 8 });
  const sx = Math.round(start.x / 8),
    sy = Math.round(start.y / 8),
    ex = Math.round(end.x / 8),
    ey = Math.round(end.y / 8),
    first = key(sx, sy),
    last = key(ex, ey);
  const costs = new Map<number, number>([[first, 0]]),
    parents = new Map<number, number>(),
    closed = new Set<number>(),
    open = [first];
  const heuristic = (k: number) =>
    distance(decode(k), { x: ex * 8, y: ey * 8 });
  let reached: number | null = null;
  while (open.length && closed.size < 20000) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (
        costs.get(open[i])! + heuristic(open[i]) <
        costs.get(open[best])! + heuristic(open[best])
      )
        best = i;
    const current = open.splice(best, 1)[0];
    if (current === last) {
      reached = current;
      break;
    }
    closed.add(current);
    const p = decode(current);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const q = { x: p.x + dx * 8, y: p.y + dy * 8 };
      if (
        q.x < 8 ||
        q.x > 1592 ||
        q.y < 8 ||
        q.y > 1992 ||
        !canWalk(q, obstacles) ||
        !clearLine(p, q, obstacles)
      )
        continue;
      const k = key(Math.round(q.x / 8), Math.round(q.y / 8));
      if (closed.has(k)) continue;
      const cost = costs.get(current)! + Math.hypot(dx, dy) * 8;
      if (cost < (costs.get(k) ?? Infinity)) {
        costs.set(k, cost);
        parents.set(k, current);
        if (!open.includes(k)) open.push(k);
      }
    }
  }
  if (reached === null) return null;
  const points = [end];
  for (let k = reached; k !== first; k = parents.get(k)!)
    points.push(decode(k));
  points.push(start);
  points.reverse();
  const simplified = [from, points[0]];
  for (let i = 0; i < points.length - 1;) {
    let j = points.length - 1;
    while (j > i + 1 && !clearLine(points[i], points[j], obstacles)) j--;
    simplified.push(points[j]);
    i = j;
  }
  return simplified;
}
export function pathPosition(points: Point[], progress: number): Point {
  const lengths = points.slice(1).map((p, i) => distance(p, points[i]));
  let d =
    Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (d <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] ? Math.min(1, d / lengths[i]) : 1;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    }
    d -= lengths[i];
  }
  return points[0];
}
export function moveAgainstCollisions(
  point: Point,
  dx: number,
  dy: number,
  allowed: (p: Point) => boolean,
): Point {
  let p = { ...point };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 2));
  for (let i = 0; i < steps; i++) {
    const q = { x: p.x + dx / steps, y: p.y + dy / steps };
    if (allowed(q)) p = q;
    else if (allowed({ x: q.x, y: p.y })) p.x = q.x;
    else if (allowed({ x: p.x, y: q.y })) p.y = q.y;
  }
  return p;
}
