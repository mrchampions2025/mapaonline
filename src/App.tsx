import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Atlas } from "./components/Atlas.tsx";
import { Membership } from "./components/Membership.tsx";
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
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
          setMine((previous) => r ?? previous);
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
        !api.guestRegistrationOpen && (
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
          <Membership
            session={session}
            resident={mine}
            loading={loadingSession}
            connected={connected}
            full={total >= capacity}
            onLocate={(r) => {
              setFocus({ ...r });
              setSelected(r);
            }}
            onReserved={async (r) => {
              setMine(r);
              setFocus(r);
              setSelected(r);
              await sync();
              await loadBounds(bounds.current);
            }}
          />
          {session && !session.user.is_anonymous && (
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
          Parcelas simbólicas, sin propiedad ni valor económico. El nick es
          declarado: no acredita la identidad en TikTok ni que sigas la cuenta.
          Los habitantes del mapa y los seguidores de TikTok se cuentan por
          separado.
        </p>
        <p>
          Nick y personaje son públicos. Sin correo, el acceso depende de la
          sesión de este navegador. El correo es opcional y no se publica.
          Puedes retirar tu personaje desde tu sesión; para eliminar la cuenta
          completa, contacta con el creador en{" "}
          <a href={api.tiktokUrl} target="_blank" rel="noreferrer">
            @naciondeseguidores
          </a>
          .
        </p>
      </footer>
    </>
  );
}
