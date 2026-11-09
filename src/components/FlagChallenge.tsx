import { OFFICIAL_FLAG } from "../lib/nation.ts";

const candidates = [
  {
    id: 1,
    name: "El León Fundador",
    colors: "Oro y carmesí",
    image: "bandera_1_leon_v2.png",
    winner: true,
  },
  {
    id: 2,
    name: "La Cruz Naval",
    colors: "Azul marino y blanco",
    image: "bandera_2_naval.png",
    winner: false,
  },
  {
    id: 3,
    name: "El Sol de Bahía",
    colors: "Verde y dorado",
    image: "bandera_3_sol.png",
    winner: false,
  },
];

export function FlagChallenge() {
  return (
    <section
      className="flag-challenge"
      id="bandera"
      aria-labelledby="flag-title"
    >
      <div className="flag-winner-banner">
        <span className="eyebrow">RESULTADO OFICIAL DE LA COMUNIDAD</span>
        <h2 id="flag-title">¡Hispania ya tiene Bandera Oficial!</h2>
        <p>
          Por abrumadora mayoría en los comentarios del Día 6, la opción
          ganadora es <strong>Opción 1 · {OFFICIAL_FLAG.name}</strong> ({OFFICIAL_FLAG.colors}).
          Ya ha sido plantada en lo más alto de la isla en un mástil monumental
          y flamea continuamente sobre todo el territorio.
        </p>
      </div>

      <div className="flag-candidates">
        {candidates.map((c) => (
          <article
            key={c.id}
            className={c.winner ? "flag-candidate winner" : "flag-candidate"}
          >
            {c.winner && <span className="winner-badge">🏆 GANADORA OFICIAL</span>}
            <img
              src={`/flags/${c.image}`}
              alt={`Propuesta ${c.id}: ${c.name}, ${c.colors}`}
              loading="lazy"
            />
            <h3>
              <span>{c.id}</span> {c.name}
            </h3>
            <p>{c.colors}</p>
            {c.winner ? (
              <span className="official-status">Plantada en la cumbre</span>
            ) : (
              <span className="archive-status">Propuesta histórica</span>
            )}
          </article>
        ))}
      </div>

      <div className="coastal-challenge">
        <span className="eyebrow">RETO COSTERO EN AUDITORÍA</span>
        <h3>Las 6 parcelas frente al mar</h3>
        <p>
          Estamos contabilizando y verificando los comentarios con más me gusta
          que indicaron su oficio y usuario en el vídeo del reto. Las 6 plazas
          ganadoras se publicarán y adjudicarán en el mapa interactivo.
        </p>
        <p className="comment-example">
          Bandera 1 · Pescador · @tu_usuario
        </p>
        <p>
          Las ubicaciones frente al mar se asignarán con prioridad a los
          primeros comentarios válidos más votados. Los registros y parcelas
          actuales de la comunidad se mantienen intactos.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "12px" }}>
          <a
            href="https://www.tiktok.com/@paisde.seguidores/video/7706121662197959958"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver comentarios del vídeo en TikTok ↗
          </a>
          <a href="#atlas-map" className="pill">
            Ver la bandera flameando en la cumbre ↗
          </a>
        </div>
      </div>
      <small>
        Bandera oficial proclamada por voluntad popular. Las propuestas enviadas por
        seguidores se conservan con su autoría en el inventario de la comunidad.
        Ninguna parcela previa ha sido modificada.
      </small>
    </section>
  );
}
