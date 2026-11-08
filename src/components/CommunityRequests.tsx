import { useState } from "react";
import requests from "../data/community-requests.json";

export function CommunityRequests() {
  const [group, setGroup] = useState("Todas");
  const groups = ["Todas", ...new Set(requests.map((r) => r.group))];
  const visible = requests.filter((r) => group === "Todas" || r.group === group);
  return <section className="community-requests" id="peticiones" aria-labelledby="requests-title">
    <p className="eyebrow">VUESTRAS IDEAS TAMBIÉN SON PARTE DEL PAÍS</p>
    <h2 id="requests-title">Peticiones con nombre y siguiente paso.</h2>
    <p>{requests.length} peticiones registradas de {new Set(requests.map((r) => r.author)).size} autores. Puedes consultar qué está construido y qué sigue como propuesta.</p>
    <label htmlFor="request-group">Ver por tema</label>
    <select id="request-group" value={group} onChange={(e) => setGroup(e.target.value)}>
      {groups.map((g) => <option key={g}>{g}</option>)}
    </select>
    <details>
      <summary>Ver {visible.length} peticiones · autores, estado y propuesta</summary>
      <ul className="requests-grid">
        {visible.map((r) => <li key={r.id}>
          <span className={`request-status ${r.status === "Construido" || r.status === "Aplicado" ? "done" : ""}`}>{r.status}</span>
          <h3>{r.title}</h3>
          <strong>@{r.author}</strong>
          <p>{r.nextStep}</p>
          <a href={r.source} target="_blank" rel="noopener noreferrer">Vídeo de la petición ↗</a>
        </li>)}
      </ul>
    </details>
    <small>Inventario de las lecturas públicas disponibles. Una propuesta registrada espera diseño, ubicación o decisión común antes de convertirse en una obra del mapa.</small>
  </section>;
}
