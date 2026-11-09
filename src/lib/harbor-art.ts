import { shipPosition } from "./player.ts";
import { FOREST, HARBOR, SHIP } from "./player.ts";
type Screen = (x: number, y: number) => { x: number; y: number };
export function drawHarbor(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
  time: number,
  deliveries: number,
  voyage: boolean,
  offset = 0,
  voyageStarted = 0,
  now = Date.now(),
) {
  const f = screen(FOREST.x, FOREST.y);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(scale, scale);
  for (const [x, y] of [
    [-12, 0],
    [0, -5],
    [12, 1],
  ]) {
    ctx.fillStyle = "#936039";
    ctx.fillRect(x - 5, y - 4, 18, 8);
    ctx.fillStyle = "#e6ba79";
    ctx.beginPath();
    ctx.ellipse(x - 5, y, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  const p = screen(HARBOR.x, HARBOR.y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  // A construction site becomes a pier only through recorded community deliveries.
  ctx.strokeStyle = "#593b26";
  ctx.lineWidth = 4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 10 - 20, i * 5);
    ctx.lineTo(i * 10 - 20, i * 5 + 12);
    ctx.stroke();
  }
  const planks = Math.floor((Math.min(50, deliveries) / 50) * 12);
  for (let i = 0; i < planks; i++) {
    ctx.fillStyle = i % 2 ? "#cd9b62" : "#e5b578";
    ctx.beginPath();
    ctx.moveTo(-27 + i * 6, -6 + i * 3);
    ctx.lineTo(-11 + i * 6, -13 + i * 3);
    ctx.lineTo(-5 + i * 6, -9 + i * 3);
    ctx.lineTo(-21 + i * 6, -2 + i * 3);
    ctx.fill();
  }
  ctx.restore();
  const pos = voyage
    ? shipPosition(voyageStarted, now, offset)
    : { ...SHIP, facing: 1 };
  const boat = screen(pos.x, pos.y);
  ctx.save();
  ctx.translate(boat.x, boat.y + Math.sin(time * 1.8) * 1.3 * scale);
  ctx.scale(scale * 0.75 * pos.facing, scale * 0.75);
  ctx.fillStyle = "#70e0c125";
  ctx.beginPath();
  ctx.ellipse(0, 15, 53, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#53311f";
  ctx.beginPath();
  ctx.moveTo(-53, -3);
  ctx.lineTo(49, -6);
  ctx.lineTo(36, 21);
  ctx.quadraticCurveTo(0, 32, -40, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d8a758";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-49, 0);
  ctx.lineTo(45, -3);
  ctx.stroke();
  for (const x of [-23, -3, 17]) {
    ctx.fillStyle = "#172b33";
    ctx.fillRect(x, 9, 8, 5);
    ctx.fillStyle = "#434848";
    ctx.fillRect(x - 2, 10, 12, 3);
  }
  for (const x of [-20, 14]) {
    ctx.strokeStyle = "#775032";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 1);
    ctx.lineTo(x, -65);
    ctx.stroke();
    ctx.fillStyle = x < 0 ? "#f3e4c1" : "#d1e9e2";
    ctx.beginPath();
    ctx.moveTo(x + 2, -62);
    ctx.quadraticCurveTo(x + 30 + Math.sin(time * 2) * 2, -40, x + 3, -16);
    ctx.lineTo(x + 2, -62);
    ctx.fill();
    ctx.strokeStyle = "#bfb18a";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.strokeStyle = "#e6cb8b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -60);
  ctx.lineTo(-47, 0);
  ctx.moveTo(14, -62);
  ctx.lineTo(40, -3);
  ctx.stroke();
  ctx.fillStyle = "#70e0c1";
  ctx.beginPath();
  ctx.moveTo(14, -65);
  ctx.lineTo(29, -61);
  ctx.lineTo(14, -57);
  ctx.fill();
  ctx.restore();
  if (scale > 0.55) {
    for (const [place, label] of [
      [
        HARBOR,
        deliveries >= 50 ? "Muelle terminado" : "Muelle · obra comunitaria",
      ],
      [pos, "Barco de @.cyberfile"],
      [FOREST, "Bosque · recoge madera"],
    ] as const) {
      const q = screen(place.x, place.y);
      ctx.save();
      ctx.font = "600 11px system-ui";
      ctx.textAlign = "center";
      const w = ctx.measureText(label).width + 16;
      ctx.fillStyle = "#071d2cf2";
      ctx.fillRect(q.x - w / 2, q.y + 35 * scale, w, 22);
      ctx.fillStyle = "#ffc466";
      ctx.fillText(label, q.x, q.y + 35 * scale + 15);
      ctx.restore();
    }
  }
}
