import { createClient } from "@supabase/supabase-js";
import type { Resident, District, Bounds, WorldObject } from "./types.ts";
const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const configured =
  !!url && !!key && !url.includes("TU-PROYECTO") && !key.includes("REEMPLAZAR");
export const supabase = configured ? createClient(url, key) : null;
export const registrationOpen =
  import.meta.env.VITE_REGISTRATION_OPEN === "true";
export const guestRegistrationOpen =
  import.meta.env.VITE_GUEST_REGISTRATION_OPEN !== "false";
export const tiktokUrl = "https://www.tiktok.com/@paisde.seguidores";
function client() {
  if (!supabase) throw new Error("Falta conectar Supabase.");
  return supabase;
}
export async function districts(): Promise<District[]> {
  const { data, error } = await client().rpc("atlas_districts");
  if (error) throw error;
  return data || [];
}
export async function slice(b: Bounds): Promise<Resident[]> {
  const { data, error } = await client().rpc("atlas_residents", {
    p_left: b.left,
    p_top: b.top,
    p_right: b.right,
    p_bottom: b.bottom,
  });
  if (error) throw error;
  return data || [];
}
export async function mine(): Promise<Resident | null> {
  const { data, error } = await client().rpc("my_resident");
  if (error) throw error;
  return data?.[0] || null;
}
export async function reserve(nick: string, avatar: number): Promise<Resident> {
  const { data, error } = await client().rpc("reserve_parcel", {
    p_nick: nick,
    p_avatar: avatar,
  });
  if (error) throw error;
  if (!data?.[0]) throw new Error("No se ha recibido la reserva.");
  return data[0];
}
export async function search(nick: string): Promise<Resident | null> {
  const { data, error } = await client().rpc("find_resident", { p_nick: nick });
  if (error) throw error;
  return data?.[0] || null;
}
export async function objects(): Promise<WorldObject[]> {
  const { data, error } = await client()
    .from("world_objects")
    .select("id,kind,name,x,y")
    .order("created_at")
    .limit(500);
  if (error) throw error;
  return data || [];
}
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await client().rpc("is_atlas_admin");
  if (error) throw error;
  return data === true;
}
export function friendlyError(error: unknown) {
  const text =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "No se ha podido completar la acción.";
  if (/rate limit|too many|over_email_send_rate_limit/i.test(text))
    return "Demasiados intentos. Espera un momento antes de solicitar otro código.";
  if (/expired|invalid.*token|token.*invalid/i.test(text))
    return "El código ha caducado o no es válido. Solicita otro.";
  if (/fetch|network/i.test(text))
    return "No hay conexión con el atlas. Inténtalo de nuevo.";
  if (/anonymous.*disabled|anonymous_provider_disabled/i.test(text))
    return "El acceso de invitados se está activando. Vuelve a intentarlo en unos minutos.";
  if (/already.*registered|already.*exists|email_exists/i.test(text))
    return "Ese correo ya está vinculado a otra cuenta. No se ha cambiado la reserva de este navegador.";
  if (
    /Could not find the function|schema cache|relation.*does not exist/i.test(
      text,
    )
  )
    return "Estamos preparando el atlas. El registro se abrirá pronto.";
  return text;
}
