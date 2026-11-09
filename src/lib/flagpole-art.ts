import { SUMMIT_FLAGPOLE } from "./nation.ts";

export { SUMMIT_FLAGPOLE };

type Screen = (x: number, y: number) => { x: number; y: number };

let cachedFlagImg: HTMLImageElement | null = null;
function getFlagImage(): HTMLImageElement | null {
  if (typeof window === "undefined" || typeof Image === "undefined") return null;
  if (!cachedFlagImg) {
    cachedFlagImg = new Image();
    cachedFlagImg.src = "/flags/bandera_1_leon_v2.png";
  }
  return cachedFlagImg;
}

/**
 * Renders the official national mast and waving flag on the highest summit of Hispania.
 * Uses the exact official image asset provided by the user without alterations,
 * mapped onto dynamic vertical cloth-wave slices with lighting highlights and shadows.
 */
export function drawFlagpole(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
  time: number,
  reducedMotion: boolean,
) {
  const p = screen(SUMMIT_FLAGPOLE.x, SUMMIT_FLAGPOLE.y);
  if (
    p.x < -160 ||
    p.y < -160 ||
    p.x > ctx.canvas.width + 160 ||
    p.y > ctx.canvas.height + 160
  )
    return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);

  // 1. Mountain summit base shadow
  ctx.fillStyle = "#16232cee";
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Worked stone plinth foundation
  ctx.fillStyle = "#38434c";
  ctx.beginPath();
  ctx.ellipse(0, 2, 16, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#505c66";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Upper pedestal step
  ctx.fillStyle = "#525e68";
  ctx.beginPath();
  ctx.ellipse(0, -1, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golden collar ring
  ctx.fillStyle = "#dcb143";
  ctx.fillRect(-3, -3, 6, 2.5);

  // 3. Tall Mast (Flagpole)
  const mastHeight = 82;
  const mastTopY = -mastHeight;

  const poleGrad = ctx.createLinearGradient(-2, 0, 2, 0);
  poleGrad.addColorStop(0, "#3d2a1b");
  poleGrad.addColorStop(0.35, "#8a6646");
  poleGrad.addColorStop(0.7, "#61432a");
  poleGrad.addColorStop(1, "#291b10");

  ctx.fillStyle = poleGrad;
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(-1.3, mastTopY);
  ctx.lineTo(1.3, mastTopY);
  ctx.lineTo(2, -2);
  ctx.closePath();
  ctx.fill();

  // Halyard rope
  ctx.strokeStyle = "#e8e5dc";
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(1.8, mastTopY + 3);
  ctx.lineTo(2.2, -5);
  ctx.stroke();

  // Cleat
  ctx.fillStyle = "#c79e39";
  ctx.fillRect(1.5, -9, 2.2, 4);

  // 4. Waving Flag: EXACT IMAGE ASSET MAPPED ACROSS CLOTH SLICES
  // Aspect ratio of the original flag is ~1024x665 (~1.54)
  const flagW = 54;
  const flagH = 35;
  const flagTop = mastTopY + 3;
  const flagLeft = 1.4;
  const slices = 28;
  const sliceW = flagW / slices;

  const img = getFlagImage();
  const hasImg = img && img.complete && img.naturalWidth > 0;

  for (let i = 0; i < slices; i++) {
    const x0 = flagLeft + i * sliceW;
    const prog0 = i / slices;
    const prog1 = (i + 1) / slices;

    // Flutter wave displacement
    const waveY0 = reducedMotion
      ? 0
      : Math.sin(time * 5.8 - prog0 * 4.8) * (prog0 * 4.2) +
        Math.cos(time * 3.2 + prog0 * 2.1) * (prog0 * 1.6);
    const waveY1 = reducedMotion
      ? 0
      : Math.sin(time * 5.8 - prog1 * 4.8) * (prog1 * 4.2) +
        Math.cos(time * 3.2 + prog1 * 2.1) * (prog1 * 1.6);

    const yTop0 = flagTop + waveY0;
    const slope = reducedMotion
      ? 0
      : Math.cos(time * 5.8 - ((prog0 + prog1) / 2) * 4.8);

    if (hasImg) {
      // Draw exact slice of the authentic user flag image
      const sx = prog0 * img.naturalWidth;
      const sw = (1 / slices) * img.naturalWidth;
      ctx.drawImage(
        img,
        sx,
        0,
        sw,
        img.naturalHeight,
        x0,
        yTop0,
        sliceW + 0.4,
        flagH,
      );
    } else {
      // Solid base fallback while image initializes
      ctx.fillStyle = "#8d1830";
      ctx.fillRect(x0, yTop0, sliceW + 0.4, flagH);
    }

    // Fabric Wave Light & Shadow Overlay
    if (!reducedMotion && Math.abs(slope) > 0.05) {
      if (slope > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(slope * 0.16).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${(-slope * 0.24).toFixed(3)})`;
      }
      ctx.fillRect(x0, yTop0, sliceW + 0.4, flagH);
    }
  }

  // 5. Golden Finial / Spearhead Sphere on top of the mast
  ctx.fillStyle = "#f3ca4a";
  ctx.beginPath();
  ctx.arc(0, mastTopY - 2.5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#8d6a1d";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Finial shine
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-1.2, mastTopY - 4, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Top spire spike
  ctx.fillStyle = "#f3ca4a";
  ctx.beginPath();
  ctx.moveTo(-1, mastTopY - 6);
  ctx.lineTo(0, mastTopY - 11);
  ctx.lineTo(1, mastTopY - 6);
  ctx.closePath();
  ctx.fill();

  // 6. Floating Landmark Badge (Cumbre Fundadora)
  ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
  const badgeText = "🚩 CUMBRE FUNDADORA · EL LEÓN FUNDADOR";
  const badgeW = ctx.measureText(badgeText).width + 16;
  const badgeY = mastTopY - 18;

  ctx.fillStyle = "#0a151de8";
  ctx.strokeStyle = "#e8bd42";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-badgeW / 2, badgeY - 10, badgeW, 16, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8d568";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, 0, badgeY - 2);

  ctx.restore();
}
