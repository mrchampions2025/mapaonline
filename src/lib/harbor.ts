import { supabase } from "./api.ts";
import { enterAsGuest } from "./membership.ts";
export type HarborStatus = {
  deliveries: number;
  goal: number;
  next_at: string | null;
  my_deliveries: number;
};
export { HARBOR, FOREST, SHIP } from "./player.ts";
export async function harborStatus(): Promise<HarborStatus> {
  if (!supabase) throw Error("El juego necesita conectar con el atlas.");
  const { data, error } = await supabase.rpc("harbor_status");
  if (error) throw error;
  return data;
}
export async function startWork(): Promise<{
  token: string;
  started_at: string;
}> {
  if (!supabase) throw Error("El juego necesita conectar con el atlas.");
  await enterAsGuest(supabase.auth);
  const { data, error } = await supabase.rpc("start_harbor_work");
  if (error) throw error;
  return data;
}
export async function finishWork(token: string): Promise<HarborStatus> {
  if (!supabase) throw Error("Sin conexión. Tu entrega no se ha confirmado.");
  const { data, error } = await supabase.rpc("finish_harbor_work", {
    p_token: token,
  });
  if (error) throw error;
  return data;
}
