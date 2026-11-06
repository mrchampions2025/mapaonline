import { project } from "./world.ts";
type Point = { x: number; y: number };
/** Fauna escénica; no representa miembros, parcelas ni resultados de votación. */
export function drawWildlife(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => Point,
  scale: number,
  triceratops: HTMLImageElement | null,
) {
  const b = project(27, 23),
    p = screen(b.x, b.y);
  if (triceratops) {
    const w = 172 * scale,
      h = 172 * scale;
    ctx.save();
    ctx.fillStyle = "#071d2c38";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w * 0.36, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(triceratops, p.x - w * 0.5, p.y - h * 0.88, w, h);
    ctx.fillStyle = "#102b37";
    ctx.font = `600 ${Math.max(9, Math.min(13, 11 * scale))}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("ZONA B · VALLE VERDE", p.x, p.y + Math.max(16, 20 * scale));
    ctx.restore();
  }
  for (const [gx, gy] of [
    [14, 25],
    [16, 26],
  ]) {
    const q = project(gx, gy),
      p = screen(q.x, q.y),
      s = 10 * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.strokeStyle = "#6d4937";
    ctx.lineWidth = Math.max(1, 2 * scale);
    for (const x of [-s * 0.55, s * 0.45]) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s);
      ctx.stroke();
    }
    ctx.fillStyle = "#c39766";
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.35, s, s * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.9, -s * 0.9, s * 0.35, s * 0.55, -0.4, 0, Math.PI * 2);
    ctx.fill();
    for (const x of [s * 0.7, s * 1.05]) {
      ctx.beginPath();
      ctx.moveTo(x, -s * 1.2);
      ctx.lineTo(x - s * 0.1, -s * 1.9);
      ctx.lineTo(x - s * 0.45, -s * 2.1);
      ctx.moveTo(x - s * 0.1, -s * 1.65);
      ctx.lineTo(x + s * 0.25, -s * 1.95);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const [gx, gy] of [
    [31, 28],
    [32, 29],
    [22, 34],
  ]) {
    const q = project(gx, gy),
      p = screen(q.x, q.y),
      s = 6 * scale;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "#f6ead7";
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.7, -s * 0.5, s * 0.5, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const x of [s * 0.6, s]) {
      ctx.beginPath();
      ctx.ellipse(x, -s * 1.3, s * 0.15, s * 0.65, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = "#e5efec";
  ctx.lineWidth = Math.max(1, scale * 1.8);
  for (const [gx, gy] of [
    [9, 30],
    [11, 31],
    [10, 33],
  ]) {
    const q = project(gx, gy),
      p = screen(q.x, q.y);
    ctx.beginPath();
    ctx.moveTo(p.x - 8 * scale, p.y - 28 * scale);
    ctx.quadraticCurveTo(
      p.x - 3 * scale,
      p.y - 33 * scale,
      p.x,
      p.y - 27 * scale,
    );
    ctx.quadraticCurveTo(
      p.x + 3 * scale,
      p.y - 33 * scale,
      p.x + 8 * scale,
      p.y - 28 * scale,
    );
    ctx.stroke();
  }
  ctx.restore();
}
