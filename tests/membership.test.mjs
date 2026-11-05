import { test } from "node:test";
import assert from "node:assert/strict";
import {
  enterAsGuest,
  attachEmail,
  verifyAttachedEmail,
} from "../src/lib/membership.ts";

const guest = { id: "original-owner", is_anonymous: true };
test("volver a entrar conserva la identidad propietaria sin crear otro invitado", async () => {
  let created = 0;
  const auth = {
    getSession: async () => ({
      data: { session: { user: guest } },
      error: null,
    }),
    signInAnonymously: async () => {
      created++;
      throw new Error("No debe llamarse");
    },
  };
  assert.equal((await enterAsGuest(auth)).id, guest.id);
  assert.equal(created, 0);
});
test("entrar sin email crea una sesión y propaga fallos del proveedor", async () => {
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInAnonymously: async () => ({
      data: { user: guest, session: { user: guest } },
      error: null,
    }),
  };
  assert.equal((await enterAsGuest(auth)).id, guest.id);
  auth.signInAnonymously = async () => ({
    data: { user: null, session: null },
    error: new Error("Invitados deshabilitados"),
  });
  await assert.rejects(enterAsGuest(auth), /deshabilitados/);
});
test("proteger una parcela añade email al propietario existente y no inicia otra cuenta", async () => {
  let added;
  const auth = {
    getUser: async () => ({ data: { user: guest }, error: null }),
    updateUser: async (p) => {
      added = p;
      return { data: { user: guest }, error: null };
    },
    signInWithOtp: () => {
      throw new Error("No debe iniciar otra identidad");
    },
  };
  assert.equal(await attachEmail(auth, " vecino@example.com "), guest.id);
  assert.deepEqual(added, { email: "vecino@example.com" });
});
test("un correo ocupado no provoca apropiación ni traslado de parcela", async () => {
  const auth = {
    getUser: async () => ({ data: { user: guest }, error: null }),
    updateUser: async () => ({
      data: { user: null },
      error: new Error("Email already registered"),
    }),
    signInWithOtp: () => {
      throw new Error("No debe cambiar de identidad");
    },
  };
  await assert.rejects(
    attachEmail(auth, "ocupado@example.com"),
    /already registered/,
  );
});
test("la confirmación de correo usa email_change y mantiene la identidad", async () => {
  let verification;
  const auth = {
    getUser: async () => ({ data: { user: guest }, error: null }),
    verifyOtp: async (p) => {
      verification = p;
      return {
        data: {
          user: {
            ...guest,
            is_anonymous: false,
            email_confirmed_at: "2026-11-05",
          },
        },
        error: null,
      };
    },
  };
  const user = await verifyAttachedEmail(
    auth,
    " vecino@example.com ",
    " 123456 ",
    guest.id,
  );
  assert.equal(user.id, guest.id);
  assert.equal(user.is_anonymous, false);
  assert.equal(verification.type, "email_change");
  assert.equal(verification.token, "123456");
});
test("si la sesión cambia se impide confirmar sobre otra identidad", async () => {
  let called = false;
  const auth = {
    getUser: async () => ({
      data: { user: { id: "other-owner" } },
      error: null,
    }),
    verifyOtp: async () => {
      called = true;
      return { data: { user: guest }, error: null };
    },
  };
  await assert.rejects(
    verifyAttachedEmail(auth, "vecino@example.com", "123456", guest.id),
    /sesión ha cambiado/,
  );
  assert.equal(called, false);
});
