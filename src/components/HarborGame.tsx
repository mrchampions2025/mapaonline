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
  onSteer: (d: number) => void;
  nick?: string;
};
export function HarborGame({
  activity,
  onActivity,
  status,
  error,
  onStatus,
  onVoyage,
  onSteer,
  nick,
}: Props) {
  const [work, setWork] = useState<{
    token: string;
    started_at: string;
  } | null>(null);
  const [logs, setLogs] = useState<number[]>([]),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failure, setFailure] = useState(""),
    [seconds, setSeconds] = useState(8),
    [sailing, setSailing] = useState(false);
  const lock = useRef(false),
    tripTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (tripTimer.current) clearTimeout(tripTimer.current);
      onVoyage(false);
    },
    [onVoyage],
  );
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
      const s = await finishWork(work.token);
      onStatus(s);
      setWork(null);
      setLogs([]);
      setNotice(
        "¡Entrega guardada! Has ayudado a levantar el muelle. Vuelve dentro de 24 horas para otra jornada.",
      );
    } catch (e) {
      setFailure(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function sail() {
    setSailing(true);
    onVoyage(true);
    setNotice("Tu barco recorre la bahía. Sigue su estela en el mapa.");
    tripTimer.current = setTimeout(() => {
      setSailing(false);
      onVoyage(false);
      setNotice("¡Travesía completada! Puedes volver a navegar.");
    }, 12000);
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
              onClick={() => onActivity("explore")}
              aria-label="Cerrar actividad"
            >
              ×
            </button>
          </div>
          {activity === "ship" ? (
            <>
              <p>
                Sube a bordo y recorre la bahía. El barco ya forma parte de
                nuestro mapa.
              </p>
              <button className="primary" disabled={sailing} onClick={sail}>
                {sailing ? "Navegando…" : "Navegar por la bahía →"}
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
                        disabled={busy || cooling || complete || !status}
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
                            disabled={logs.includes(i) || busy}
                            onClick={() =>
                              setLogs((v) => (v.includes(i) ? v : [...v, i]))
                            }
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
                        disabled={busy || logs.length < 3 || seconds > 0}
                        onClick={() => void deliver()}
                      >
                        {busy
                          ? "Guardando entrega…"
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
            {failure || notice || (activity !== "ship" ? error : "")}
          </p>
          <small className="session-note">
            {nick
              ? `Juegas desde la sesión de @${nick}.`
              : "Puedes jugar como visitante, sin elegir un nick."}{" "}
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
