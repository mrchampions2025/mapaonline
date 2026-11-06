import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as api from "../lib/api.ts";
import {
  attachEmail,
  enterAsGuest,
  verifyAttachedEmail,
} from "../lib/membership.ts";
import { AVATARS, DISTRICT_NAMES, normalizeNick } from "../lib/world.ts";
import type { Resident } from "../lib/types.ts";

type Props = {
  session: Session | null;
  resident: Resident | null;
  loading: boolean;
  connected: boolean;
  full: boolean;
  onReserved: (resident: Resident) => Promise<void>;
  onLocate: (resident: Resident) => void;
};

export function Membership({
  session,
  resident,
  loading,
  connected,
  full,
  onReserved,
  onLocate,
}: Props) {
  const [nick, setNick] = useState(""),
    [avatar, setAvatar] = useState(0);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState("");
  const [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const linkOwner = useRef<string | null>(null),
    submitting = useRef(false);
  const secured =
    !!session?.user.email_confirmed_at && !session.user.is_anonymous;
  useEffect(() => {
    setSent(false);
    setCode("");
    setError("");
    setNotice("");
    linkOwner.current = null;
  }, [session?.user.id]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function run(action: () => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(api.friendlyError(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function sendEmail() {
    if (!api.registrationOpen || !api.supabase) return;
    if (resident && session?.user.is_anonymous) {
      linkOwner.current = await attachEmail(api.supabase.auth, email);
    } else {
      const { error } = await api.supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
    }
    setSent(true);
    setCooldown(60);
    setNotice(
      "Revisa tu correo e introduce el código. Hasta confirmarlo, tu lugar sigue sin protección por correo.",
    );
  }
  async function verifyEmail() {
    if (!api.supabase || !api.registrationOpen) return;
    if (resident && session?.user.is_anonymous) {
      if (!linkOwner.current)
        throw new Error("Solicita un código desde esta parcela.");
      await verifyAttachedEmail(
        api.supabase.auth,
        email,
        code,
        linkOwner.current,
      );
      setNotice("Correo confirmado. Tu personaje conserva la misma parcela.");
    } else {
      const { error } = await api.supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) throw error;
      setNotice("Has recuperado tu cuenta.");
    }
    setSent(false);
    setCode("");
  }
  function emailForm() {
    return (
      <>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (api.registrationOpen) void run(sent ? verifyEmail : sendEmail);
          }}
        >
          <label htmlFor="member-email">Tu correo privado</label>
          <input
            id="member-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
            disabled={sent || busy || !api.registrationOpen}
          />
          {sent && (
            <>
              <label htmlFor="member-code">Código del correo</label>
              <input
                id="member-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                minLength={6}
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </>
          )}
          <button
            className="secondary"
            disabled={busy || !api.registrationOpen}
          >
            {!api.registrationOpen
              ? "Protección por correo próximamente"
              : busy
                ? "Un momento…"
                : sent
                  ? "Confirmar código"
                  : resident
                    ? "Proteger esta misma parcela"
                    : "Recibir código de acceso"}
          </button>
        </form>
        {sent && (
          <div className="auth-actions">
            <button
              disabled={busy || cooldown > 0}
              onClick={() => void run(sendEmail)}
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setSent(false);
                setCode("");
                linkOwner.current = null;
              }}
            >
              Cambiar correo
            </button>
          </div>
        )}
      </>
    );
  }
  if (loading) return <p className="muted">Buscando tu lugar…</p>;
  return (
    <>
      {resident ? (
        <>
          <h2>
            Ya eres parte
            <br />
            de este país.
          </h2>
          <div className="passport">
            <span
              className="passport-avatar"
              style={{ color: AVATARS[resident.avatar].color }}
            >
              ♟
            </span>
            <span className="eyebrow">MIEMBRO FUNDADOR</span>
            <h3>@{resident.nick}</h3>
            <p>PARCELA F-{String(resident.parcel_id).padStart(4, "0")}</p>
            <small>
              {DISTRICT_NAMES[Math.floor((resident.parcel_id - 1) / 1024)]}
            </small>
          </div>
          <button className="primary" onClick={() => onLocate(resident)}>
            Ver mi muñeco y mi terreno ↗
          </button>
          <button
            className="secondary"
            onClick={() =>
              void run(async () => {
                const url = new URL(location.origin);
                url.searchParams.set("vecino", resident.nick);
                await navigator.clipboard.writeText(url.toString());
                setNotice(
                  "Enlace de tu parcela copiado. El enlace muestra tu lugar, pero no permite recuperarlo.",
                );
              })
            }
          >
            Compartir mi lugar
          </button>
          {!secured && (
            <p className="guest-reminder">
              Tu lugar está guardado en este navegador. Si borras sus datos o
              cambias de móvil, no podrás recuperarlo solo escribiendo el nick.
            </p>
          )}
          <section className="secure-place">
            <p className="eyebrow">OPCIONAL · TU CORREO NO SE PUBLICA</p>
            <h3>
              {secured
                ? "Tu lugar está protegido"
                : "¿Quieres asegurar tu lugar?"}
            </h3>
            <p className="muted">
              {secured
                ? "Puedes recuperar esta misma parcela con tu correo en otro dispositivo. Esto no verifica tu identidad en TikTok."
                : "Vincula un correo para recuperar tu nick y tu parcela si cambias de dispositivo. Tu muñeco seguirá en el mismo sitio."}
            </p>
            {!secured && emailForm()}
            {!secured && !api.registrationOpen && (
              <p className="fineprint">
                Estamos preparando el envío de códigos. Puedes participar ya sin
                correo; conserva esta sesión.
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <h2>
            Escribe tu nick.
            <br />
            <em>Entra en el mapa.</em>
          </h2>
          <p className="muted">
            Consigue tu muñeco y tu parcela. Sin correo ni contraseña.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!api.configured || !api.guestRegistrationOpen || !connected)
                return;
              void run(async () => {
                const normalized = normalizeNick(nick);
                if (!/^[a-z0-9._]{2,24}$/.test(normalized))
                  throw new Error(
                    "Usa de 2 a 24 letras, números, puntos o guiones bajos.",
                  );
                await enterAsGuest(api.supabase!.auth);
                const result = await api.reserve(normalized, avatar);
                await onReserved(result);
              });
            }}
          >
            <label htmlFor="member-nick">Tu nick de TikTok</label>
            <input
              id="member-nick"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="@tu_usuario"
              minLength={2}
              maxLength={25}
              autoComplete="off"
              required
              disabled={busy}
            />
            <label>Elige tu muñeco</label>
            <div className="avatars">
              {AVATARS.map((a, i) => (
                <button
                  key={a.name}
                  type="button"
                  disabled={busy}
                  className={avatar === i ? "chosen" : ""}
                  aria-pressed={avatar === i}
                  aria-label={a.name}
                  onClick={() => setAvatar(i)}
                >
                  <span style={{ color: a.color }}>♟</span>
                </button>
              ))}
            </div>
            <p className="avatar-name">{AVATARS[avatar].name}</p>
            <button
              className="primary"
              disabled={
                busy ||
                !api.configured ||
                !api.guestRegistrationOpen ||
                !connected ||
                full
              }
            >
              {busy
                ? "Creando tu lugar…"
                : full
                  ? "Abriremos más parcelas pronto"
                  : !api.guestRegistrationOpen
                    ? "Próximamente"
                    : "Crear mi lugar →"}
            </button>
            <p className="fineprint">
              Tu nick será único dentro de este mapa. No comprobamos que la
              cuenta de TikTok sea tuya. Nick y personaje serán públicos.{" "}
              <a href="#reglas">Cómo funciona</a>.
            </p>
          </form>
          <div className="secure-place">
            <h3>El correo puede esperar.</h3>
            <p className="muted">
              Primero consigue tu parcela. Después podrás añadir un correo para
              protegerla y recuperarla desde otro móvil.
            </p>
          </div>
          <details className="account-controls">
            <summary>Ya tengo una parcela protegida</summary>
            <p className="fineprint">
              Recupera tu cuenta con el correo que vinculaste. El nick por sí
              solo no da acceso a una reserva anterior.
            </p>
            {emailForm()}
          </details>
        </>
      )}
      {error && (
        <div className="feedback error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="feedback" role="status">
          {notice}
        </div>
      )}
    </>
  );
}
