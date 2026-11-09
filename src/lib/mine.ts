import { TIKTOK_AUDIENCE } from "./community.ts";

// A verified audience snapshot gates this teaser. Residents cannot unlock it.
// Updating this snapshot requires a new verified reading of the official account.
export const MINE = {
  x: 700,
  y: 940,
  goal: 500,
  entrance: { x: 700, y: 982 },
} as const;
export const MINE_OBSTACLE = { left: 665, right: 735, top: 899, bottom: 952 };
export function mineUnlocked(followers: number = TIKTOK_AUDIENCE.followers) {
  return Number.isFinite(followers) && followers >= MINE.goal;
}
export function mineObstacles(followers: number = TIKTOK_AUDIENCE.followers) {
  return mineUnlocked(followers)
    ? [
        { left: 665, right: 678, top: 899, bottom: 952 },
        { left: 722, right: 735, top: 899, bottom: 952 },
        { left: 665, right: 735, top: 899, bottom: 910 },
      ]
    : [MINE_OBSTACLE];
}

export function drawMine(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => { x: number; y: number },
  scale: number,
  time: number,
  reduced: boolean,
) {
  const p = screen(MINE.x, MINE.y);
  if (
    p.x < -200 ||
    p.y < -200 ||
    p.x > ctx.canvas.width + 200 ||
    p.y > ctx.canvas.height + 200
  )
    return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#18252266";
  ctx.beginPath();
  ctx.ellipse(0, 12, 45, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hand drawn stone arch, ore seams, timber braces and a grounded mine cart.
  ctx.fillStyle = "#56626a";
  ctx.beginPath();
  ctx.moveTo(-39, 9);
  ctx.lineTo(-34, -25);
  ctx.lineTo(-19, -41);
  ctx.lineTo(5, -47);
  ctx.lineTo(29, -33);
  ctx.lineTo(38, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8d9a9b";
  ctx.lineWidth = 2;
  for (const [x, y] of [
    [-28, -22],
    [-14, -34],
    [13, -32],
    [27, -12],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 3);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x + 7, y - 1);
    ctx.stroke();
  }
  ctx.fillStyle = "#080f15";
  ctx.beginPath();
  ctx.roundRect(-22, -28, 44, 39, [18, 18, 0, 0]);
  ctx.fill();
  ctx.strokeStyle = "#8d5e35";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, 11);
  ctx.lineTo(-24, -29);
  ctx.lineTo(24, -29);
  ctx.lineTo(24, 11);
  ctx.stroke();
  ctx.strokeStyle = "#657781";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-11, 7);
  ctx.lineTo(-17, 31);
  ctx.moveTo(11, 7);
  ctx.lineTo(17, 31);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-12 - i, 12 + i * 5);
    ctx.lineTo(12 + i, 12 + i * 5);
    ctx.stroke();
  }
  ctx.fillStyle = "#8f7447";
  ctx.fillRect(31, 3, 19, 12);
  ctx.fillStyle = "#242d34";
  for (const x of [35, 46]) {
    ctx.beginPath();
    ctx.arc(x, 17, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#8bb8be";
  ctx.beginPath();
  ctx.moveTo(34, 4);
  ctx.lineTo(38, -5);
  ctx.lineTo(44, -1);
  ctx.lineTo(48, 4);
  ctx.fill();
  ctx.fillStyle = `rgba(255,189,83,${reduced ? 0.9 : 0.8 + 0.15 * Math.sin(time * 3)})`;
  ctx.fillRect(-34, -19, 5, 8);
  if (!mineUnlocked()) {
    // Two distinct chains, with alternating metal links, form a visible X.
    for (const sign of [-1, 1])
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        ctx.save();
        ctx.translate(-24 + t * 48, -8.5 + sign * (-17.5 + t * 35));
        ctx.rotate(sign * Math.atan2(35, 48));
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = i % 2 ? "#dce3e6" : "#95a4b0";
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.1, 2.2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    ctx.strokeStyle = "#f3c677";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -10, 4, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#d7a84e";
    ctx.fillRect(-6, -10, 12, 10);
    ctx.fillStyle = "#45361f";
    ctx.fillRect(-1, -7, 2, 4);
  }
  ctx.restore();
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "700 12px system-ui";
  const text = mineUnlocked()
    ? "MINA · META ALCANZADA"
    : "MINA · 500 SEGUIDORES";
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = "#101e2aee";
  ctx.beginPath();
  ctx.roundRect(p.x - w / 2, p.y + 34 * scale, w, 25, 8);
  ctx.fill();
  ctx.fillStyle = "#f3c677";
  ctx.fillText(text, p.x, p.y + 34 * scale + 17);
  ctx.restore();
}
