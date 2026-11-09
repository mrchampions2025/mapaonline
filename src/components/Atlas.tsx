import { anchoredCamera, screenToWorld, panCamera } from "../lib/camera.ts";
import { MINE, mineObstacles, mineUnlocked, drawMine } from "../lib/mine.ts";
import { TIKTOK_AUDIENCE } from "../lib/community.ts";
import {
  stepAdventure,
  walkTo,
  HIDDEN_ANIMALS,
  type Adventure,
} from "../lib/adventure.ts";
import { MARKET_OBSTACLE, FLAGPOLE_OBSTACLE, distance } from "../lib/navigation.ts";
import { drawDiscoveries } from "../lib/adventure-art.ts";
import { drawPlayer, drawForest, drawGroundDetail } from "../lib/player-art.ts";
import { playerPose } from "../lib/player.ts";
import { useEffect, useRef, useState } from "react";
import type { Bounds, District, Resident, WorldObject } from "../lib/types.ts";
import { drawWildlife } from "../lib/wildlife.ts";
import type { AnimalName, AnimalSprites } from "../lib/fauna_atlas.ts";
import { AVATARS, parcelPosition } from "../lib/world.ts";
import { CAPITAL_ZONES, drawCapitalZones } from "../lib/zones.ts";
import { FIRST_MARKET, NATION, OFFICIAL_FLAG } from "../lib/nation.ts";
import { drawFlagpole, SUMMIT_FLAGPOLE } from "../lib/flagpole-art.ts";
import { drawMarket } from "../lib/market.ts";
import { drawHarbor } from "../lib/harbor-art.ts";
import { HARBOR, SHIP, FOREST } from "../lib/harbor.ts";
import type { Activity } from "./HarborGame.tsx";
type Props = {
  districts: District[];
  residents: Resident[];
  objects: WorldObject[];
  focus: Resident | null;
  selected: Resident | null;
  editing: boolean;
  onSelect: (r: Resident | null) => void;
  onPoint: (x: number, y: number) => void;
  onBounds: (b: Bounds) => void;
  adventure?: Adventure;
  onDiscover?: (code: string) => void;
  playerNick?: string;
  playerAvatar?: number;
  gameMode?: boolean;
  activityOpen?: boolean;
  destination?: { x: number; y: number; zoom: number; nonce: number } | null;
  deliveries?: number;
  onActivity?: (a: Activity) => void;
};
type Camera = { x: number; y: number; zoom: number };
const PLAYER_WORLD_SCALE = 0.36;
const initial: Camera = { x: 800, y: 1080, zoom: 1 };
const PARCEL_POSITIONS = Array.from({ length: 4096 }, (_, i) =>
  parcelPosition(i + 1),
);
export function Atlas(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 }),
    [image, setImage] = useState<HTMLImageElement | null>(null),
    [cam, setCamState] = useState(initial);
  const [mineOpen, setMineOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const live = useRef(props);
  live.current = props;
  const renderedCam = useRef<Camera>({ ...initial }),
    targetCam = useRef<Camera>({ ...initial }),
    renderedCenter = useRef(280);
  // Camera targets are written synchronously; React renders must never replay a stale target.
  function setCam(next: Camera | ((c: Camera) => Camera)) {
    const value = typeof next === "function" ? next(targetCam.current) : next;
    targetCam.current = { ...value };
    setCamState(value);
  }
  function manualCamera(next: Camera) {
    if (live.current.adventure) live.current.adventure.follow = false;
    renderedCam.current = { ...next };
    setCam(next);
  }
  useEffect(() => {
    if (props.adventure)
      props.adventure.obstacles = [
        MARKET_OBSTACLE,
        FLAGPOLE_OBSTACLE,
        ...mineObstacles(),
        ...props.objects
          .filter((o) => o.kind === "house")
          .map((o) => ({
            left: o.x - 24,
            right: o.x + 24,
            top: o.y - 40,
            bottom: o.y + 18,
          })),
      ];
  }, [props.objects, props.adventure]);
  const drag = useRef<{
    x: number;
    y: number;
    cam: Camera;
    moved: boolean;
    point: { x: number; y: number };
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{
    distance: number;
    cam: Camera;
    anchor: { x: number; y: number };
  } | null>(null);
  const [triSprite, setTriSprite] = useState<HTMLImageElement | null>(null);
  const [animalSprites, setAnimalSprites] = useState<AnimalSprites>({});
  useEffect(() => {
    let alive = true;
    const images: HTMLImageElement[] = [];
    for (const name of ["deer", "rabbit", "chicken"] as AnimalName[]) {
      const image = new Image();
      images.push(image);
      image.onload = () => {
        if (alive)
          setAnimalSprites((current) => ({ ...current, [name]: image }));
      };
      image.src = `/wildlife/${name}-atlas.webp`;
    }
    return () => {
      alive = false;
      images.forEach((image) => {
        image.onload = null;
      });
    };
  }, []);
  useEffect(() => {
    const sprite = new Image();
    sprite.onload = () => setTriSprite(sprite);
    sprite.src = "/wildlife/triceratops-grazing.webp";
    return () => {
      sprite.onload = null;
    };
  }, []);
  const fit = Math.min(size.w / 1450, size.h / 850),
    scale = fit * cam.zoom;
  const centerY = size.h / 2;
  const activeZone = CAPITAL_ZONES.find(
    (z) => cam.zoom >= 2 && Math.hypot(cam.x - z.x, cam.y - z.y) < 2,
  );
  const market = props.objects.find((o) => o.id === FIRST_MARKET.id);
  function screen(x: number, y: number) {
    return {
      x:
        (x - renderedCam.current.x) * fit * renderedCam.current.zoom +
        size.w / 2,
      y:
        (y - renderedCam.current.y) * fit * renderedCam.current.zoom +
        renderedCenter.current,
    };
  }
  function world(x: number, y: number) {
    return screenToWorld(
      { x, y },
      renderedCam.current,
      fit,
      size.w / 2,
      renderedCenter.current,
    );
  }
  function zoom(
    delta: number,
    point = { x: size.w / 2, y: renderedCenter.current },
  ) {
    const following =
      live.current.adventure?.follow &&
      point.x === size.w / 2 &&
      point.y === renderedCenter.current;
    const current = renderedCam.current;
    const z = Math.min(12, Math.max(1, current.zoom * delta));
    manualCamera(
      anchoredCamera(
        world(point.x, point.y),
        point,
        z,
        fit,
        size.w / 2,
        renderedCenter.current,
      ),
    );
    if (following && live.current.adventure)
      live.current.adventure.follow = true;
  }
  useEffect(() => {
    const img = new Image();
    img.src = "/map.png";
    img.onload = () => setImage(img);
    return () => {
      img.onload = null;
    };
  }, []);
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize((old) =>
        old.w === entry.contentRect.width && old.h === entry.contentRect.height
          ? old
          : { w: entry.contentRect.width, h: entry.contentRect.height },
      ),
    );
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (props.focus) {
      if (props.adventure) props.adventure.follow = false;
      const p = parcelPosition(props.focus.parcel_id);
      setCam({ x: p.x, y: p.y, zoom: 7 });
    }
  }, [props.focus]);
  useEffect(() => {
    if (props.destination) {
      if (props.adventure) props.adventure.follow = false;
      setCam({
        x: props.destination.x,
        y: props.destination.y,
        zoom: props.destination.zoom,
      });
    }
  }, [props.destination]);
  useEffect(() => {
    if (props.gameMode && !props.focus && !props.destination)
      setCam({ ...initial, zoom: window.innerWidth < 700 ? 8 : 3 });
  }, [props.gameMode]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoom(Math.exp(-e.deltaY * 0.0015), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [fit, size.w]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = size.w * dpr;
    el.height = size.h * dpr;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation = 0;
    el.dataset.loopStarts = String(Number(el.dataset.loopStarts ?? 0) + 1);
    let totalFrames = 0,
      frameCost = 0;
    let lastFrame = 0,
      lastBounds = 0,
      lastFps = performance.now(),
      frameCount = 0;
    let previousBounds = { x: Infinity, y: Infinity, zoom: 0 };
    function draw(now: number) {
      if (!ctx) return;
      const frameStart = performance.now();
      const props = live.current,
        state = props.adventure;
      const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 60;
      lastFrame = now;
      const clock = performance.timeOrigin + now;
      if (state && props.gameMode) {
        stepAdventure(state, dt, clock);
        const point = state.aboard ? state.boat : state.player;
        for (const a of HIDDEN_ANIMALS)
          if (!state.found.has(a.code) && distance(point, a) < 29)
            props.onDiscover?.(a.code);
      }
      const target = { ...targetCam.current };
      if (
        state?.follow &&
        props.gameMode &&
        !drag.current?.moved &&
        !pinch.current
      ) {
        const p = state.aboard ? state.boat : state.player;
        target.x = p.x;
        target.y = p.y;
        targetCam.current.x = p.x;
        targetCam.current.y = p.y;
      }
      const camera = renderedCam.current,
        blend = 1 - Math.exp(-12 * dt);
      camera.x += (target.x - camera.x) * blend;
      camera.y += (target.y - camera.y) * blend;
      camera.zoom += (target.zoom - camera.zoom) * blend;
      renderedCenter.current += (centerY - renderedCenter.current) * blend;
      const cam = camera,
        scale = fit * cam.zoom,
        screen = (x: number, y: number) => ({
          x: (x - cam.x) * scale + size.w / 2,
          y: (y - cam.y) * scale + renderedCenter.current,
        });
      const market = props.objects.find((o) => o.id === FIRST_MARKET.id);
      if (
        now - lastBounds > 650 &&
        (distance(previousBounds, cam) > 35 ||
          Math.abs(previousBounds.zoom - cam.zoom) > 0.3)
      ) {
        lastBounds = now;
        previousBounds = { ...cam };
        props.onBounds({
          left: cam.x - size.w / 2 / scale,
          right: cam.x + size.w / 2 / scale,
          top: cam.y - renderedCenter.current / scale,
          bottom: cam.y + (size.h - renderedCenter.current) / scale,
          zoom: cam.zoom,
        });
      }
      frameCount++;
      if (now - lastFps > 1200) {
        const fps = frameCount / ((now - lastFps) / 1000);
        if (state) state.fps = fps;
        el!.dataset.fps = String(Math.round(fps));
        el!.dataset.drawMs = frameCost.toFixed(2);
        el!.dataset.frameCount = String(totalFrames);
        if (state) {
          el!.dataset.playerX = state.player.x.toFixed(2);
          el!.dataset.playerY = state.player.y.toFixed(2);
          el!.dataset.boatX = state.boat.x.toFixed(2);
          el!.dataset.boatY = state.boat.y.toFixed(2);
          el!.dataset.mode = state.aboard ? "boat" : "foot";
          el!.dataset.cameraZoom = cam.zoom.toFixed(2);
          el!.dataset.cameraX = cam.x.toFixed(2);
          el!.dataset.cameraY = cam.y.toFixed(2);
          el!.dataset.follow = String(state.follow);
          el!.dataset.targetX = state.path?.at(-1)?.x.toFixed(2) ?? "";
          el!.dataset.targetY = state.path?.at(-1)?.y.toFixed(2) ?? "";
        }
        frameCount = 0;
        lastFps = now;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b293a";
      ctx.fillRect(0, 0, size.w, size.h);
      if (image) {
        const p = screen(0, 0);
        ctx.drawImage(image, p.x, p.y, 1600 * scale, 2000 * scale);
      }
      drawGroundDetail(ctx, screen, scale);
      drawWildlife(
        ctx,
        screen,
        scale,
        triSprite,
        reducedMotion.matches ? 0 : now / 1000,
        animalSprites,
      );
      for (const obj of props.objects) {
        const p = screen(obj.x, obj.y);
        if (
          p.x < -200 ||
          p.x > size.w + 200 ||
          p.y < -200 ||
          p.y > size.h + 200
        )
          continue;
        if (obj.id === FIRST_MARKET.id) {
          continue;
        }
        const s = Math.max(6, 15 * scale);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = "#f1dfbc";
        ctx.strokeStyle = "#d4b384";
        ctx.lineWidth = Math.max(2, 3 * scale);
        if (obj.kind === "tree") {
          ctx.fillStyle = "#3a8162";
          ctx.beginPath();
          ctx.moveTo(0, -s * 2);
          ctx.lineTo(s, s * 0.2);
          ctx.lineTo(-s, s * 0.2);
          ctx.fill();
        } else if (obj.kind === "road") {
          ctx.beginPath();
          ctx.moveTo(-s, s * 0.4);
          ctx.lineTo(s, -s * 0.4);
          ctx.stroke();
        } else if (obj.kind === "farm") {
          ctx.fillStyle = "#d5ba66";
          ctx.fillRect(-s, -s * 0.5, s * 2, s);
          ctx.strokeStyle = "#a28845";
          for (let i = -2; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(i * s * 0.4, -s * 0.5);
            ctx.lineTo(i * s * 0.4, s * 0.5);
            ctx.stroke();
          }
        } else if (obj.kind === "flag") {
          ctx.strokeStyle = "#f5f1e8";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -s * 3);
          ctx.stroke();
          ctx.fillStyle = "#ffc466";
          ctx.fillRect(0, -s * 3, s * 1.7, s);
        } else if (obj.kind === "port") {
          ctx.strokeStyle = "#d5ae7b";
          ctx.lineWidth = s * 0.6;
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s * 2, s);
          ctx.stroke();
        } else {
          ctx.fillRect(-s, -s, s * 2, s * 1.3);
          ctx.fillStyle = "#ed8766";
          ctx.beginPath();
          ctx.moveTo(-s * 1.2, -s);
          ctx.lineTo(0, -s * 2);
          ctx.lineTo(s * 1.2, -s);
          ctx.fill();
        }
        if (cam.zoom > 2) {
          ctx.fillStyle = "#f5f1e8";
          ctx.font = "11px system-ui";
          ctx.textAlign = "center";
          ctx.shadowColor = "#071d2c";
          ctx.shadowBlur = 4;
          ctx.fillText(obj.name, 0, s + 15);
        }
        ctx.restore();
      }
      if (cam.zoom < 2) {
        for (const d of props.districts) {
          const p = screen(d.x, d.y);
          ctx.fillStyle = "#ffc466";
          ctx.strokeStyle = "#071d2c";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#071d2c";
          ctx.font = "bold 11px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(String(d.id), p.x, p.y + 4);
          if (Number(d.residents) > 0) {
            const label = `${Number(d.residents).toLocaleString("es-ES")} vecinos`;
            ctx.font = "bold 12px system-ui";
            const width = ctx.measureText(label).width + 20;
            ctx.fillStyle = "#071d2c";
            ctx.fillRect(p.x - width / 2, p.y + 20, width, 25);
            ctx.fillStyle = "#70e0c1";
            ctx.fillText(label, p.x, p.y + 37);
          }
        }
      } else {
        // Solo trazar casillas de la zona visible; no existe un nodo DOM por habitante.
        ctx.strokeStyle = "#a8e3c128";
        ctx.lineWidth = 1;
        if (cam.zoom > 3)
          for (let id = 1; id <= 4096; id++) {
            const p = PARCEL_POSITIONS[id - 1],
              s = screen(p.x, p.y);
            if (s.x < 0 || s.y < 0 || s.x > size.w || s.y > size.h) continue;
            const dx = 2.5 * scale,
              dy = 1.3 * scale;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - dy);
            ctx.lineTo(s.x + dx, s.y);
            ctx.lineTo(s.x, s.y + dy);
            ctx.lineTo(s.x - dx, s.y);
            ctx.closePath();
            ctx.stroke();
          }
        for (const r of props.residents) {
          const p =
              PARCEL_POSITIONS[r.parcel_id - 1] ?? parcelPosition(r.parcel_id),
            s = screen(p.x, p.y);
          if (s.x < -40 || s.y < -40 || s.x > size.w + 40 || s.y > size.h + 40)
            continue;
          const chosen =
              r.id === props.selected?.id || r.id === props.focus?.id,
            unit = Math.max(3, Math.min(7, scale * 2));
          ctx.fillStyle = chosen ? "#ffc46666" : "#071d2c55";
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, unit * 1.7, unit * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = AVATARS[r.avatar]?.color || "#ffc466";
          ctx.fillRect(
            s.x - unit * 0.6,
            s.y - unit * 2,
            unit * 1.2,
            unit * 1.8,
          );
          ctx.fillStyle = "#f3d7b4";
          ctx.beginPath();
          ctx.arc(s.x, s.y - unit * 2.7, unit * 0.6, 0, Math.PI * 2);
          ctx.fill();
          if (chosen) {
            ctx.strokeStyle = "#ffc466";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, unit * 2, unit, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.font = "bold 13px system-ui";
            ctx.textAlign = "center";
            const label = "@" + r.nick,
              w = ctx.measureText(label).width + 20;
            ctx.fillStyle = "#071d2c";
            const labelTop = s.y - unit * 3.5 - 34;
            ctx.fillRect(s.x - w / 2, labelTop, w, 25);
            ctx.fillStyle = "#ffc466";
            ctx.fillText(label, s.x, labelTop + 17);
          }
        }
      }
      if (market) {
        const p = screen(market.x, market.y);
        if (
          p.x > -100 * scale &&
          p.x < size.w + 100 * scale &&
          p.y > -100 * scale &&
          p.y < size.h + 100 * scale
        )
          drawMarket(
            ctx,
            p.x,
            p.y,
            scale,
            reducedMotion.matches ? 0 : now / 1000,
          );
      }
      drawHarbor(
        ctx,
        screen,
        scale,
        reducedMotion.matches ? 0 : now / 1000,
        props.deliveries ?? 0,
        false,
        0,
        0,
        clock,
        state ? { ...state.boat, facing: state.direction } : undefined,
      );
      if (state?.path?.length && props.gameMode) {
        ctx.save();
        ctx.strokeStyle = "#ffe1a1b0";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        const origin = screen(state.player.x, state.player.y);
        ctx.moveTo(origin.x, origin.y);
        for (const point of state.path) {
          const q = screen(point.x, point.y);
          ctx.lineTo(q.x, q.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const goal = state.path.at(-1)!;
        const q = screen(goal.x, goal.y);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawMine(ctx, screen, scale, now / 1000, reducedMotion.matches);
      drawFlagpole(ctx, screen, scale, now / 1000, reducedMotion.matches);
      drawForest(ctx, screen, scale);
      drawCapitalZones(ctx, screen, size.w, size.h);
      if (state && props.gameMode) {
        drawDiscoveries(
          ctx,
          screen,
          scale,
          state,
          reducedMotion.matches ? 0 : now / 1000,
        );
        const actor = state.action;
        const point = state.aboard
          ? { x: state.boat.x, y: state.boat.y - 7 }
          : state.player;
        const pose =
          actor.kind !== "idle" && !state.aboard
            ? playerPose(actor, clock)
            : {
                ...point,
                walking: state.walking && !state.aboard,
                chopping: false,
                unloading: false,
                phase: state.phase,
              };
        drawPlayer(
          ctx,
          screen,
          scale * PLAYER_WORLD_SCALE * (state.aboard ? 0.7 : 1),
          actor,
          clock,
          props.playerNick,
          reducedMotion.matches,
          AVATARS[props.playerAvatar ?? 1]?.color,
          pose,
        );
      }
      frameCost = performance.now() - frameStart;
      totalFrames++;
    }

    function animate(now: number) {
      if (!document.hidden) draw(now);
      else lastFrame = 0;
      animation = requestAnimationFrame(animate);
    }
    animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  }, [size, image, triSprite, animalSprites, centerY, fit]);

  return (
    <>
      <nav className="zone-navigation" aria-label="Ir a las zonas del mapa">
        {CAPITAL_ZONES.map((zone) => (
          <button
            key={zone.id}
            aria-pressed={activeZone?.id === zone.id}
            onClick={() => {
              if (props.adventure) props.adventure.follow = false;
              setCam({ x: zone.x, y: zone.y, zoom: 3.5 });
            }}
          >
            <b style={{ color: zone.color }}>{zone.id}</b>
            <span>
              {zone.id === "A" ? "Capital" : `Zona ${zone.id}`} · {zone.name}
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
                <button
          className="flagpole-jump"
          aria-pressed={flagOpen}
          onClick={() => {
            if (props.adventure) props.adventure.follow = false;
            setCam({
              ...SUMMIT_FLAGPOLE,
              y: SUMMIT_FLAGPOLE.y - 15,
              zoom: window.innerWidth < 700 ? 6 : 3.8,
            });
            setFlagOpen(true);
          }}
        >
          <b style={{ color: "#f3ca4a" }}>🚩</b>
          <span>Cumbre · Bandera Oficial</span>
          <span aria-hidden="true">↗</span>
        </button>
        {market && (
          <button
            className="market-jump"
            onClick={() => {
              if (props.adventure) props.adventure.follow = false;
              setCam({ x: market.x, y: market.y - 18, zoom: 5.5 });
            }}
          >
            <b>🥔</b>
            <span>Ver Patatas de @maravaf</span>
            <span aria-hidden="true">↗</span>
          </button>
        )}
      </nav>
      <div
        className={
          "atlas " +
          (props.editing ? "editing " : "") +
          (props.activityOpen ? "activity-open" : "")
        }
        ref={box}
      >
        <canvas
          ref={canvas}
          tabIndex={0}
          aria-label={`Mapa de ${NATION.name}. Arrastra para explorar. Usa los controles para acercarte y la búsqueda para encontrar habitantes.`}
          onKeyDown={(e) => {
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [-70, 0],
              ArrowRight: [70, 0],
              ArrowUp: [0, -70],
              ArrowDown: [0, 70],
            };
            if (directions[e.key] && !props.gameMode) {
              e.preventDefault();
              const [x, y] = directions[e.key];
              setCam((c) => ({ ...c, x: c.x + x / scale, y: c.y + y / scale }));
            }
            if (e.key === "+" || e.key === "=") zoom(1.4);
            if (e.key === "-") zoom(1 / 1.4);
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pointers.current.size === 2) {
              manualCamera({ ...renderedCam.current });
              const [a, b] = [...pointers.current.values()];
              const rect = e.currentTarget.getBoundingClientRect();
              pinch.current = {
                distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
                cam: { ...renderedCam.current },
                anchor: world(
                  (a.x + b.x) / 2 - rect.left,
                  (a.y + b.y) / 2 - rect.top,
                ),
              };
              drag.current = null;
              return;
            }
            if (pointers.current.size > 2) return;
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              cam: { ...renderedCam.current },
              moved: false,
              point: world(
                e.clientX - e.currentTarget.getBoundingClientRect().left,
                e.clientY - e.currentTarget.getBoundingClientRect().top,
              ),
            };
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId)) return;
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (pinch.current && pointers.current.size >= 2) {
              const [a, b] = [...pointers.current.values()];
              const g = pinch.current;
              const z = Math.max(
                1,
                Math.min(
                  12,
                  (g.cam.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.distance,
                ),
              );
              const rect = e.currentTarget.getBoundingClientRect();
              manualCamera(
                anchoredCamera(
                  g.anchor,
                  {
                    x: (a.x + b.x) / 2 - rect.left,
                    y: (a.y + b.y) / 2 - rect.top,
                  },
                  z,
                  fit,
                  size.w / 2,
                  renderedCenter.current,
                ),
              );
              return;
            }
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 7 && !d.moved) {
              d.moved = true;
              // Freeze the actual displayed camera only when this is a drag, never on a tap.
              d.cam = { ...renderedCam.current };
              d.x = e.clientX;
              d.y = e.clientY;
              manualCamera(d.cam);
            } else if (d.moved) {
              manualCamera(panCamera(d.cam, dx, dy, fit));
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
            pinch.current = null;
            pointers.current.clear();
          }}
          onLostPointerCapture={(e) => {
            pointers.current.delete(e.pointerId);
            if (!pointers.current.size) {
              drag.current = null;
              pinch.current = null;
            }
          }}
          onPointerUp={(e) => {
            pointers.current.delete(e.pointerId);
            if (pinch.current) {
              pinch.current = null;
              const remaining = [...pointers.current.values()][0];
              drag.current = remaining
                ? {
                    x: remaining.x,
                    y: remaining.y,
                    cam: { ...renderedCam.current },
                    moved: true,
                    point: { x: 0, y: 0 },
                  }
                : null;
              return;
            }
            const d = drag.current;
            drag.current = null;
            if (!d || d.moved) return;
            const p = d.point;
            if (props.editing) {
              props.onPoint(Math.round(p.x), Math.round(p.y));
              return;
            }
            const scale = fit * renderedCam.current.zoom;
            for (const [point, action] of [
              [props.adventure?.boat ?? SHIP, "ship"],
              [HARBOR, "dock"],
              [FOREST, "wood"],
            ] as const) {
              if (
                Math.hypot(p.x - point.x, p.y - point.y) * scale <
                Math.min(24, 18 * scale)
              ) {
                props.onActivity?.(action);
                return;
              }
            }
            if (props.gameMode && props.adventure) {
              if (distance(p, SUMMIT_FLAGPOLE) < 45) {
                props.adventure.follow = false;
                setCam({
                  ...SUMMIT_FLAGPOLE,
                  y: SUMMIT_FLAGPOLE.y - 15,
                  zoom: window.innerWidth < 700 ? 6 : 3.8,
                });
                setFlagOpen(true);
                return;
              }
              if (distance(p, MINE) < 42) {
                props.adventure.follow = false;
                setCam({
                  ...MINE,
                  y: MINE.y + (window.innerWidth < 700 ? 35 : 0),
                  zoom: window.innerWidth < 700 ? 8 : 3.5,
                });
                setMineOpen(true);
                return;
              }
              if (
                market &&
                Math.abs(p.x - market.x) < 50 &&
                Math.abs(p.y - market.y) < 85
              ) {
                props.adventure.path = null;
                props.adventure.notice =
                  "El puesto es una construcción física. Tu personaje debe rodearlo.";
                return;
              }
              const following = props.adventure.follow;
              walkTo(props.adventure, p);
              props.adventure.follow = following;
              return;
            }
            const zone = CAPITAL_ZONES.find((z) => {
              const dx = (p.x - z.x) * scale,
                dy = (p.y - z.y) * scale;
              return (
                Math.hypot(dx, dy + 36) < 22 ||
                (Math.abs(dx) < 90 && dy > 12 && dy < 38)
              );
            });
            if (zone) {
              setCam({ x: zone.x, y: zone.y, zoom: 3.5 });
              return;
            }
            if (distance(p, SUMMIT_FLAGPOLE) < 45) {
              setCam({
                ...SUMMIT_FLAGPOLE,
                y: SUMMIT_FLAGPOLE.y - 15,
                zoom: window.innerWidth < 700 ? 6 : 3.8,
              });
              setFlagOpen(true);
              return;
            }
            if (cam.zoom < 2) {
              const nearest = props.districts.reduce<District | null>(
                (a, b) =>
                  !a ||
                  Math.hypot(b.x - p.x, b.y - p.y) <
                    Math.hypot(a.x - p.x, a.y - p.y)
                    ? b
                    : a,
                null,
              );
              if (nearest) setCam({ x: nearest.x, y: nearest.y, zoom: 5 });
              return;
            }
            const nearest = props.residents.find((r) => {
              const pos = parcelPosition(r.parcel_id);
              return Math.hypot(pos.x - p.x, pos.y - p.y) < 15 / scale;
            });
            props.onSelect(nearest || null);
          }}
          onDoubleClick={() => {
            if (!props.gameMode) zoom(1.6);
          }}
        />
        <div className="atlas-label">
          <span className="live-dot" /> ARCHIPIÉLAGO 01 <span>/</span>{" "}
          {cam.zoom < 2
            ? "VISTA GENERAL"
            : activeZone
              ? `ZONA ${activeZone.id} · ${activeZone.name.toLocaleUpperCase("es")}`
              : "EXPLORANDO EL ATLAS"}
        </div>
        {flagOpen && (
          <section className="flag-panel" aria-label="Bandera oficial de Hispania">
            <button
              className="flag-close"
              aria-label="Cerrar bandera"
              onClick={() => setFlagOpen(false)}
            >
              ×
            </button>
            <span className="eyebrow">SÍMBOLO NACIONAL · PROCLAMACIÓN OFICIAL</span>
            <h2>🚩 El León Fundador</h2>
            <div className="flag-panel-preview">
              <img
                src="/flags/bandera_1_leon_v2.png"
                alt="Bandera Oficial: El León Fundador"
              />
            </div>
            <p>
              <strong>¡Elección ganadora del Día 6!</strong> Proclamada por la comunidad en los comentarios.
              Plantada en el mástil monumental de la Cumbre Fundadora, flamea continuamente sobre Hispania.
            </p>
            <small>
              Colores: Oro y carmesí. Reto costero: se están auditando los comentarios más votados con oficio para adjudicar las 6 parcelas frente al mar.
            </small>
            <a
              href="#bandera"
              className="flag-panel-cta"
              onClick={() => setFlagOpen(false)}
            >
              Ver votación y plazas marítimas ↗
            </a>
          </section>
        )}
        {mineOpen && (
          <section className="mine-panel" aria-label="Mina de Hispania">
            <button
              className="mine-close"
              aria-label="Cerrar mina"
              onClick={() => setMineOpen(false)}
            >
              ×
            </button>
            <span className="eyebrow">NUEVA ZONA · META COLECTIVA</span>
            <h2>⛏ Mina de la colina</h2>
            <p>
              {mineUnlocked()
                ? "Meta de seguidores verificada. La entrada está abierta; la extracción está en preparación."
                : "Dos cadenas cierran la entrada. Se abrirá al verificar 500 seguidores en TikTok."}
            </p>
            <progress
              max={MINE.goal}
              value={Math.min(MINE.goal, TIKTOK_AUDIENCE.followers)}
              aria-label="Seguidores verificados para abrir la mina"
            />
            <strong>
              {TIKTOK_AUDIENCE.followers} / {MINE.goal} seguidores verificados
            </strong>
            <small>
              Última comprobación: {TIKTOK_AUDIENCE.checkedLabel}. No es un
              contador en directo. Los vecinos del mapa se cuentan aparte.
            </small>
            <p>
              Después: piedra y hierro para nuevas construcciones. Extracción y
              recompensas todavía no disponibles.
            </p>
            {props.adventure && (
              <button
                onClick={() => {
                  if (walkTo(props.adventure!, MINE.entrance))
                    setMineOpen(false);
                }}
              >
                Caminar hasta la entrada
              </button>
            )}
            <a
              href={TIKTOK_AUDIENCE.source}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver TikTok oficial ↗
            </a>
          </section>
        )}
        <div className="map-controls">
          <button
            aria-label="Ver bandera oficial en la cumbre"
            title="Bandera Oficial: El León Fundador"
            onClick={() => {
              if (props.adventure) props.adventure.follow = false;
              setCam({
                ...SUMMIT_FLAGPOLE,
                y: SUMMIT_FLAGPOLE.y - 15,
                zoom: window.innerWidth < 700 ? 6 : 3.8,
              });
              setFlagOpen(true);
            }}
          >
            🚩
          </button>
          <button
            aria-label="Ver mina de la colina"
            onClick={() => {
              if (props.adventure) props.adventure.follow = false;
              setCam({
                ...MINE,
                y: MINE.y + (window.innerWidth < 700 ? 35 : 0),
                zoom: window.innerWidth < 700 ? 8 : 3.5,
              });
              setMineOpen(true);
            }}
          >
            ⛏
          </button>
          <button aria-label="Acercar mapa" onClick={() => zoom(1.5)}>
            +
          </button>
          <button aria-label="Alejar mapa" onClick={() => zoom(1 / 1.5)}>
            −
          </button>
          <button
            aria-label="Centrar mapa"
            onClick={() => {
              if (props.adventure) {
                props.adventure.follow = true;
                setCam((c) => ({
                  ...c,
                  zoom: window.innerWidth < 700 ? 8 : 3,
                }));
              } else setCam(initial);
            }}
          >
            ⌖
          </button>
        </div>
        <div className="map-caption">
          {props.editing
            ? "Pulsa en el mapa para colocar una construcción."
            : cam.zoom < 2
              ? "Pulsa en una zona para descubrir sus parcelas."
              : "Arrastra para explorar · Busca tu nick para encontrar tu lugar."}
        </div>
        <span className="zoom-badge">{cam.zoom.toFixed(1)}×</span>
      </div>
    </>
  );
}
