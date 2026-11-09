import { CAPITAL_ZONES } from "./lib/zones.ts";
import {
  createAdventure,
  setAdventureAction,
  saveAdventure,
  HIDDEN_ANIMALS,
} from "./lib/adventure.ts";
import { adventureInventory, discoverAnimal } from "./lib/adventure-api.ts";
import { IDLE, type PlayerAction } from "./lib/player.ts";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import type { Session } from "@supabase/supabase-js";
const Atlas = lazy(() =>
  import("./components/Atlas.tsx").then((m) => ({ default: m.Atlas })),
);
import { Membership } from "./components/Membership.tsx";
import { CommunityRequests } from "./components/CommunityRequests.tsx";
import { FlagChallenge } from "./components/FlagChallenge.tsx";
import type { Activity } from "./components/HarborGame.tsx";
const HarborGame = lazy(() =>
  import("./components/HarborGame.tsx").then((m) => ({
    default: m.HarborGame,
  })),
);
import {
  harborStatus,
  HARBOR,
  FOREST,
  SHIP,
  type HarborStatus,
} from "./lib/harbor.ts";
import * as api from "./lib/api.ts";
import {
  AVATARS,
  DISTRICT_NAMES,
  districtPosition,
  normalizeNick,
} from "./lib/world.ts";
import type { Bounds, District, Resident, WorldObject } from "./lib/types.ts";
import { FIRST_MARKET, NATION } from "./lib/nation.ts";
import { TIKTOK_AUDIENCE } from "./lib/community.ts";
const emptyDistricts: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: i + 1,
  name,
  ...districtPosition(i + 1),
  residents: 0,
  capacity: 1024,
}));
const isGameRoute = () => !location.hash || location.hash === "#jugar";
export function App() {
  const [playing, setPlaying] = useState(isGameRoute);
  const [activity, setActivity] = useState<Activity>("explore");
  const [activityOpen, setActivityOpen] = useState(false),
    [gameMenu, setGameMenu] = useState(false);
  const [harbor, setHarbor] = useState<HarborStatus | null>(null),
    [harborError, setHarborError] = useState("");
  const adventureRef = useRef<ReturnType<typeof createAdventure> | null>(null);
  if (!adventureRef.current) adventureRef.current = createAdventure();
  const adventure = adventureRef.current;
  const inventoryGeneration = useRef(0);
  const updateAction = useCallback((a: PlayerAction) => {
    setAdventureAction(adventureRef.current!, a);
  }, []);
  const discover = useCallback(async (code: string) => {
    const state = adventureRef.current!;
    if (
      state.pending.has(code) ||
      state.found.has(code) ||
      (state.retryAt.get(code) ?? 0) > Date.now()
    )
      return;
    const generation = inventoryGeneration.current;
    state.pending.add(code);
    try {
      const inv = await discoverAnimal(code);
      if (generation !== inventoryGeneration.current) return;
      for (const a of inv.animals) state.found.add(a.code);
      state.error = "";
      state.notice =
        "¡Descubrimiento guardado! " +
        (HIDDEN_ANIMALS.find((a) => a.code === code)?.name ?? "Nueva especie") +
        ".";
    } catch {
      state.retryAt.set(code, Date.now() + 10000);
      state.error =
        "No se ha guardado el descubrimiento. Volveremos a intentarlo al acercarte.";
    } finally {
      state.pending.delete(code);
    }
  }, []);
  useEffect(() => {
    if (!playing) return;
    const save = setInterval(() => saveAdventure(adventure), 3000);
    const stop = () => {
      adventure.input = { x: 0, y: 0 };
      saveAdventure(adventure);
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      clearInterval(save);
      stop();
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
    };
  }, [playing, adventure]);
  const [destination, setDestination] = useState<{
    x: number;
    y: number;
    zoom: number;
    nonce: number;
  } | null>(null);
  const gameFrame = useRef<HTMLDivElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  const refreshHarbor = useCallback(async () => {
    try {
      setHarbor(await harborStatus());
      setHarborError("");
    } catch {
      setHarborError(
        "No se ha podido conectar con la obra. Reintenta en unos momentos.",
      );
    }
  }, []);
  const visitActivity = useCallback((a: Activity) => {
    setActivity(a);
    setGameMenu(false);
    setActivityOpen(a !== "explore");
    const state = adventureRef.current!;
    state.input = { x: 0, y: 0 };
    state.notice = "";
    state.follow = true;
    // Activity tabs never teleport the player or force a new zoom level.
  }, []);
  function openGame(r?: Resident) {
    setMessage("");
    setError("");
    returnFocus.current = document.activeElement as HTMLElement;
    setActivityOpen(false);
    setGameMenu(false);
    setPlaying(true);
    if (location.hash !== "#jugar") history.pushState(null, "", "#jugar");
    if (r) {
      setFocus({ ...r });
      setSelected(r);
    }
  }
  function closeGame() {
    adventure.input = { x: 0, y: 0 };
    setGameMenu(false);
    setActivityOpen(false);
    setPlaying(false);
    if (isGameRoute())
      history.replaceState(
        null,
        "",
        location.pathname + location.search + "#inicio",
      );
    requestAnimationFrame(() => returnFocus.current?.focus());
  }
  useEffect(() => {
    void refreshHarbor();
    const timer = setInterval(() => {
      if (!document.hidden) void refreshHarbor();
    }, 30000);
    return () => clearInterval(timer);
  }, [refreshHarbor]);
  useEffect(() => {
    const pop = () => setPlaying(isGameRoute());
    window.addEventListener("popstate", pop);
    window.addEventListener("hashchange", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("hashchange", pop);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    gameFrame.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = old;
    };
  }, [playing]);
  const [session, setSession] = useState<Session | null>(null),
    [loadingSession, setLoadingSession] = useState(api.configured);
  useEffect(() => {
    const generation = ++inventoryGeneration.current;
    adventure.found.clear();
    if (!playing) return;
    adventureInventory()
      .then((inv) => {
        if (generation === inventoryGeneration.current) {
          for (const a of inv.animals) adventure.found.add(a.code);
          adventure.error = "";
        }
      })
      .catch(() => {
        if (generation === inventoryGeneration.current)
          adventure.error =
            "No se ha podido cargar el inventario. Puedes seguir explorando.";
      });
  }, [playing, session?.user.id, adventure]);
  const [districts, setDistricts] = useState(emptyDistricts),
    [residents, setResidents] = useState<Resident[]>([]),
    [objects, setObjects] = useState<WorldObject[]>([]);
  const [directory, setDirectory] = useState<Resident[]>([]);
  const [directoryMore, setDirectoryMore] = useState(false);
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
      const [d, o, roster] = await Promise.all([
        api.districts(),
        api.objects(),
        api.directory(),
      ]);
      setDistricts(d);
      setObjects(o);
      setDirectory(roster);
      setDirectoryMore(roster.length === 100);
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
  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function openMembership() {
    scrollToSection("mi-lugar");
    document.getElementById("member-nick")?.focus({ preventScroll: true });
  }
  function showMyPlace(resident: Resident) {
    openGame(resident);
  }
  const total = districts.reduce((n, d) => n + Number(d.residents), 0),
    capacity = districts.reduce((n, d) => n + Number(d.capacity), 0);
  const shownResidents = [...residents];
  for (const r of [mine, focus])
    if (r && !shownResidents.some((x) => x.id === r.id)) shownResidents.push(r);
  return (
    <>
      <header className="header">
        <a href="/" className="brand" aria-label={`${NATION.name}, inicio`}>
          <span className="logo">H</span>
          <span>
            <b>{NATION.name.toLocaleUpperCase("es")}</b>
            <small>EL PAÍS DE LOS SEGUIDORES</small>
          </span>
        </a>
        <nav>
          <button className="header-play" onClick={() => openGame()}>
            Ver mapa / Jugar
          </button>
          <a href={api.tiktokUrl} target="_blank" rel="noopener noreferrer">
            TikTok oficial <span>↗</span>
          </a>
          <button
            className="header-join"
            onClick={openMembership}
            aria-controls="mi-lugar"
          >
            {mine ? "Mi parcela ↗" : "Crear mi lugar ↗"}
          </button>
          <a className="pill" href="#bandera">
            BANDERA Y COSTA ↘
          </a>
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
        <aside>
          <section
            className="join-card"
            id="mi-lugar"
            aria-label="Consigue tu parcela"
          >
            <div className="sidebar-label">
              {mine ? "TU PASAPORTE FUNDADOR" : "TU PARCELA EMPIEZA AQUÍ"}{" "}
              <span>↘</span>
            </div>
            <div className="play-entry">
              <button className="primary" onClick={() => openGame()}>
                Ver mapa / Jugar →
              </button>
              <p>
                Explora, recoge madera y navega. Puedes entrar como visitante.
              </p>
            </div>
            <Membership
              session={session}
              resident={mine}
              loading={loadingSession}
              connected={connected}
              full={total >= capacity}
              onLocate={showMyPlace}
              onReserved={async (r) => {
                setMine(r);
                await sync();
                showMyPlace(r);
                await loadBounds(bounds.current);
              }}
            />
          </section>
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
        <main>
          <div className="intro">
            <div>
              <p className="eyebrow">
                UN PERSONAJE. UNA PARCELA. UNA HISTORIA.
              </p>
              <h1>
                Tu historia empieza
                <br />
                en <em>{NATION.name}.</em>
              </h1>
              <p className="lead">
                Nuestra capital es {NATION.capital}.
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
          <div className="world-stats" id="atlas-map">
            <span>
              <b>{connected ? total.toLocaleString("es-ES") : "—"}</b>{" "}
              {total === 1 ? "vecino en el mapa" : "vecinos en el mapa"}
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
          <div
            ref={gameFrame}
            className={playing ? "game-frame playing" : "game-frame"}
            role={playing ? "dialog" : undefined}
            aria-modal={playing || undefined}
            aria-label={playing ? "Jugar en Hispania" : undefined}
            onKeyDown={(e) => {
              if (!playing) return;
              if (e.key === "Escape") {
                e.preventDefault();
                if (gameMenu) setGameMenu(false);
                else if (activityOpen) setActivityOpen(false);
                else closeGame();
              }
              if (e.key === "Tab") {
                const nodes = [
                  ...e.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled),input,canvas",
                  ),
                ].filter((n) => n.getClientRects().length);
                const first = nodes[0],
                  last = nodes.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            {playing && (
              <header className="game-topbar">
                <button onClick={closeGame} aria-label="Salir del modo juego">
                  ←
                </button>
                <button
                  onClick={() => {
                    setGameMenu((v) => !v);
                    setActivityOpen(false);
                    adventure.input = { x: 0, y: 0 };
                  }}
                  aria-label={
                    gameMenu ? "Cerrar menú del juego" : "Abrir menú del juego"
                  }
                  aria-expanded={gameMenu}
                >
                  {gameMenu ? "×" : "☰"}
                </button>
              </header>
            )}
            {playing && gameMenu && (
              <section className="game-menu" aria-label="Menú del juego">
                <h2>Hispania</h2>
                <p>
                  {connected ? `${total} vecinos en el mapa` : "Conectando…"}
                </p>
                <form
                  className="game-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      const r = await api.search(normalizeNick(query));
                      if (r) {
                        setFocus({ ...r });
                        setSelected(r);
                        setActivity("explore");
                        setActivityOpen(false);
                        setGameMenu(false);
                      } else setMessage("No encontramos ese nick.");
                    });
                  }}
                >
                  <input
                    aria-label="Buscar nick en el juego"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Busca tu nick o el de un vecino"
                    maxLength={25}
                  />
                  <button disabled={busy}>Buscar</button>
                  {(message || error) && (
                    <span role="status">{message || error}</span>
                  )}
                </form>
                <div className="game-menu-zones">
                  <button
                    onClick={() => {
                      setDestination({
                        ...CAPITAL_ZONES[0],
                        zoom: 5,
                        nonce: Date.now(),
                      });
                      setGameMenu(false);
                    }}
                  >
                    Capital · Bahía del Sol
                  </button>
                  <button
                    onClick={() => {
                      setDestination({
                        ...CAPITAL_ZONES[1],
                        zoom: 5,
                        nonce: Date.now(),
                      });
                      setGameMenu(false);
                    }}
                  >
                    Zona B · Valle Verde
                  </button>
                  <button
                    onClick={() => {
                      setDestination({
                        ...FIRST_MARKET,
                        zoom: 6,
                        nonce: Date.now(),
                      });
                      setGameMenu(false);
                    }}
                  >
                    Patatas de @maravaf
                  </button>
                  <button
                    onClick={() => {
                      closeGame();
                      openMembership();
                    }}
                  >
                    {mine ? "Mi lugar" : "Crear mi nick"}
                  </button>
                </div>
                <p className="menu-help">
                  Flechas o WASD para moverte. Toca el suelo para caminar.
                  Arrastra para mirar y pellizca para acercarte.
                </p>
              </section>
            )}
            <Suspense
              fallback={
                <div className="atlas game-loading" role="status">
                  Cargando el mapa…
                </div>
              }
            >
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
                gameMode={playing}
                activityOpen={activityOpen}
                destination={destination}
                deliveries={harbor?.deliveries ?? 0}
                playerNick={mine?.nick ?? "Anónimo"}
                playerAvatar={mine?.avatar}
                adventure={playing ? adventure : undefined}
                onDiscover={discover}
                onActivity={(a) => {
                  if (!playing) openGame();
                  visitActivity(a);
                }}
              />
            </Suspense>
            {playing && selected && (
              <div className="game-resident">
                <strong>@{selected.nick}</strong>
                <span>F-{String(selected.parcel_id).padStart(4, "0")}</span>
                <button
                  aria-label="Cerrar vecino seleccionado"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              </div>
            )}
            {playing && (
              <Suspense
                fallback={
                  <div className="explore-hint" role="status">
                    Abriendo actividades…
                  </div>
                }
              >
                <HarborGame
                  activity={activity}
                  panelOpen={activityOpen}
                  onPanelOpen={setActivityOpen}
                  onActivity={(a) => {
                    setGameMenu(false);
                    visitActivity(a);
                  }}
                  status={harbor}
                  error={harborError}
                  onStatus={setHarbor}
                  adventure={adventure}
                  onAction={updateAction}
                  nick={mine?.nick}
                />
              </Suspense>
            )}
          </div>
          <section
            className="nation-news"
            aria-label="Lo que está pasando en Hispania"
          >
            <div className="community-counts">
              <span className="eyebrow">NUESTRA COMUNIDAD SIGUE CRECIENDO</span>
              <p>
                <strong>{TIKTOK_AUDIENCE.followers}</strong> seguidores en
                TikTok · <strong>{connected ? total : "—"}</strong> vecinos con
                parcela
              </p>
              <small>
                Seguidores: lectura del {TIKTOK_AUDIENCE.checkedLabel}. El mapa
                cuenta los nicks incorporados desde TikTok y los registros de la
                web. Son dos cifras distintas; no se suman.
              </small>
            </div>
            <div className="nation-result">
              <span className="eyebrow">VOTACIÓN FINALIZADA</span>
              <p>
                <strong>{NATION.name}</strong> ya tiene capital:{" "}
                <strong>{NATION.capital}</strong>.
              </p>
              <small>
                Nombre elegido entre vuestros comentarios · Capital: opción A,{" "}
                {NATION.capitalPollPercent} % en la encuesta comunicada por el
                creador.
              </small>
            </div>
            {objects.some((o) => o.id === FIRST_MARKET.id) && (
              <article className="first-business">
                <span className="eyebrow">
                  PRIMER NEGOCIO DEL MAPA · CONSTRUIDO
                </span>
                <h2>Patatas de @maravaf.</h2>
                <p>
                  Un comentario se convirtió en este puesto de la capital. Sus
                  capibaras ya te esperan en el mapa.
                </p>
                <small>
                  Espacio común de {NATION.capital} · Idea de @maravaf. Tu
                  parcela conserva su lugar.
                </small>
              </article>
            )}
            <div className="community-goal">
              <span className="eyebrow">NUESTRA PRÓXIMA META</span>
              <p>
                <strong>{connected ? total : "—"}</strong> /{" "}
                {NATION.communityGoal} vecinos
              </p>
              <progress
                value={connected ? Math.min(total, NATION.communityGoal) : 0}
                max={NATION.communityGoal}
                aria-label={`Progreso hacia ${NATION.communityGoal} vecinos`}
              />
              <small>
                {connected && total >= NATION.communityGoal
                  ? "¡Meta alcanzada! Seguimos construyendo juntos."
                  : connected
                    ? `Faltan ${Math.max(0, NATION.communityGoal - total)} para llegar a ${NATION.communityGoal}. Invita a tu futuro vecino.`
                    : "Conectando con el mapa."}{" "}
                Las parcelas siguen abiertas.
              </small>
            </div>
          </section>
          <FlagChallenge />
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
                  {selected.origin === "comment"
                    ? " Añadido desde TikTok"
                    : " Registro desde la web"}
                  {selected.alias ? ` · ${selected.alias}` : ""}
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
          <section
            className="community-directory"
            aria-label="Vecinos de la comunidad"
          >
            <p className="eyebrow">LA COMUNIDAD YA TIENE NOMBRES</p>
            <h2>Encuentra a tus vecinos.</h2>
            <p className="muted">
              Quienes se apuntan en la web y quienes incorporamos desde TikTok
              comparten este mapa. Pulsa un nick para ver su muñeco y su
              parcela.
            </p>
            <ul>
              {directory.map((r) => (
                <li key={r.id}>
                  <button onClick={() => showMyPlace(r)}>
                    <span
                      className="avatar-dot"
                      style={{ background: AVATARS[r.avatar].color }}
                    />
                    <span>
                      <strong>@{r.nick}</strong>
                      <small>
                        F-{String(r.parcel_id).padStart(4, "0")} ·{" "}
                        {r.origin === "comment"
                          ? "Desde TikTok"
                          : "Desde la web"}
                      </small>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </li>
              ))}
            </ul>
            {directoryMore && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const more = await api.directory(
                      directory.at(-1)?.parcel_id || 0,
                    );
                    setDirectory((previous) => [
                      ...previous,
                      ...more.filter(
                        (r) => !previous.some((p) => p.id === r.id),
                      ),
                    ]);
                    setDirectoryMore(more.length === 100);
                  })
                }
              >
                Ver más vecinos
              </button>
            )}
          </section>
          <CommunityRequests />
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
      </div>
      <footer id="reglas">
        <div className="footer-brand">
          {NATION.name.toLocaleUpperCase("es")}{" "}
          <span>Un país hecho por su gente.</span>
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
            @paisde.seguidores
          </a>
          .
        </p>
      </footer>
    </>
  );
}
