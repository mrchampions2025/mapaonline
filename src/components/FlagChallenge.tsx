const candidates = [
  { id: 1, name: "El León Fundador", colors: "Oro y carmesí", image: "bandera_1_leon_v2.png" },
  { id: 2, name: "La Cruz Naval", colors: "Azul marino y blanco", image: "bandera_2_naval.png" },
  { id: 3, name: "El Sol de Bahía", colors: "Verde y dorado", image: "bandera_3_sol.png" },
];

export function FlagChallenge() {
  return <section className="flag-challenge" id="bandera" aria-labelledby="flag-title">
    <p className="eyebrow">DÍA 6 · ELIGE NUESTRA BANDERA Y TU OFICIO</p>
    <h2 id="flag-title">Tres banderas. Seis plazas en la costa.</h2>
    <p>Compara las propuestas del capítulo. La ganadora será la bandera de Hispania cuando cerremos y comprobemos los votos.</p>
    <div className="flag-candidates">
      {candidates.map((c) => <article key={c.id}>
        <img src={`/flags/${c.image}`} alt={`Propuesta ${c.id}: ${c.name}, ${c.colors}`} loading="lazy" />
        <h3><span>{c.id}</span> {c.name}</h3>
        <p>{c.colors}</p>
      </article>)}
    </div>
    <div className="coastal-challenge">
      <span className="eyebrow">6 PLAZAS DEL RETO COSTERO</span>
      <h3>¿Quieres tu casa frente al mar?</h3>
      <p>Cuando se publique el vídeo del reto, comenta tu número de bandera, oficio y nick. Ejemplo:</p>
      <p className="comment-example">Bandera 2 · Tabernero · @tu_usuario</p>
      <p>Los seis comentarios válidos con más me gusta al cierre ganarán una parcela costera simbólica, una por cuenta. El reto y la elección de bandera cierran <strong>24 horas después de publicar el capítulo</strong>.</p>
      <a href="https://www.tiktok.com/@paisde.seguidores" target="_blank" rel="noopener noreferrer">Ir al TikTok oficial ↗</a>
      <details>
        <summary>Cómo se cuentan los votos y las seis plazas</summary>
        <ul>
          <li>La participación se realiza en el vídeo de este reto; esta galería no registra votos.</li>
          <li>Un voto de bandera por cuenta: 1, 2 o 3. Para optar a la costa, incluye también un oficio y tu nick. Se admite cualquier oficio apropiado para la historia; los del vídeo son ejemplos.</li>
          <li>Para el premio se toma el primer comentario válido de cada autor real de TikTok. No se suman los me gusta de varios comentarios de una misma cuenta.</li>
          <li>El orden se decide por los me gusta comprobados al cierre. En caso de empate, tendrá prioridad el comentario válido más antiguo que podamos verificar.</li>
          <li>Las seis plazas pertenecen a este reto. Las ubicaciones de las casas del vídeo son una maqueta; se concretarán y asignarán tras verificar los ganadores. Los registros actuales se conservan durante el proceso.</li>
          <li>Son lugares virtuales y simbólicos del proyecto, sin pago de entrada ni propiedad inmobiliaria real.</li>
        </ul>
      </details>
    </div>
    <small>Tres propuestas basadas en la referencia elegida por el creador; el emblema del León Fundador se ha rediseñado para esta edición. Todavía no hay una bandera oficial ni ganadores asignados. Las propuestas anteriores de seguidores se conservan con su autoría en el inventario.</small>
  </section>;
}
