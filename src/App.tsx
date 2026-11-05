import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Atlas } from "./components/Atlas.tsx";
import * as api from "./lib/api.ts";
import {
  AVATARS,
  DISTRICT_NAMES,
  districtPosition,
  normalizeNick,
} from "./lib/world.ts";
import type { Bounds, District, Resident, WorldObject } from "./lib/types.ts";
const emptyDistricts: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  ...districtPosition(i + 1),
  residents: 0,
  capacity: 1024,
}));
export function App() {
  const [session, setSession] = useState<Session | null>(null),
    [loadingSession, setLoadingSession] = useState(api.configured);
  const [districts, setDistricts] = useState(emptyDistricts),
    [residents, setResidents] = useState<Resident[]>([]),
    [objects, setObjects] = useState<WorldObject[]>([]);
  const [mine, setMine] = useState<Resident | null>(null),
    [focus, setFocus] = useState<Resident | null>(null),
    [selected, setSelected] = useState<Resident | null>(null);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [cooldown, setCooldown] = useState(0);
  const [nick, setNick] = useState(""),
    [avatar, setAvatar] = useState(0),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false),
    [editing, setEditing] = useState(false),
    [kind, setKind] = useState<WorldObject["kind"]>("house"),
    [objectName, setObjectName] = useState(""),
    [point, setPoint] = useState({ x: 850, y: 1200 });
  const [removeConfirm, setRemoveConfirm] = useState(false),
    [mapTruncated, setMapTruncated] = useState(false),
    [connected, setConnected] = useState(false);
  const bounds = useRef<Bounds>({
      left: 0,
      top: 400,
      right: 1600,
      bottom: 1700,
      zoom: 1,
    }),
    request = useRef(0);
  const sync = useCallback(async () => {
    if (!api.configured) return;
    try {
      const [d, o] = await Promise.all([api.districts(), api.objects()]);
      setDistricts(d);
      setObjects(o);
      setConnected(true);
    } catch (e) {
      setConnected(false);
      setError("No se ha podido cargar el atlas. " + api.friendlyError(e));
    }
  }, []);
  const loadBounds = useCallback(async (b: Bounds) => {
    bounds.current = b;
    const seq = ++request.current;
    if (!api.configured || b.zoom < 2) {
      setResidents([]);
      setMapTruncated(false);
      return;
    }
    try {
      const data = await api.slice(b);
      if (seq === request.current) {
        setResidents(data);
        setMapTruncated(data.length === 750);
      }
    } catch (e) {
      if (seq === request.current) setError(api.friendlyError(e));
    }
  }, []);
  useEffect(() => {
    void sync();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void sync();
        void loadBounds(bounds.current);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [sync, loadBounds]);
  useEffect(() => {
    const client = api.supabase;
    if (!client) return;
    let active = true;
    client.auth.getSession().then(({ data, error: e }) => {
      if (active) {
        setLoadingSession(false);
        if (e) setError(api.friendlyError(e));
        else setSession(data.session);
      }
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoadingSession(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setMine(null);
    setAdmin(false);
    setEditing(false);
    if (!session) return;
    Promise.all([api.mine(), api.isAdmin()])
      .then(([r, a]) => {
        if (active) {
          setMine(r);
          setAdmin(a);
        }
      })
      .catch((e) => {
        if (active) setError(api.friendlyError(e));
      });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    if (!api.configured) return;
    const initialNick = new URLSearchParams(location.search).get("vecino");
    if (initialNick)
      api
        .search(initialNick)
        .then((r) => {
          if (r) {
            setFocus(r);
            setSelected(r);
          }
        })
        .catch(() => {});
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function sendCode() {
    await act(async () => {
      const { error: e } = await api.supabase!.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (e) throw e;
      setSent(true);
      setCooldown(60);
      setMessage(
        "Te hemos enviado un código. Revisa también la carpeta de spam.",
      );
    });
  }
  const total = districts.reduce((n, d) => n + Number(d.residents), 0),
    capacity = districts.reduce((n, d) => n + Number(d.capacity), 0);
  const shownResidents = [...residents];
  for (const r of [mine, focus])
    if (r && !shownResidents.some((x) => x.id === r.id)) shownResidents.push(r);
  return (
    <>
      <header className="header">
        <a href="/" className="brand" aria-label="Nación Cero, inicio">
          <span className="logo">N</span>
          <span>
            <b>NACIÓN CERO</b>
            <small>EL ATLAS DE LOS FUNDADORES</small>
          </span>
        </a>
        <nav>
          <a href={api.tiktokUrl} target="_blank" rel="noreferrer">
            La historia en TikTok <span>↗</span>
          </a>
          <span className="pill">TEMPORADA 01</span>
        </nav>
      </header>
      {!api.configured ? (
        <div className="setup-banner">
          VISTA PREVIA · Falta conectar Supabase. Puedes explorar el territorio;
          el registro se activará al configurar el proyecto.
        </div>
      ) : (
        !api.registrationOpen && (
          <div className="setup-banner">
            ESTAMOS FUNDANDO EL PAÍS · El atlas ya está abierto para explorar.
            Pronto abriremos el registro de habitantes.
          </div>
        )
      )}
      <div className="layout">
        <main>
          <div className="intro">
            <div>
              <p className="eyebrow">
                UN PERSONAJE. UNA PARCELA. UNA HISTORIA.
              </p>
              <h1>
                Llegaste antes
                <br />
                que <em>la capital.</em>
              </h1>
              <p className="lead">
                Este país lo construimos entre todos.
                <br />
                Encuentra tu lugar y deja tu nick en el mapa.
              </p>
            </div>
            <div className="intro-mark" aria-hidden="true">
              <span>01</span>
              <small>
                EL COMIENZO
                <br />
                DE ALGO GRANDE
              </small>
            </div>
          </div>
          <div className="world-stats">
            <span>
              <b>{connected ? total.toLocaleString("es-ES") : "—"}</b>{" "}
              habitantes registrados
            </span>
            <span>
              <b>{districts.length}</b> barrios fundadores
            </span>
            <span className="status">
              <i className={connected ? "live-dot" : "offline-dot"} />
              {connected
                ? "Atlas conectado"
                : api.configured
                  ? "Conectando atlas"
                  : "Modo vista previa"}
            </span>
          </div>
          <Atlas
            districts={districts}
            residents={shownResidents}
            objects={objects}
            focus={focus}
            selected={selected}
            editing={editing}
            onSelect={setSelected}
            onPoint={(x, y) => setPoint({ x, y })}
            onBounds={loadBounds}
          />
          {mapTruncated && (
            <p className="muted">
              Esta zona tiene muchos vecinos. Acércate más para verlos con
              detalle.
            </p>
          )}
          {selected && (
            <div className="resident-card">
              <span
                className="avatar-dot"
                style={{ background: AVATARS[selected.avatar].color }}
              />
              <div>
                <strong>@{selected.nick}</strong>
                <span>
                  Parcela F-{String(selected.parcel_id).padStart(4, "0")} ·
                  Nombre público sin verificar en TikTok
                </span>
              </div>
              <button
                className="text-button"
                onClick={() => setSelected(null)}
                aria-label="Cerrar ficha de habitante"
              >
                ×
              </button>
            </div>
          )}
          <div className="below-map">
            <section>
              <p className="eyebrow">UN SITIO QUE ES TUYO</p>
              <h2>
                Una pequeña parcela.
                <br />
                Un gran comienzo.
              </h2>
              <p>
                Tu personaje conserva su lugar mientras el país crece. Las
                nuevas ciudades, los caminos y los puertos se deciden en los
                capítulos de la serie.
              </p>
            </section>
            <section className="district-list">
              <p className="eyebrow">NUESTROS PRIMEROS BARRIOS</p>
              {districts.map((d) => (
                <div key={d.id}>
                  <span>
                    <i />
                    {d.name}
                  </span>
                  <b>
                    {Number(d.residents).toLocaleString("es-ES")}{" "}
                    <small>
                      / {Number(d.capacity).toLocaleString("es-ES")}
                    </small>
                  </b>
                </div>
              ))}
            </section>
          </div>
        </main>
        <aside>
          <div className="sidebar-label">
            TU PASAPORTE FUNDADOR <span>↗</span>
          </div>
          {loadingSession ? (
            <p className="muted">Recuperando tu sesión…</p>
          ) : !session ? (
            <>
              <h2>
                Todo empieza
                <br />
                con tu nombre.
              </h2>
              <p className="muted">
                Entra con un código de correo. Sin contraseña. Tu correo no
                aparece en el mapa.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!busy && api.configured && api.registrationOpen)
                    void (sent
                      ? act(async () => {
                          const { error: e } =
                            await api.supabase!.auth.verifyOtp({
                              email: email.trim(),
                              token: code.trim(),
                              type: "email",
                            });
                          if (e) throw e;
                          setCode("");
                          setMessage("Ya estás dentro. Elige tu personaje.");
                        })
                      : sendCode());
                }}
              >
                <label htmlFor="email">Tu correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={sent || busy}
                />
                {sent && (
                  <>
                    <label htmlFor="code">Código recibido por correo</label>
                    <input
                      id="code"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6,10}"
                      minLength={6}
                      maxLength={10}
                      placeholder="Introduce el código"
                      required
                    />
                  </>
                )}
                <p className="fineprint">
                  Al continuar, aceptas mostrar públicamente tu nick y personaje
                  si reservas una parcela. <a href="#reglas">Cómo funciona</a>.
                </p>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !api.configured ||
                    !api.registrationOpen ||
                    !connected
                  }
                >
                  {!api.registrationOpen
                    ? "Registro próximamente"
                    : busy
                      ? "Un momento…"
                      : sent
                        ? "Validar código →"
                        : "Recibir código →"}
                </button>
              </form>
              {sent && (
                <div className="auth-actions">
                  <button
                    onClick={() => void sendCode()}
                    disabled={busy || cooldown > 0}
                  >
                    {cooldown > 0
                      ? `Reenviar en ${cooldown}s`
                      : "Reenviar código"}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      setCode("");
                    }}
                  >
                    Cambiar correo
                  </button>
                </div>
              )}
            </>
          ) : mine ? (
            <>
              <h2>
                Ya tienes
                <br />
                tu lugar aquí.
              </h2>
              <div className="passport">
                <span
                  className="passport-avatar"
                  style={{ color: AVATARS[mine.avatar].color }}
                >
                  ♟
                </span>
                <span className="eyebrow">HABITANTE FUNDADOR</span>
                <h3>@{mine.nick}</h3>
                <p>PARCELA F-{String(mine.parcel_id).padStart(4, "0")}</p>
                <small>
                  {DISTRICT_NAMES[Math.floor((mine.parcel_id - 1) / 1024)]}
                </small>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setFocus({ ...mine });
                  setSelected(mine);
                }}
              >
                Llévame a mi parcela ↗
              </button>
              <button
                className="secondary"
                onClick={() =>
                  void act(async () => {
                    const url = new URL(location.origin);
                    url.searchParams.set("vecino", mine.nick);
                    await navigator.clipboard.writeText(url.toString());
                    setMessage("Enlace de tu parcela copiado.");
                  })
                }
              >
                Copiar enlace de mi parcela
              </button>
            </>
          ) : (
            <>
              <h2>
                Tu personaje.
                <br />
                Tu primer hogar.
              </h2>
              <p className="muted">
                La parcela se asigna automáticamente. Una por cuenta de correo.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    const r = await api.reserve(normalizeNick(nick), avatar);
                    setMine(r);
                    setFocus(r);
                    setSelected(r);
                    await sync();
                    await loadBounds(bounds.current);
                    setMessage(
                      "Bienvenido. Tu lugar ya está guardado en el atlas.",
                    );
                  });
                }}
              >
                <label htmlFor="nick">Tu nick público</label>
                <input
                  id="nick"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  placeholder="@tu_usuario"
                  minLength={2}
                  maxLength={25}
                  autoComplete="off"
                  required
                />
                <p className="fineprint">
                  Puedes usar tu nick de TikTok si está libre. No verificamos su
                  titularidad ni el seguimiento de la cuenta.
                </p>
                <label>Elige tu personaje</label>
                <div className="avatars">
                  {AVATARS.map((a, i) => (
                    <button
                      key={a.name}
                      type="button"
                      className={avatar === i ? "chosen" : ""}
                      onClick={() => setAvatar(i)}
                      aria-pressed={avatar === i}
                      aria-label={a.name}
                    >
                      <span style={{ color: a.color }}>♟</span>
                    </button>
                  ))}
                </div>
                <p className="avatar-name">{AVATARS[avatar].name}</p>
                <button
                  className="primary"
                  disabled={busy || !connected || total >= capacity}
                >
                  {busy ? "Asignando parcela…" : "Conseguir mi parcela →"}
                </button>
              </form>
            </>
          )}
          {session && (
            <button
              className="text-button signout"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const { error: e } = await api.supabase!.auth.signOut();
                  if (e) throw e;
                  setMine(null);
                  setAdmin(false);
                  setEditing(false);
                  setFocus(null);
                  setSelected(null);
                  setSent(false);
                  setCode("");
                })
              }
            >
              Cerrar sesión
            </button>
          )}
          {error && (
            <div className="feedback error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="feedback" role="status">
              {message}
            </div>
          )}
          <div className="search-box">
            <label htmlFor="search">¿Buscas a alguien?</label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  const r = await api.search(normalizeNick(query));
                  if (!r) {
                    setMessage("No encontramos ese nick en el atlas.");
                    return;
                  }
                  setFocus(r);
                  setSelected(r);
                });
              }}
            >
              <div className="search-input">
                <input
                  id="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Busca un nick…"
                  maxLength={25}
                />
                <button
                  aria-label="Buscar habitante"
                  disabled={busy || !api.configured}
                >
                  ↗
                </button>
              </div>
            </form>
          </div>
          <div className="founder-note">
            <span>✦</span>
            <p>
              Algún día diremos:
              <br />
              <strong>«Yo estaba cuando no había nada».</strong>
            </p>
          </div>
          {admin && (
            <section className="admin-panel">
              <h3>Panel del creador</h3>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editing}
                  onChange={(e) => setEditing(e.target.checked)}
                />{" "}
                Colocar en el mapa
              </label>
              {editing && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      const { error: e } = await api
                        .supabase!.from("world_objects")
                        .insert({ kind, name: objectName.trim(), ...point });
                      if (e) throw e;
                      setObjectName("");
                      await sync();
                      setMessage("Construcción guardada en el mundo.");
                    });
                  }}
                >
                  <label htmlFor="object-kind">Construcción</label>
                  <select
                    id="object-kind"
                    value={kind}
                    onChange={(e) =>
                      setKind(e.target.value as WorldObject["kind"])
                    }
                  >
                    {[
                      ["house", "Casa"],
                      ["tree", "Árbol"],
                      ["farm", "Cultivos"],
                      ["port", "Puerto"],
                      ["road", "Camino"],
                      ["flag", "Bandera"],
                    ].map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="object-name">Nombre</label>
                  <input
                    id="object-name"
                    value={objectName}
                    onChange={(e) => setObjectName(e.target.value)}
                    maxLength={60}
                    required
                  />
                  <p className="fineprint">
                    Posición: {point.x}, {point.y}. Pulsa en el mapa para
                    cambiarla.
                  </p>
                  <button className="primary" disabled={busy}>
                    Guardar construcción
                  </button>
                </form>
              )}
              <p className="fineprint">
                Las modificaciones quedan registradas en el historial privado de
                Supabase.
              </p>
            </section>
          )}
          {mine && (
            <details className="account-controls">
              <summary>Gestionar mi presencia</summary>
              <p className="fineprint">
                Retira tu nick y personaje del mapa. La parcela quedará libre.
                Tu cuenta de acceso seguirá existiendo.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={removeConfirm}
                  onChange={(e) => setRemoveConfirm(e.target.checked)}
                />{" "}
                Quiero retirar mi personaje
              </label>
              <button
                className="secondary"
                disabled={!removeConfirm || busy}
                onClick={() =>
                  void act(async () => {
                    const { error: e } =
                      await api.supabase!.rpc("remove_my_resident");
                    if (e) throw e;
                    setMine(null);
                    setFocus(null);
                    setSelected(null);
                    setRemoveConfirm(false);
                    await sync();
                    await loadBounds(bounds.current);
                    setMessage("Tu personaje ya no aparece en el mapa.");
                  })
                }
              >
                Retirar mi personaje
              </button>
            </details>
          )}
        </aside>
      </div>
      <footer id="reglas">
        <div className="footer-brand">
          NACIÓN CERO <span>Un país hecho por su gente.</span>
        </div>
        <p>
          Parcelas simbólicas, sin propiedad ni valor económico. Registro por
          correo: no acredita la identidad en TikTok ni que sigas la cuenta. Los
          habitantes del mapa y los seguidores de TikTok se cuentan por
          separado.
        </p>
        <p>
          Nick y personaje son públicos. El correo queda en Supabase Auth.
          Puedes retirar tu personaje desde tu sesión; para eliminar la cuenta
          completa, contacta con el creador en{" "}
          <a href={api.tiktokUrl} target="_blank" rel="noreferrer">
            @Nuevopaisdeseguidores
          </a>
          .
        </p>
      </footer>
    </>
  );
}
