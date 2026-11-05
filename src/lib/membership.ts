import type { SupabaseClient } from "@supabase/supabase-js";
type Auth = SupabaseClient["auth"];

/** Reutilizar la identidad actual: reintentar nunca debe crear otra parcela. */
export async function enterAsGuest(auth: Auth) {
  const current = await auth.getSession();
  if (current.error) throw current.error;
  if (current.data.session) return current.data.session.user;
  const result = await auth.signInAnonymously();
  if (result.error) throw result.error;
  if (!result.data.user || !result.data.session)
    throw new Error("No se ha podido guardar tu sesión. Inténtalo de nuevo.");
  return result.data.user;
}

/** Añadir email a esta identidad; nunca iniciar sesión en otra por coincidencia de nick. */
export async function attachEmail(auth: Auth, email: string) {
  const current = await auth.getUser();
  if (current.error) throw current.error;
  if (!current.data.user?.is_anonymous)
    throw new Error("Esta sesión ya tiene un método de acceso.");
  const result = await auth.updateUser({ email: email.trim() });
  if (result.error) throw result.error;
  if (result.data.user?.id !== current.data.user.id)
    throw new Error("No se ha podido vincular el correo a esta parcela.");
  return current.data.user.id;
}

export async function verifyAttachedEmail(
  auth: Auth,
  email: string,
  token: string,
  ownerId: string,
) {
  const current = await auth.getUser();
  if (current.error) throw current.error;
  if (current.data.user?.id !== ownerId)
    throw new Error(
      "La sesión ha cambiado. Vuelve a solicitar el código desde tu parcela.",
    );
  const result = await auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email_change",
  });
  if (result.error) throw result.error;
  if (result.data.user?.id !== ownerId)
    throw new Error("No se ha confirmado el correo de esta parcela.");
  return result.data.user;
}
