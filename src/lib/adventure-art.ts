import { HIDDEN_ANIMALS, type Adventure } from "./adventure.ts";
import { distance } from "./navigation.ts";
type Screen = (x: number, y: number) => { x: number; y: number };
export function drawDiscoveries(
  ctx: CanvasRenderingContext2D,
  screen: Screen,
  scale: number,
  state: Adventure,
  time: number,
) {
  for (const animal of HIDDEN_ANIMALS) {
    const found = state.found.has(animal.code),
      near = distance(state.aboard ? state.boat : state.player, animal) < 85;
    if (!found && !near) continue;
    const p = screen(animal.x, animal.y);
    if (
      p.x < -80 ||
      p.y < -80 ||
      p.x > ctx.canvas.width + 80 ||
      p.y > ctx.canvas.height + 80
    )
      continue;
    ctx.save();
    ctx.fillStyle = found ? "#4ee9b64a" : "#ffc46666";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 7 * scale, 3 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${Math.max(10, 12 * scale)}px "Segoe UI Emoji",system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(animal.icon, p.x, p.y + Math.sin(time * 2) * scale);
    if (scale > 0.7) {
      ctx.font = "600 11px system-ui";
      const label = state.pending.has(animal.code)
        ? "Guardando…"
        : found
          ? animal.name
          : "Acércate para descubrirlo";
      const w = ctx.measureText(label).width + 12;
      ctx.fillStyle = "#061d2cee";
      ctx.fillRect(p.x - w / 2, p.y + 8 * scale, w, 20);
      ctx.fillStyle = found ? "#a9ffe8" : "#ffc466";
      ctx.fillText(label, p.x, p.y + 8 * scale + 14);
    }
    ctx.restore();
  }
}
