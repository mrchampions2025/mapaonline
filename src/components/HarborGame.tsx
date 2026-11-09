import { useEffect, useRef, useState } from "react";
import {
  HARBOR,
  FOREST,
  finishWork,
  startWork,
  type HarborStatus,
} from "../lib/harbor.ts";
import { IDLE, TREES, type PlayerAction } from "../lib/player.ts";
import {
  HIDDEN_ANIMALS,
  boardBoat,
  leaveBoat,
  landingPoint,
  walkTo,
  stepAdventure,
  saveAdventure,
  type Adventure,
} from "../lib/adventure.ts";
import { walkingPath, distance } from "../lib/navigation.ts";
import { friendlyError } from "../lib/api.ts";
export type Activity = "explore" | "wood" | "ship" | "dock" | "wildlife";
type Props = {
  activity: Activity;
  onActivity: (a: Activity) => void;
  status: HarborStatus | null;
  error: string;
  onStatus: (s: HarborStatus) => void;
  onAction: (a: PlayerAction) => void;
  adventure: Adventure;
  nick?: string;
};
const CACHE = "hispania-wood-v2";
function resume() {
  try {
    const v = JSON.parse(sessionStorage.getItem(CACHE) || "null");
    if (
      v?.work?.token &&
      Number.isFinite(Date.parse(v.work.started_at)) &&
      Date.now() - Date.parse(v.work.started_at) < 1800000
    )
      return {
        work: v.work as { token: string; started_at: string },
        logs: Array.isArray(v.logs)
          ? [
              ...new Set<number>(
                v.logs.filter((n: unknown) => n === 0 || n === 1 || n === 2),
              ),
            ]
          : [],
      };
  } catch {
    /* Optional resume. */
  }
  return { work: null, logs: [] };
}
export function HarborGame({
  activity,
  onActivity,
  status,
  error,
  onStatus,
  onAction,
  adventure: s,
  nick,
}: Props) {
  const [saved] = useState(resume),
    [work, setWork] = useState(saved.work),
    [logs, setLogs] = useState<number[]>(saved.logs),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState(""),
    [actionLabel, setActionLabel] = useState("");
  const [view, setView] = useState(() => snapshot());
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheet.current?.scrollTo({ top: 0 });
  }, [activity]);
  const lock = useRef(false),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    keys = useRef(new Set<string>()),
    pressed = useRef(0);
  function snapshot() {
    return {
      aboard: s.aboard,
      nearBoat: distance(s.player, s.boat) <= 90,
      canLand: !!landingPoint(s),
      found: [...s.found],
      pending: s.pending.size,
      notice: s.notice,
      error: s.error,
    };
  }
  useEffect(() => {
    const t = setInterval(() => setView(snapshot()), 200);
    return () => clearInterval(t);
  }, [s]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      s.input = { x: 0, y: 0 };
      s.path = null;
      if (s.action.kind !== "idle")
        onAction({ ...IDLE, from: s.player, to: s.player, logs: logs.length });
      saveAdventure(s);
    };
  }, [s, onAction]);
  useEffect(() => {
    try {
      sessionStorage.setItem(CACHE, JSON.stringify({ work, logs }));
    } catch {
      /* Play without a browser store. */
    }
  }, [work, logs]);
  useEffect(() => {
    onAction({
      ...IDLE,
      from: s.player,
      to: s.player,
      logs: saved.logs.length,
    });
  }, [s, onAction, saved]);
  useEffect(() => {
    if (!work) return;
    const t = setInterval(() => {
      if (Date.now() - Date.parse(work.started_at) > 1800000 && !lock.current) {
        setWork(null);
        setLogs([]);
        onAction({ ...IDLE, from: s.player, to: s.player });
        setNotice("La jornada ha caducado. Puedes empezar otra.");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [work, s, onAction]);
  useEffect(() => {
    const vectors: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
    };
    const update = () => {
      let x = 0,
        y = 0;
      for (const key of keys.current) {
        const v = vectors[key];
        if (v) {
          x += v[0];
          y += v[1];
        }
      }
      s.input = { x, y };
    };
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable=true]",
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!vectors[key] || lock.current) return;
      e.preventDefault();
      keys.current.add(key);
      update();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      update();
    };
    const stop = () => {
      keys.current.clear();
      s.input = { x: 0, y: 0 };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
      stop();
    };
  }, [s]);
  const cooling = Date.parse(status?.next_at ?? "") > Date.now(),
    complete = (status?.deliveries ?? 0) >= 50;
  async function animate(
    kind: "chop" | "deliver",
    to: { x: number; y: number },
    extra: number,
  ) {
    if (s.aboard) throw Error("Desembarca antes de trabajar en tierra.");
    const path = walkingPath(s.player, to, s.obstacles);
    if (!path)
      throw Error(
        "No hay camino por tierra. Vuelve a esta costa con el barco.",
      );
    const length = path
        .slice(1)
        .reduce((sum, p, i) => sum + distance(p, path[i]), 0),
      walkDuration = Math.max(250, (length / 62) * 1000),
      duration = walkDuration + extra;
    onAction({
      kind,
      from: s.player,
      to: path[path.length - 1],
      started: Date.now(),
      duration,
      walkDuration,
      logs: logs.length,
      path,
    });
    await new Promise<void>((resolve) => {
      timer.current = setTimeout(resolve, duration);
    });
    if (mounted.current) s.player = { ...path[path.length - 1] };
  }
  async function begin() {
    if (lock.current || s.aboard) return;
    lock.current = true;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      setWork(await startWork());
      setLogs([]);
      onAction({ ...IDLE, from: s.player, to: s.player });
    } catch (e) {
      setFailure(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function collect(i: number) {
    if (lock.current || !work || logs.includes(i) || s.aboard) return;
    lock.current = true;
    setBusy(true);
    setFailure("");
    setActionLabel("Caminando y cortando…");
    try {
      await animate("chop", TREES[i], 2600);
      if (!mounted.current) return;
      const next = [...logs, i];
      setLogs(next);
      onAction({ ...IDLE, from: s.player, to: s.player, logs: next.length });
      setNotice("Tronco añadido a tu carga.");
    } catch (e) {
      setFailure(friendlyError(e));
      onAction({ ...IDLE, from: s.player, to: s.player, logs: logs.length });
    } finally {
      lock.current = false;
      setBusy(false);
      setActionLabel("");
    }
  }
  async function deliver() {
    if (lock.current || !work || logs.length !== 3 || s.aboard) return;
    lock.current = true;
    setBusy(true);
    setFailure("");
    try {
      setActionLabel("Llevando 3 troncos al muelle…");
      await animate("deliver", HARBOR, 1200);
      if (!mounted.current) return;
      setActionLabel("Confirmando tus 3 troncos…");
      const result = await finishWork(work.token);
      if (!mounted.current) return;
      onStatus(result);
      setWork(null);
      setLogs([]);
      onAction({ ...IDLE, from: s.player, to: s.player });
      setNotice(
        "¡+3 troncos entregados! Es una aportación de madera. Tu siguiente misión: encontrar animales ocultos.",
      );
    } catch (e) {
      setFailure(friendlyError(e));
      onAction({ ...IDLE, from: s.player, to: s.player, logs: 3 });
    } finally {
      lock.current = false;
      setBusy(false);
      setActionLabel("");
    }
  }
  function survey() {
    onActivity("wildlife");
    setFailure("");
    setNotice("");
    s.follow = true;
    s.notice =
      "Explora a pie o en barco. Al acercarte a una especie oculta, se guardará en tu inventario.";
  }
  function travelBoat() {
    setFailure("");
    setNotice("");
    if (s.aboard) leaveBoat(s);
    else boardBoat(s);
    setView(snapshot());
  }
  function direction(x: number, y: number) {
    if (lock.current || s.action.kind !== "idle") return;
    s.input = { x, y };
    s.follow = true;
  }
  return (
    <section className="game-activities" aria-label="Actividades del país">
      <div className="travel-controls" aria-label="Mover tu personaje o barco">
        <span>{view.aboard ? "⚓ A bordo" : "🚶 A pie"}</span>
        {(
          [
            ["↑", 0, -1, "norte"],
            ["←", -1, 0, "oeste"],
            ["↓", 0, 1, "sur"],
            ["→", 1, 0, "este"],
          ] as const
        ).map(([label, x, y, name]) => (
          <button
            key={name}
            aria-label={`Mover al ${name}`}
            disabled={busy}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              pressed.current = Date.now();
              direction(x, y);
            }}
            onPointerUp={() => {
              s.input = { x: 0, y: 0 };
            }}
            onPointerCancel={() => {
              s.input = { x: 0, y: 0 };
            }}
            onLostPointerCapture={() => {
              s.input = { x: 0, y: 0 };
            }}
            onClick={(e) => {
              if (
                !busy &&
                (e.detail === 0 || Date.now() - pressed.current < 140)
              ) {
                direction(x, y);
                stepAdventure(s, 0.05, Date.now());
                s.input = { x: 0, y: 0 };
              }
            }}
          >
            {label}
          </button>
        ))}
        <button
          className="follow-player"
          aria-label="Seguir a mi personaje"
          onClick={() => {
            s.follow = true;
          }}
        >
          ◎
        </button>
      </div>
      {activity !== "explore" && (
        <div className="activity-sheet" ref={sheet}>
          <div className="activity-heading">
            <div>
              <small>
                {activity === "wildlife"
                  ? "NUEVA MISIÓN · FAUNA OCULTA"
                  : activity === "ship"
                    ? "TÚ LLEVAS EL TIMÓN"
                    : "PRIMERA OBRA ENTRE TODOS"}
              </small>
              <h2>
                {activity === "ship"
                  ? "Explora con tu barco"
                  : activity === "wildlife"
                    ? "Tu inventario de fauna"
                    : activity === "wood"
                      ? "Recoge y entrega 3 troncos"
                      : "Construyamos el muelle"}
              </h2>
            </div>
            <button
              disabled={busy}
              aria-label="Cerrar actividad"
              onClick={() => onActivity("explore")}
            >
              ×
            </button>
          </div>
          {activity === "ship" ? (
            <>
              <p>
                {view.aboard
                  ? "Mantén una flecha para navegar. Sin pulsar, el barco se detiene."
                  : "Acércate al barco por tierra y embarca. Puedes volver a bajar en cualquier costa accesible."}
              </p>
              <button
                className="primary"
                disabled={busy || (view.aboard && !view.canLand)}
                onClick={travelBoat}
              >
                {view.aboard
                  ? view.canLand
                    ? "Desembarcar aquí →"
                    : "Acércate a una costa para bajar"
                  : view.nearBoat
                    ? "Embarcar →"
                    : "Caminar hasta el barco →"}
              </button>
              <small>
                Flechas o WASD · El barco se queda donde lo dejas. No puede
                atravesar tierra.
              </small>
            </>
          ) : activity === "wildlife" ? (
            <>
              <p>
                <strong>
                  {view.found.length} / {HIDDEN_ANIMALS.length} especies
                  descubiertas
                </strong>{" "}
                · Acércate a los animales ocultos para registrarlos. Hay
                especies en los islotes.
              </p>
              <div className="animal-inventory">
                {HIDDEN_ANIMALS.map((a) => {
                  const found = view.found.includes(a.code);
                  return (
                    <div key={a.code} className={found ? "found" : ""}>
                      <span aria-hidden="true">{found ? a.icon : "?"}</span>
                      <strong>{found ? a.name : "Por descubrir"}</strong>
                    </div>
                  );
                })}
              </div>
              <button
                className="primary"
                onClick={() => {
                  onActivity("explore");
                  s.follow = true;
                  s.notice =
                    "Toca el suelo para caminar o mantén las flechas. Las especies aparecen al acercarte.";
                }}
              >
                Explorar y buscar animales →
              </button>
              <button
                className="secondary-game"
                onClick={() => onActivity("ship")}
              >
                Buscar por mar · Ver barco →
              </button>
              <small>
                Descubrimientos guardados en tu sesión. Su utilidad llegará en
                una próxima fase.
              </small>
            </>
          ) : (
            <>
              <div className="delivery-progress">
                <progress
                  aria-label="Troncos para el muelle"
                  max={(status?.goal ?? 50) * 3}
                  value={(status?.deliveries ?? 0) * 3}
                />
                <strong>
                  {status
                    ? `${status.deliveries * 3} / ${status.goal * 3} troncos`
                    : "Conectando…"}
                </strong>
              </div>
              <small>
                {status?.deliveries ?? 0} / {status?.goal ?? 50} aportaciones ·
                Cada entrega contiene 3 troncos.
              </small>
              {activity === "dock" ? (
                <>
                  <p>
                    {complete
                      ? "¡Muelle terminado! Ahora puedes explorar la fauna y las costas."
                      : "La madera que transportas se añade a la obra al confirmar la entrega."}
                  </p>
                  <button
                    className="primary"
                    disabled={busy || view.aboard}
                    onClick={() => {
                      if (cooling || complete) survey();
                      else {
                        onActivity("wood");
                        walkTo(s, FOREST);
                      }
                    }}
                  >
                    {cooling || complete
                      ? "Siguiente misión: buscar animales →"
                      : "Ir al bosque y ayudar →"}
                  </button>
                  <button
                    className="secondary-game"
                    onClick={() => onActivity("ship")}
                  >
                    Ir al barco →
                  </button>
                </>
              ) : (
                <>
                  {!work ? (
                    <>
                      <p>
                        {view.aboard
                          ? "Desembarca para recoger madera."
                          : complete
                            ? "La obra ya está terminada. Tienes una misión de fauna disponible."
                            : cooling
                              ? `Ya entregaste tus 3 troncos. Próxima aportación: ${new Date(status!.next_at!).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`
                              : "Cada jornada reúne 3 troncos: se suman 3 a la madera y 1 a las aportaciones. Una jornada cada 24 horas por sesión."}
                      </p>
                      {!cooling && !complete && (
                        <button
                          className="primary"
                          disabled={busy || view.aboard || !status}
                          onClick={() => void begin()}
                        >
                          {busy ? "Preparando…" : "Empezar jornada de madera →"}
                        </button>
                      )}
                      <button
                        className={
                          cooling || complete ? "primary" : "secondary-game"
                        }
                        onClick={survey}
                      >
                        Buscar animales · Misión disponible →
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="wood-pile"
                        aria-label="Recoger tres troncos"
                      >
                        {[0, 1, 2].map((i) => (
                          <button
                            key={i}
                            aria-label={`Recoger tronco ${i + 1}`}
                            disabled={logs.includes(i) || busy || view.aboard}
                            onClick={() => void collect(i)}
                          >
                            <span aria-hidden="true">
                              {logs.includes(i) ? "✓" : "🪵"}
                            </span>
                            <small>
                              {logs.includes(i)
                                ? "Recogido"
                                : `Tronco ${i + 1}`}
                            </small>
                          </button>
                        ))}
                      </div>
                      <button
                        className="primary"
                        disabled={busy || logs.length < 3 || view.aboard}
                        onClick={() => void deliver()}
                      >
                        {busy
                          ? actionLabel
                          : logs.length < 3
                            ? `${logs.length} / 3 troncos en tu carga`
                            : "Entregar mis 3 troncos al muelle →"}
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
          <p className="game-feedback" role="status">
            {actionLabel ||
              failure ||
              view.error ||
              notice ||
              view.notice ||
              (activity === "wood" || activity === "dock" ? error : "")}
          </p>
          <small className="session-note">
            {nick ? `Juegas como @${nick}.` : "Juegas como Anónimo."} Arrastra
            para mirar · Pellizca para acercar · ◎ vuelve a seguirte.
          </small>
        </div>
      )}
      {activity === "explore" && (
        <div className="explore-hint" role="status">
          {view.error ||
            view.notice ||
            "Toca el suelo para caminar · Mantén las flechas para moverte · Arrastra para mirar"}
        </div>
      )}
      <nav className="activity-tabs" aria-label="Elegir actividad">
        {(
          [
            ["explore", "⌖", "Explorar"],
            ["wood", "🪵", "Madera"],
            ["dock", "⚒", "Muelle"],
            ["ship", "⚓", "Barco"],
            ["wildlife", "🐾", `Fauna ${view.found.length}`],
          ] as const
        ).map(([id, icon, title]) => (
          <button
            key={id}
            disabled={busy}
            aria-pressed={activity === id}
            onClick={() => {
              setNotice("");
              setFailure("");
              onActivity(id);
            }}
          >
            <span aria-hidden="true">{icon}</span>
            {title}
          </button>
        ))}
      </nav>
    </section>
  );
}
