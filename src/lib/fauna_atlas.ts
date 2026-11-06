import { project } from "./world.ts";
import motion from "./animal-motion.ts";

export type AnimalName = "deer" | "rabbit" | "chicken";
export type AnimalSprites = Partial<Record<AnimalName, HTMLImageElement>>;

/** SVG joint poses and movement shared with the Day 2 video renderer. */
export function drawArticulatedFauna(
  ctx: CanvasRenderingContext2D,
  screen: (x: number, y: number) => { x: number; y: number },
  scale: number,
  sprites: AnimalSprites,
  time: number,
) {
  for (const name of ["deer", "rabbit", "chicken"] as const) {
    const image = sprites[name];
    if (!image) continue;
    const species = motion.species[name];
    for (const [gx, gy, offset] of species.entities) {
      const frame = (Math.floor(time * motion.fps) + offset) % motion.frames;
      const [dx, dy] = species.motion[frame];
      const ground = project(gx, gy);
      const p = screen(ground.x + dx, ground.y + dy);
      const size = species.width * scale;
      const left = p.x - size * 0.5,
        top = p.y - size * 0.86;
      if (
        left + size < 0 ||
        top + size < 0 ||
        left > ctx.canvas.clientWidth ||
        top > ctx.canvas.clientHeight
      )
        continue;
      ctx.drawImage(
        image,
        (frame % motion.columns) * motion.tile,
        Math.floor(frame / motion.columns) * motion.tile,
        motion.tile,
        motion.tile,
        left,
        top,
        size,
        size,
      );
    }
  }
}
