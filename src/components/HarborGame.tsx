import { HARBOR } from "../lib/harbor.ts";
import { IDLE, TREES, VOYAGE_MS, type PlayerAction } from "../lib/player.ts";
import { useEffect, useRef, useState } from "react";
import { finishWork, startWork, type HarborStatus } from "../lib/harbor.ts";
import { friendlyError } from "../lib/api.ts";
export type Activity = "explore" | "wood" | "ship" | "dock";
type Props = {
  activity: Activity;
  onActivity: (a: Activity) => void;
  status: HarborStatus | null;
  error: string;
  onStatus: (s: HarborStatus) => void;
  onVoyage: (v: boolean) => void;
  onVoyageStarted: (v: number) => void;
  onAction: (v: PlayerAction) => void;
  onSteer: (d: number) => void;
  nick?: string;
};
const CACHE = "hispania-wood-v2";
function resumeWork(): {
  work: { token: string; started_at: string } | null;
  logs: number[];
} {
  try {
    const v = JSON.parse(sessionStorage.getItem(CACHE) || "null");
    if (
      v?.work?.token &&
      Number.isFinite(Date.parse(v.work.started_at)) &&
      Date.now() - Date.parse(v.work.started_at) < 1800000
    )
      return {
        work: v.work,
        logs: Array.isArray(v.logs)
          ? [
              ...new Set<number>(
                v.logs.filter((n: unknown) => n === 0 || n === 1 || n === 2),
              ),
            ]
          : [],
      };
  } catch {
    /* A blocked browser store must not prevent playing. */
  }
  return { work: null, logs: [] };
}
export function HarborGame({
  activity,
  onActivity,
  status,
  error,
  onStatus,
  onVoyage,
  onVoyageStarted,
  onAction,
  onSteer,
  nick,
}: Props) {
  const [saved] = useState(resumeWork);
  const [work, setWork] = useState<{
    token: string;
    started_at: string;
  } | null>(saved.work);
  const [logs, setLogs] = useState<number[]>(saved.logs),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState(""),
    [seconds, setSeconds] = useState(8),
    [sailing, setSailing] = useState(false);
  const position = useRef(IDLE.to);
  const mounted = useRef(true);
  const actionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionLabel, setActionLabel] = useState("");
  const [tripSeconds, setTripSeconds] = useState(0);
  const tripStart = useRef(0);
  const lock = useRef(false),
    tripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (actionTimer.current) clearTimeout(actionTimer.current);
      if (tripTimer.current) clearTimeout(tripTimer.current);
      onVoyage(false);
    };
  }, [onVoyage]);
  useEffect(() => {
    try {
      sessionStorage.setItem(CACHE, JSON.stringify({ work, logs }));
    } catch {
      /* Optional local resume. */
    }
  }, [work, logs]);
  useEffect(() => {
    onAction({ ...IDLE, logs: saved.logs.length, started: Date.now() });
  }, [onAction, saved]);
  useEffect(() => {
    if (!work) return;
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          8 - Math.floor((Date.now() - Date.parse(work.started_at)) / 1000),
        ),
      );
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [work]);
  useEffect(() => {
    if (!sailing) return;
    const t = setInterval(
      () =>
        setTripSeconds(
          Math.min(60, Math.floor((Date.now() - tripStart.current) / 1000)),
        ),
      250,
    );
    return () => clearInterval(t);
  }, [sailing]);
  async function animate(
    kind: "chop" | "deliver",
    to: { x: number; y: number },
    duration: number,
  ) {
    onAction({
      kind,
      from: position.current,
      to,
      started: Date.now(),
      duration,
      logs: logs.length,
    });
    await new Promise<void>((resolve) => {
      actionTimer.current = setTimeout(resolve, duration);
    });
    position.current = to;
  }
  async function collect(i: number) {
    if (lock.current || !work || logs.includes(i) || sailing) return;
    lock.current = true;
    setBusy(true);
    setActionLabel("Caminando y cortando…");
    await animate("chop", TREES[i], 5500);
    if (!mounted.current) return;
    const nextLogs = [...logs, i];
    setLogs(nextLogs);
    onAction({
      kind: "idle",
      from: position.current,
      to: position.current,
      started: Date.now(),
      duration: 0,
      logs: nextLogs.length,
    });
    setNotice("Tronco recogido y añadido a tu carga.");
    setBusy(false);
    lock.current = false;
    setActionLabel("");
  }
  const next = status?.next_at ? Date.parse(status.next_at) : 0;
  const cooling = next > Date.now(),
    complete = (status?.deliveries ?? 0) >= 50;
  async function begin() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setFailure("");
    setNotice("");
    try {
      setWork(await startWork());
      setLogs([]);
      position.current = IDLE.to;
      onAction({ ...IDLE, started: Date.now() });
    } catch (e) {
      setFailure(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function deliver() {
    if (lock.current || !work || logs.length !== 3 || seconds > 0) return;
    lock.current = true;
    setBusy(true);
    setFailure("");
    try {
      setActionLabel("Llevando tu carga al muelle…");
      await animate("deliver", HARBOR, 9000);
      if (!mounted.current) return;
      setActionLabel("Confirmando entrega…");
      const s = await finishWork(work.token);
      if (!mounted.current) return;
      onAction({
        kind: "idle",
        from: HARBOR,
        to: HARBOR,
        started: Date.now(),
        duration: 0,
        logs: 0,
      });
      onStatus(s);
      setWork(null);
      setLogs([]);
      setNotice(
        "¡Entrega guardada! Has ayudado a levantar el muelle. Vuelve dentro de 24 horas para otra jornada.",
      );
    } catch (e) {
      setFailure(friendlyError(e));
      onAction({
        kind: "idle",
        from: position.current,
        to: position.current,
        started: Date.now(),
        duration: 0,
        logs: 3,
      });
    } finally {
      lock.current = false;
      setBusy(false);
      setActionLabel("");
    }
  }
  function sail() {
    if (lock.current || sailing) return;
    tripStart.current = Date.now();
    setTripSeconds(0);
    onVoyageStarted(tripStart.current);
    setSailing(true);
    onVoyage(true);
    setNotice(
      "Tu barco rodea la isla. La cámara te acompaña durante un minuto.",
    );
    tripTimer.current = setTimeout(() => {
      setSailing(false);
      onVoyage(false);
      setNotice("¡Travesía completada! Puedes volver a navegar.");
    }, VOYAGE_MS);
  }
  return (
    <section className="game-activities" aria-label="Actividades del país">
      {activity !== "explore" && (
        <div className="activity-sheet">
          <div className="activity-heading">
            <div>
              <small>
                {activity === "ship"
                  ? "IDEA DE @.CYBERFILE"
                  : "PRIMERA OBRA ENTRE TODOS"}
              </small>
              <h2>
                {activity === "ship"
                  ? "Nuestro barco naval"
                  : activity === "wood"
                    ? "Una entrega. Tres troncos."
                    : "Construyamos el muelle"}
              </h2>
            </div>
            <button
              disabled={busy}
              onClick={() => onActivity("explore")}
              aria-label="Cerrar actividad"
            >
              ×
            </button>
          </div>
          {activity === "ship" ? (
            <>
              <p>
                Sube a bordo y da la vuelta a toda la isla. El barco ya forma
                parte de nuestro mapa.
              </p>
              <button
                className="primary"
                disabled={sailing || busy}
                onClick={sail}
              >
                {sailing
                  ? `Rodeando la isla · ${tripSeconds} / 60 s`
                  : "Dar la vuelta a la isla →"}
              </button>
              <div className="ship-helm">
                <button disabled={!sailing} onClick={() => onSteer(-20)}>
                  ← Babor
                </button>
                <span>Timón</span>
                <button disabled={!sailing} onClick={() => onSteer(20)}>
                  Estribor →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="delivery-progress">
                <progress
                  aria-label="Entregas para el muelle"
                  max={50}
                  value={status?.deliveries ?? 0}
                />
                <strong>
                  {status
                    ? `${status.deliveries} / 50 entregas`
                    : "Conectando con la obra…"}
                </strong>
              </div>
              {activity === "dock" ? (
                <>
                  <p>
                    {complete
                      ? "¡El muelle está terminado! Gracias a todas las sesiones que colaboraron."
                      : "Cada entrega añade madera al muelle. Su aspecto cambia con el progreso de todos."}
                  </p>
                  <small>
                    Propuesta de @kender.villanueva2 · pesca y cultivos de la
                    comunidad.
                  </small>
                  {!complete && (
                    <button
                      className="primary"
                      onClick={() => onActivity("wood")}
                    >
                      Ir al bosque y ayudar →
                    </button>
                  )}
                </>
              ) : (
                <>
                  {!work ? (
                    <>
                      <p>
                        {complete
                          ? "El muelle ya está terminado. Explora el barco y las zonas del país."
                          : cooling
                            ? `Tu siguiente jornada: ${new Date(next).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`
                            : "Recoge tres troncos y entrégalos. Una jornada cada 24 horas por sesión de juego."}
                      </p>
                      <button
                        className="primary"
                        disabled={
                          busy || sailing || cooling || complete || !status
                        }
                        onClick={() => void begin()}
                      >
                        {busy
                          ? "Preparando…"
                          : complete
                            ? "Obra terminada"
                            : cooling
                              ? "Tu entrega ya cuenta"
                              : "Empezar jornada →"}
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
                            disabled={logs.includes(i) || busy || sailing}
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
                        disabled={
                          busy || sailing || logs.length < 3 || seconds > 0
                        }
                        onClick={() => void deliver()}
                      >
                        {busy
                          ? actionLabel || "Guardando entrega…"
                          : logs.length < 3
                            ? `${logs.length} / 3 troncos recogidos`
                            : seconds > 0
                              ? `Preparando la carga… ${seconds} s`
                              : "Entregar madera al muelle →"}
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
              notice ||
              (activity !== "ship" ? error : "")}
          </p>
          <small className="session-note">
            {nick
              ? `Juegas desde la sesión de @${nick}.`
              : "Juegas como Anónimo. No necesitas un nick para ayudar."}{" "}
            Conserva esta sesión para recordar tu jornada. Contamos entregas, no
            personas únicas verificadas.
          </small>
        </div>
      )}
      {activity === "explore" && (
        <div className="explore-hint">
          Arrastra el mapa · Pellizca para acercarte · Toca un vecino
        </div>
      )}
      <nav className="activity-tabs" aria-label="Elegir actividad">
        {(
          [
            ["explore", "⌖", "Explorar"],
            ["wood", "🪵", "Madera"],
            ["dock", "⚒", "Muelle"],
            ["ship", "⚓", "Barco"],
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
