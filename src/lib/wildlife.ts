import { drawArticulatedFauna, type AnimalSprites } from "./fauna_atlas.ts";
import { project } from "./world.ts";
type Point = { x: number; y: number };
/** Fauna escénica; no representa miembros, parcelas ni resultados de votación. */
export function drawWildlife(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => Point,
  scale: number,
  triceratops: HTMLImageElement | null,
  time = 0,
  animalSprites: AnimalSprites = {},
) {
  const b = project(27, 23),
    p = screen(b.x, b.y);
  if (triceratops) {
    const w = 90 * scale,
      h = 90 * scale;
    const frame = Math.floor(time * 12) % 64;
    ctx.save();
    // Measured toe positions in the original sprite. Each foot has a contact
    // shadow on its own ground plane; the texture never floats up and down.
    ctx.fillStyle = "#163b3540";
    ctx.beginPath();
    ctx.ellipse(
      p.x - w * 0.06,
      p.y - h * 0.025,
      w * 0.25,
      h * 0.035,
      -0.12,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#17382e85";
    for (const [fx, fy] of [
      [0.2208, 0.7713],
      [0.4422, 0.8553],
      [0.6571, 0.8008],
    ]) {
      ctx.beginPath();
      ctx.ellipse(
        p.x + (fx - 0.5) * w,
        p.y + (fy - 0.8553 + 0.004) * h,
        w * 0.057,
        h * 0.013,
        -0.12,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.strokeStyle = "#648c4d";
    ctx.lineWidth = Math.max(1, scale);
    for (let g = 0; g < 5; g++) {
      const x = p.x + w * (0.27 + g * 0.025),
        y = p.y - h * 0.025;
      ctx.beginPath();
      ctx.moveTo(x - 2 * scale, y);
      ctx.lineTo(x, y - 5 * scale);
      ctx.lineTo(x + 2 * scale, y);
      ctx.stroke();
    }
    ctx.drawImage(
      triceratops,
      (frame % 8) * 320,
      Math.floor(frame / 8) * 320,
      320,
      320,
      p.x - w * 0.5,
      p.y - h * 0.8553,
      w,
      h,
    );
    ctx.fillStyle = "#102b37";
    ctx.font = `600 ${Math.max(9, Math.min(13, 11 * scale))}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("ZONA B · VALLE VERDE", p.x, p.y + Math.max(16, 20 * scale));
    ctx.restore();
  }
  drawArticulatedFauna(ctx, screen, scale, animalSprites, time);
  ctx.save();
  ctx.strokeStyle = "#e5efec";
  ctx.lineWidth = Math.max(1, scale * 1.8);
  for (const [gx, gy] of [
    [9, 30],
    [11, 31],
    [10, 33],
  ]) {
    const q = project(gx, gy),
      p = screen(q.x + Math.sin(time * 0.5 + gx) * 5, q.y);
    const wing = (3 + Math.sin(time * 4 + gx) * 2) * scale;
    ctx.beginPath();
    ctx.moveTo(p.x - 8 * scale, p.y - 28 * scale);
    ctx.quadraticCurveTo(
      p.x - 3 * scale,
      p.y - 28 * scale - wing,
      p.x,
      p.y - 27 * scale,
    );
    ctx.quadraticCurveTo(
      p.x + 3 * scale,
      p.y - 28 * scale - wing,
      p.x + 8 * scale,
      p.y - 28 * scale,
    );
    ctx.stroke();
  }
  ctx.restore();
}
