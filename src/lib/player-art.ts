import { playerPose, TREES, type PlayerAction } from "./player.ts";
type Screen = (x: number, y: number) => { x: number; y: number };
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
  action: PlayerAction,
  now: number,
  nick = "Anónimo",
  still = false,
  color = "#32cdb0",
  pose?: ReturnType<typeof playerPose>,
) {
  const p = pose ?? playerPose(action, now),
    q = screen(p.x, p.y),
    time = still ? 0 : p.phase;
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#071d2c55";
  ctx.beginPath();
  ctx.ellipse(0, 1, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const stride = p.walking ? Math.sin(time * 12) * 4 : 0;
  ctx.strokeStyle = "#24384d";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 3, -8);
    ctx.lineTo(side * 3 + stride * side, 0);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fillRect(-6, -22, 12, 15);
  ctx.fillStyle = "#f1bf8c";
  ctx.beginPath();
  ctx.arc(0, -28, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#382a25";
  ctx.fillRect(-6, -34, 12, 4);
  ctx.strokeStyle = "#f1bf8c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, -19);
  ctx.lineTo(-9, -11 - stride * 0.3);
  ctx.stroke();
  ctx.save();
  ctx.translate(5, -20);
  ctx.rotate(p.chopping ? Math.sin(time * 11) * 1.05 - 0.5 : 0);
  ctx.strokeStyle = "#f1bf8c";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7, 6);
  ctx.stroke();
  if (p.chopping) {
    ctx.strokeStyle = "#9f713d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 7);
    ctx.lineTo(7, -13);
    ctx.stroke();
    ctx.fillStyle = "#d6e2e1";
    ctx.fillRect(5, -15, 10, 6);
  }
  ctx.restore();
  if (p.chopping && !still) {
    ctx.fillStyle = "#e4b67a";
    for (let i = 0; i < 5; i++) {
      const t = (time * 2 + i * 0.2) % 1;
      ctx.fillRect(13 + t * 13, -10 - t * 12 + i, 2, 2);
    }
  }
  for (let i = 0; i < action.logs; i++) {
    ctx.fillStyle = "#8e542b";
    ctx.fillRect(-10, -18 + i * 5, 19, 4);
    ctx.fillStyle = "#efca91";
    ctx.beginPath();
    ctx.arc(-10, -16 + i * 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  if (scale < 0.25) {
    ctx.restore();
    return;
  }
  ctx.font = "700 12px system-ui";
  ctx.textAlign = "center";
  const label = nick === "Anónimo" ? nick : "@" + nick;
  const w = ctx.measureText(label).width + 16;
  ctx.fillStyle = "#07372f";
  ctx.fillRect(q.x - w / 2, q.y - 44 * scale - 20, w, 20);
  ctx.fillStyle = "#a9ffe8";
  ctx.fillText(label, q.x, q.y - 44 * scale - 6);
  ctx.restore();
}
export function drawForest(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
) {
  for (const p of TREES) {
    const q = screen(p.x + 17, p.y);
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#163d3540";
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#865632";
    ctx.fillRect(-3, -23, 6, 24);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = ["#245e47", "#327650", "#409260"][i];
      ctx.beginPath();
      ctx.moveTo(0, -64 + i * 15);
      ctx.lineTo(18 - i * 3, -26 + i * 9);
      ctx.lineTo(-18 + i * 3, -26 + i * 9);
      ctx.fill();
    }
    ctx.restore();
  }
}
/** Extra vector detail is revealed at close zoom; it adds no parcels or buildings. */
export function drawGroundDetail(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
) {
  if (scale < 0.8) return;
  ctx.save();
  ctx.strokeStyle = "#c6d89555";
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 160; i++) {
    const x = 480 + ((i * 67) % 650),
      y = 1000 + ((i * 29) % 180);
    const p = screen(x, y);
    if (p.x < 0 || p.x > ctx.canvas.width || p.y < 0 || p.y > ctx.canvas.height)
      continue;
    ctx.beginPath();
    ctx.moveTo(p.x - 2 * scale, p.y);
    ctx.lineTo(p.x, p.y - 3 * scale);
    ctx.lineTo(p.x + 2 * scale, p.y);
    ctx.stroke();
  }
  ctx.restore();
}
