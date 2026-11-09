export type Camera = { x: number; y: number; zoom: number };
type Point = { x: number; y: number };

// All input coordinates use the displayed camera, never a React target in transit.
export function screenToWorld(
  p: Point,
  c: Camera,
  fit: number,
  cx: number,
  cy: number,
): Point {
  return {
    x: c.x + (p.x - cx) / (fit * c.zoom),
    y: c.y + (p.y - cy) / (fit * c.zoom),
  };
}
export function anchoredCamera(
  anchor: Point,
  p: Point,
  zoom: number,
  fit: number,
  cx: number,
  cy: number,
): Camera {
  return {
    zoom,
    x: anchor.x - (p.x - cx) / (fit * zoom),
    y: anchor.y - (p.y - cy) / (fit * zoom),
  };
}
export function panCamera(
  start: Camera,
  dx: number,
  dy: number,
  fit: number,
): Camera {
  return {
    ...start,
    x: Math.max(0, Math.min(1600, start.x - dx / (fit * start.zoom))),
    y: Math.max(400, Math.min(1800, start.y - dy / (fit * start.zoom))),
  };
}
