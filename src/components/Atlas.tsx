import { useEffect, useRef, useState } from "react";
import type { Bounds, District, Resident, WorldObject } from "../lib/types.ts";
import { drawWildlife } from "../lib/wildlife.ts";
import type { AnimalName, AnimalSprites } from "../lib/fauna_atlas.ts";
import { AVATARS, parcelPosition } from "../lib/world.ts";
import { CAPITAL_ZONES, drawCapitalZones } from "../lib/zones.ts";
import { FIRST_MARKET, NATION } from "../lib/nation.ts";
import { drawMarket } from "../lib/market.ts";
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
};
type Camera = { x: number; y: number; zoom: number };
const initial: Camera = { x: 800, y: 1080, zoom: 1 };
export function Atlas(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 }),
    [image, setImage] = useState<HTMLImageElement | null>(null),
    [cam, setCam] = useState(initial);
  const drag = useRef<{
    x: number;
    y: number;
    cam: Camera;
    moved: boolean;
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
  const activeZone = CAPITAL_ZONES.find(
    (z) => cam.zoom >= 2 && Math.hypot(cam.x - z.x, cam.y - z.y) < 2,
  );
  const market = props.objects.find((o) => o.id === FIRST_MARKET.id);
  function screen(x: number, y: number) {
    return {
      x: (x - cam.x) * scale + size.w / 2,
      y: (y - cam.y) * scale + size.h / 2,
    };
  }
  function world(x: number, y: number) {
    return {
      x: (x - size.w / 2) / scale + cam.x,
      y: (y - size.h / 2) / scale + cam.y,
    };
  }
  function zoom(delta: number) {
    setCam((c) => ({ ...c, zoom: Math.min(12, Math.max(1, c.zoom * delta)) }));
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
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (props.focus) {
      const p = parcelPosition(props.focus.parcel_id);
      setCam({ x: p.x, y: p.y, zoom: 7 });
    }
  }, [props.focus]);
  useEffect(() => {
    const timeout = setTimeout(() => {
      props.onBounds({
        left: cam.x - size.w / 2 / scale,
        top: cam.y - size.h / 2 / scale,
        right: cam.x + size.w / 2 / scale,
        bottom: cam.y + size.h / 2 / scale,
        zoom: cam.zoom,
      });
    }, 180);
    return () => clearTimeout(timeout);
  }, [cam, size, scale, props.onBounds]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setCam((c) => ({
        ...c,
        zoom: Math.max(1, Math.min(12, c.zoom * Math.exp(-e.deltaY * 0.0015))),
      }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
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
    let lastFrame = -Infinity;
    function draw(now: number) {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0b293a";
      ctx.fillRect(0, 0, size.w, size.h);
      if (image) {
        const p = screen(0, 0);
        ctx.drawImage(image, p.x, p.y, 1600 * scale, 2000 * scale);
      }
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
        if (p.x < -200 || p.x > size.w + 200 || p.y < -200 || p.y > size.h + 200)
          continue;
        if (obj.id === FIRST_MARKET.id) {
          drawMarket(ctx,p.x,p.y,scale,reducedMotion.matches ? 0 : now / 1000);
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
            ctx.fillRect(p.x-width/2,p.y+20,width,25);
            ctx.fillStyle = "#70e0c1";
            ctx.fillText(label,p.x,p.y+37);
          }
        }
      } else {
        // Solo trazar casillas de la zona visible; no existe un nodo DOM por habitante.
        ctx.strokeStyle = "#a8e3c128";
        ctx.lineWidth = 1;
        if (cam.zoom > 3)
          for (let id = 1; id <= 4096; id++) {
            const p = parcelPosition(id),
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
          const p = parcelPosition(r.parcel_id),
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
      drawCapitalZones(ctx, screen, size.w, size.h);
    }
    function animate(now: number) {
      if (!document.hidden && now - lastFrame >= 1000 / 12) {
        draw(now);
        lastFrame = now;
      }
      animation = requestAnimationFrame(animate);
    }
    draw(performance.now());
    animation = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animation);
  }, [
    cam,
    size,
    image,
    props.residents,
    props.objects,
    props.districts,
    props.selected,
    props.focus,
    triSprite,
    animalSprites,
  ]);
  return (
    <>
    <nav className="zone-navigation" aria-label="Ir a las zonas del mapa">
      {CAPITAL_ZONES.map((zone) => (
        <button key={zone.id} aria-pressed={activeZone?.id === zone.id}
          onClick={() => setCam({ x: zone.x, y: zone.y, zoom: 3.5 })}>
          <b style={{ color: zone.color }}>{zone.id}</b>
          <span>{zone.id === "A" ? "Capital" : `Zona ${zone.id}`} · {zone.name}</span>
          <span aria-hidden="true">↗</span>
        </button>
      ))}
      {market && <button className="market-jump" onClick={() => setCam({x:market.x,y:market.y-18,zoom:5.5})}>
        <b>🥔</b><span>Ver Patatas de @maravaf</span><span aria-hidden="true">↗</span>
      </button>}
    </nav>
    <div className={"atlas " + (props.editing ? "editing" : "")} ref={box}>
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
          if (directions[e.key]) {
            e.preventDefault();
            const [x, y] = directions[e.key];
            setCam((c) => ({ ...c, x: c.x + x / scale, y: c.y + y / scale }));
          }
          if (e.key === "+" || e.key === "=") zoom(1.4);
          if (e.key === "-") zoom(1 / 1.4);
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            cam: { ...cam },
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
          if (d.moved)
            setCam({
              ...d.cam,
              x: Math.max(0, Math.min(1600, d.cam.x - dx / scale)),
              y: Math.max(400, Math.min(1800, d.cam.y - dy / scale)),
            });
        }}
        onPointerCancel={() => (drag.current = null)}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.moved) return;
          const rect = e.currentTarget.getBoundingClientRect(),
            p = world(e.clientX - rect.left, e.clientY - rect.top);
          if (props.editing) {
            props.onPoint(Math.round(p.x), Math.round(p.y));
            return;
          }
          const zone = CAPITAL_ZONES.find((z) => {
            const dx = (p.x - z.x) * scale, dy = (p.y - z.y) * scale;
            return Math.hypot(dx, dy + 36) < 22 || (Math.abs(dx) < 90 && dy > 12 && dy < 38);
          });
          if (zone) {
            setCam({ x: zone.x, y: zone.y, zoom: 3.5 });
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
        onDoubleClick={() => zoom(1.6)}
      />
      <div className="atlas-label">
        <span className="live-dot" /> ARCHIPIÉLAGO 01 <span>/</span>{" "}
        {cam.zoom < 2 ? "VISTA GENERAL" : activeZone ? `ZONA ${activeZone.id} · ${activeZone.name.toLocaleUpperCase("es")}` : "EXPLORANDO EL ATLAS"}
      </div>
      <div className="map-controls">
        <button aria-label="Acercar mapa" onClick={() => zoom(1.5)}>
          +
        </button>
        <button aria-label="Alejar mapa" onClick={() => zoom(1 / 1.5)}>
          −
        </button>
        <button aria-label="Centrar mapa" onClick={() => setCam(initial)}>
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
