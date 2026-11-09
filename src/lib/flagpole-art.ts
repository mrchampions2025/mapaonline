import { SUMMIT_FLAGPOLE } from "./nation.ts";

export { SUMMIT_FLAGPOLE };

type Screen = (x: number, y: number) => { x: number; y: number };

/**
 * Renders the official national mast and waving flag on the highest summit of Hispania.
 * Uses continuous sine-wave cloth simulation with realistic shading and golden finial.
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

  // 1. Shadow on mountain summit
  ctx.fillStyle = "#16232cee";
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Worked stone plinth / monument base
  // Lower step
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

  // Golden commemorative collar ring
  ctx.fillStyle = "#dcb143";
  ctx.fillRect(-3, -3, 6, 2.5);

  // 3. Tall Mast (Flagpole)
  const mastHeight = 82; // from -2 to -84
  const mastTopY = -mastHeight;

  // Mast shadow/body
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

  // Halyard rope running along the mast
  ctx.strokeStyle = "#e8e5dc";
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(1.8, mastTopY + 3);
  ctx.lineTo(2.2, -5);
  ctx.stroke();

  // Cleat at the bottom of the mast
  ctx.fillStyle = "#c79e39";
  ctx.fillRect(1.5, -9, 2.2, 4);

  // 4. Waving Flag: "El León Fundador" (Oro y Carmesí)
  // Dimensions: 54px length x 32px height
  const flagW = 52;
  const flagH = 32;
  const flagTop = mastTopY + 3; // -81
  const flagLeft = 1.4;
  const slices = 26;
  const sliceW = flagW / slices;

  const crimsonDark = "#741224";
  const crimsonMain = "#8d1830";
  const goldStripe = "#f5bd38";
  const goldLion = "#fad45a";

  for (let i = 0; i < slices; i++) {
    const x0 = flagLeft + i * sliceW;
    const x1 = flagLeft + (i + 1) * sliceW;
    const prog0 = i / slices;
    const prog1 = (i + 1) / slices;

    // Flutter physics with multi-frequency waves
    const waveY0 = reducedMotion
      ? 0
      : Math.sin(time * 5.8 - prog0 * 4.8) * (prog0 * 4.2) +
        Math.cos(time * 3.2 + prog0 * 2.1) * (prog0 * 1.6);
    const waveY1 = reducedMotion
      ? 0
      : Math.sin(time * 5.8 - prog1 * 4.8) * (prog1 * 4.2) +
        Math.cos(time * 3.2 + prog1 * 2.1) * (prog1 * 1.6);

    const yTop0 = flagTop + waveY0;
    const yTop1 = flagTop + waveY1;

    // Normal / slope for realistic fabric highlight and shadow
    const slope = reducedMotion
      ? 0
      : Math.cos(time * 5.8 - ((prog0 + prog1) / 2) * 4.8);

    // Layer 1: Top crimson bar (14%)
    ctx.fillStyle = crimsonDark;
    ctx.beginPath();
    ctx.moveTo(x0, yTop0);
    ctx.lineTo(x1, yTop1);
    ctx.lineTo(x1, yTop1 + flagH * 0.14);
    ctx.lineTo(x0, yTop0 + flagH * 0.14);
    ctx.closePath();
    ctx.fill();

    // Layer 2: Top gold stripe (14%)
    ctx.fillStyle = goldStripe;
    ctx.beginPath();
    ctx.moveTo(x0, yTop0 + flagH * 0.14);
    ctx.lineTo(x1, yTop1 + flagH * 0.14);
    ctx.lineTo(x1, yTop1 + flagH * 0.28);
    ctx.lineTo(x0, yTop0 + flagH * 0.28);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Central crimson body (44%)
    ctx.fillStyle = crimsonMain;
    ctx.beginPath();
    ctx.moveTo(x0, yTop0 + flagH * 0.28);
    ctx.lineTo(x1, yTop1 + flagH * 0.28);
    ctx.lineTo(x1, yTop1 + flagH * 0.72);
    ctx.lineTo(x0, yTop0 + flagH * 0.72);
    ctx.closePath();
    ctx.fill();

    // Layer 4: Bottom gold stripe (14%)
    ctx.fillStyle = goldStripe;
    ctx.beginPath();
    ctx.moveTo(x0, yTop0 + flagH * 0.72);
    ctx.lineTo(x1, yTop1 + flagH * 0.72);
    ctx.lineTo(x1, yTop1 + flagH * 0.86);
    ctx.lineTo(x0, yTop0 + flagH * 0.86);
    ctx.closePath();
    ctx.fill();

    // Layer 5: Bottom crimson bar (14%)
    ctx.fillStyle = crimsonDark;
    ctx.beginPath();
    ctx.moveTo(x0, yTop0 + flagH * 0.86);
    ctx.lineTo(x1, yTop1 + flagH * 0.86);
    ctx.lineTo(x1, yTop1 + flagH);
    ctx.lineTo(x0, yTop0 + flagH);
    ctx.closePath();
    ctx.fill();

    // Central Lion Crest: drawn in slices from prog 0.36 to 0.62
    const midProg = (prog0 + prog1) / 2;
    if (midProg >= 0.36 && midProg <= 0.62) {
      const u = (midProg - 0.49) / 0.13; // -1 to 1 across emblem circle
      if (Math.abs(u) <= 1) {
        const spanH = Math.sqrt(1 - u * u) * (flagH * 0.18);
        const emblemCenterY = (yTop0 + yTop1) / 2 + flagH * 0.5;

        // Circular gold medallion border & background
        ctx.fillStyle = goldStripe;
        ctx.fillRect(x0, emblemCenterY - spanH, sliceW + 0.4, spanH * 2);

        // Inner carmesí circle fill
        ctx.fillStyle = crimsonDark;
        const innerH = spanH * 0.84;
        ctx.fillRect(x0, emblemCenterY - innerH, sliceW + 0.4, innerH * 2);

        // Lion silhouette in core (gold)
        if (Math.abs(u) < 0.7) {
          ctx.fillStyle = goldLion;
          ctx.fillRect(x0, emblemCenterY - innerH * 0.6, sliceW + 0.4, innerH * 1.2);
        }
      }
    }

    // Fabric Wave Light & Shadow Overlay
    if (!reducedMotion && Math.abs(slope) > 0.05) {
      if (slope > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(slope * 0.18).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${(-slope * 0.28).toFixed(3)})`;
      }
      ctx.beginPath();
      ctx.moveTo(x0, yTop0);
      ctx.lineTo(x1, yTop1);
      ctx.lineTo(x1, yTop1 + flagH);
      ctx.lineTo(x0, yTop0 + flagH);
      ctx.closePath();
      ctx.fill();
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
