import {
  START,
  SHIP,
  IDLE,
  type Point,
  type PlayerAction,
  playerPose,
} from "./player.ts";
import {
  canWalk,
  canSail,
  distance,
  nearPoint,
  walkingPath,
  moveAgainstCollisions,
  MARKET_OBSTACLE,
  type Obstacle,
} from "./navigation.ts";
export const HIDDEN_ANIMALS = [
  { code: "forest_fox", name: "Zorro del bosque", icon: "🦊", x: 520, y: 1000 },
  { code: "hill_owl", name: "Búho de la colina", icon: "🦉", x: 800, y: 900 },
  { code: "golden_deer", name: "Ciervo dorado", icon: "🦌", x: 1040, y: 1050 },
  {
    code: "coast_rabbit",
    name: "Conejo de la costa",
    icon: "🐇",
    x: 800,
    y: 1210,
  },
  {
    code: "island_turtle",
    name: "Tortuga del islote",
    icon: "🐢",
    x: 380,
    y: 1260,
  },
  { code: "north_bird", name: "Ave del norte", icon: "🦜", x: 1140, y: 755 },
] as const;
export type Adventure = {
  player: Point;
  boat: Point;
  aboard: boolean;
  input: Point;
  direction: number;
  walking: boolean;
  phase: number;
  follow: boolean;
  action: PlayerAction;
  path: Point[] | null;
  obstacles: Obstacle[];
  found: Set<string>;
  pending: Set<string>;
  retryAt: Map<string, number>;
  notice: string;
  error: string;
  lastFrame: number;
  fps: number;
};
export function createAdventure(): Adventure {
  let player = { ...START },
    boat = { ...SHIP };
  let savedBoat = false,
    aboard = false;
  try {
    const saved = JSON.parse(
      localStorage.getItem("hispania-adventure-position-v1") || "null",
    );
    if (saved?.player && canWalk(saved.player)) player = saved.player;
    if (saved?.boat && canSail(saved.boat)) {
      boat = saved.boat;
      savedBoat = true;
      aboard = saved.aboard === true;
    }
  } catch {
    /* Optional position cache. */
  }
  const initialBoat = nearPoint({ x: 1070, y: 1340 }, canSail, 120);
  if (!savedBoat && initialBoat) boat = initialBoat;
  return {
    player,
    boat,
    aboard,
    input: { x: 0, y: 0 },
    direction: 1,
    walking: false,
    phase: 0,
    follow: true,
    action: { ...IDLE, to: player, from: player },
    path: null,
    obstacles: [MARKET_OBSTACLE],
    found: new Set(),
    pending: new Set(),
    retryAt: new Map(),
    notice: "",
    error: "",
    lastFrame: 0,
    fps: 0,
  };
}
export function saveAdventure(s: Adventure) {
  try {
    localStorage.setItem(
      "hispania-adventure-position-v1",
      JSON.stringify({ player: s.player, boat: s.boat, aboard: s.aboard }),
    );
  } catch {
    /* Navigation still works without storage. */
  }
}
export function setAdventureAction(s: Adventure, a: PlayerAction) {
  s.action = a;
  s.input = { x: 0, y: 0 };
  s.path = null;
  s.follow = true;
  if (a.kind === "idle") s.player = { ...a.to };
}
export function stepAdventure(s: Adventure, dt: number, now: number) {
  dt = Math.max(0, Math.min(0.05, dt));
  s.phase += dt;
  s.walking = false;
  if (s.action.kind !== "idle") {
    const p = playerPose(s.action, now);
    s.player = { x: p.x, y: p.y };
    s.walking = p.walking;
    return;
  }
  const norm = Math.hypot(s.input.x, s.input.y);
  if (norm > 0.01) {
    s.path = null;
    s.follow = true;
    const speed = s.aboard ? 95 : 62,
      dx = (s.input.x / norm) * speed * dt,
      dy = (s.input.y / norm) * speed * dt;
    const old = s.aboard ? s.boat : s.player,
      p = moveAgainstCollisions(
        old,
        dx,
        dy,
        s.aboard ? canSail : (p) => canWalk(p, s.obstacles),
      );
    s.walking = distance(old, p) > 0.001;
    if (s.aboard) {
      s.boat = p;
      if (Math.abs(dx) > 0.01) s.direction = dx >= 0 ? 1 : -1;
    } else s.player = p;
  } else if (!s.aboard && s.path?.length) {
    let budget = 62 * dt;
    while (s.path.length && budget > 0) {
      const p = s.path[0],
        d = distance(s.player, p);
      if (d < 0.001) {
        s.path.shift();
        continue;
      }
      const amount = Math.min(d, budget),
        old = s.player;
      const next = moveAgainstCollisions(
        old,
        ((p.x - old.x) / d) * amount,
        ((p.y - old.y) / d) * amount,
        (p) => canWalk(p, s.obstacles),
      );
      const travelled = distance(old, next);
      s.player = next;
      budget -= amount;
      s.walking ||= travelled > 0.001;
      if (Math.abs(next.x - old.x) > 0.001)
        s.direction = next.x >= old.x ? 1 : -1;
      if (distance(next, p) < 0.01) s.path.shift();
      else if (travelled < amount * 0.5) {
        s.path = null;
        s.notice = "El camino está bloqueado. Toca otro punto para rodearlo.";
        break;
      }
    }
  }
}
export function walkTo(s: Adventure, target: Point) {
  if (s.aboard || s.action.kind !== "idle") {
    s.notice = s.aboard
      ? "Llevas el timón: usa las flechas para navegar y busca una costa para bajar."
      : "Termina la tarea actual antes de elegir otro destino.";
    return false;
  }
  s.path = null;
  if (!canWalk(target, s.obstacles)) {
    s.notice =
      "Ese punto es agua o un obstáculo. Toca suelo libre para caminar; usa el barco para navegar.";
    return false;
  }
  const path = walkingPath(s.player, target, s.obstacles);
  if (!path) {
    s.notice =
      "No hay un camino por tierra. Acércate con el barco a esta costa.";
    return false;
  }
  s.path = path.slice(1);
  s.notice = "";
  s.follow = true;
  return true;
}
export function landingPoint(s: Adventure) {
  return nearPoint(s.boat, (p) => canWalk(p, s.obstacles), 85);
}
export function boardBoat(s: Adventure) {
  if (s.action.kind !== "idle") return false;
  if (distance(s.player, s.boat) > 90) {
    const shore = landingPoint(s);
    if (!shore || !walkTo(s, shore)) return false;
    s.notice = "Camina hasta la costa y pulsa Embarcar al llegar.";
    return false;
  }
  s.aboard = true;
  s.path = null;
  s.input = { x: 0, y: 0 };
  s.follow = true;
  s.notice =
    "Tú llevas el timón. Mantén las flechas o usa WASD. Puedes bajar en cualquier costa accesible.";
  return true;
}
export function leaveBoat(s: Adventure) {
  const land = landingPoint(s);
  if (!land) {
    s.notice =
      "Acércate a una costa para poder desembarcar. En mar abierto no hay suelo.";
    return false;
  }
  s.aboard = false;
  s.player = land;
  s.action = { ...IDLE, from: land, to: land };
  s.input = { x: 0, y: 0 };
  s.follow = true;
  s.notice = "Has desembarcado. Explora a pie; tu barco se queda aquí.";
  saveAdventure(s);
  return true;
}
