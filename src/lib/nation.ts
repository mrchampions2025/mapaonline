import { project } from "./world.ts";

export const NATION = {
  name: "Hispania",
  capital: "Bahía del Sol",
  capitalOption: "A",
  capitalPollPercent: 70,
  communityGoal: 500,
} as const;

// Approved first common building. No resident is moved or given extra parcels.
export const FIRST_MARKET = {
  id: "d491ce93-0b9c-4e6a-b410-6216c7d9fb37",
  name: "Patatas de @maravaf",
  author: "maravaf",
  ...project(38, 28),
} as const;

export const OFFICIAL_FLAG = {
  id: 1,
  name: "El León Fundador",
  colors: "Oro y carmesí",
  image: "bandera_1_leon_v2.png",
  proclamation: "Ganadora por voto popular de la comunidad en el Día 6.",
  status: "Oficial",
} as const;

// Plantada en lo más alto de Hispania: Cumbre Fundadora (elevación máxima ~102)
export const SUMMIT_FLAGPOLE = {
  id: "mastil-cumbre-fundadora",
  name: "Mástil de la Cumbre Fundadora",
  flagName: "El León Fundador",
  ...project(26.8, 15.0),
} as const;
