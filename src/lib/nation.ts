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
