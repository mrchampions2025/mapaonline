import { supabase } from "./api.ts";
import { enterAsGuest } from "./membership.ts";
export type AnimalInventory = {
  animals: { code: string; discovered_at: string }[];
};
export async function adventureInventory(): Promise<AnimalInventory> {
  if (!supabase) throw Error("Sin conexión con tu inventario.");
  const { data, error } = await supabase.rpc("adventure_inventory");
  if (error) throw error;
  return data;
}
export async function discoverAnimal(code: string): Promise<AnimalInventory> {
  if (!supabase)
    throw Error("Sin conexión. El descubrimiento aún no se ha guardado.");
  await enterAsGuest(supabase.auth);
  const { data, error } = await supabase.rpc("discover_animal", {
    p_code: code,
  });
  if (error) throw error;
  return data;
}
