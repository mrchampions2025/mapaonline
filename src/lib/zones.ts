import { project } from "./world.ts";

// Mismas ubicaciones A/B que las presentadas en los capítulos de la serie.
export const CAPITAL_ZONES = [
  { id: "A", name: "Bahía del Sol", color: "#ff886d", ...project(38, 26) },
  { id: "B", name: "Valle Verde", color: "#70e0c1", ...project(27, 23) },
] as const;

export function drawCapitalZones(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => { x: number; y: number },
  width: number,
  height: number,
) {
  ctx.save();
  ctx.textAlign = "center";
  for (const zone of CAPITAL_ZONES) {
    const p = screen(zone.x, zone.y);
    if (p.x < -100 || p.x > width + 100 || p.y < -40 || p.y > height + 70) continue;
    ctx.strokeStyle = zone.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 18, 6, 0, 0, Math.PI * 2);
    ctx.moveTo(p.x, p.y - 3);
    ctx.lineTo(p.x, p.y - 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y - 36, 15, 0, Math.PI * 2);
    ctx.fillStyle = zone.color;
    ctx.fill();
    ctx.strokeStyle = "#071d2c";
    ctx.stroke();
    ctx.fillStyle = "#071d2c";
    ctx.font = "bold 17px system-ui";
    ctx.fillText(zone.id, p.x, p.y - 30);
    const label = `ZONA ${zone.id} · ${zone.name.toLocaleUpperCase("es")}`;
    ctx.font = "600 10px system-ui";
    const w = ctx.measureText(label).width + 20;
    ctx.fillStyle = "#071d2cf2";
    ctx.fillRect(p.x - w / 2, p.y + 13, w, 24);
    ctx.fillStyle = zone.color;
    ctx.fillText(label, p.x, p.y + 29);
  }
  ctx.restore();
}
