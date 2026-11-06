import { project } from "./world.ts";
type Point = { x: number; y: number };
/** Fauna escénica; no representa miembros, parcelas ni resultados de votación. */
export function drawWildlife(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => Point,
  scale: number,
  triceratops: HTMLImageElement | null,
  time = 0,
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
  for (const [gx, gy] of [
    [14, 25],
    [16, 26],
  ]) {
    const q = project(gx, gy),
      p = screen(q.x, q.y),
      s = 10 * scale;
    const grazing = (1 + Math.sin(time * 0.8 + gx)) * 0.06;
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
    ctx.ellipse(
      s * 0.9,
      -s * (0.9 - grazing),
      s * 0.35,
      s * 0.55,
      -0.4 + grazing,
      0,
      Math.PI * 2,
    );
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
