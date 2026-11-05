import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("reservas, privacidad y permisos de administración", async (t) => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');`);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/202611050001_atlas.sql", import.meta.url),
      "utf8",
    ),
  );
  const user1 = "11111111-1111-4111-8111-111111111111",
    user2 = "22222222-2222-4222-8222-222222222222",
    user3 = "33333333-3333-4333-8333-333333333333";
  const login = async (id) => {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
      id || "",
    ]);
    await db.exec(id ? "set role authenticated" : "set role anon");
  };
  let first;
  await t.test(
    "hay 4096 plazas y los visitantes no pueden reservar ni leer propietarios",
    async () => {
      await login(null);
      const { rows } = await db.query("select * from public.atlas_districts()");
      assert.equal(
        rows.reduce((n, r) => n + Number(r.capacity), 0),
        4096,
      );
      await assert.rejects(
        db.query(`select * from public.reserve_parcel('intruso',0)`),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select owner_id from public.residents"),
        /permission denied/,
      );
    },
  );
  await t.test(
    "una identidad recibe una parcela y repetir la petición devuelve la misma",
    async () => {
      await login(user1);
      first = (
        await db.query(`select * from public.reserve_parcel(' @Fundador ',2)`)
      ).rows[0];
      assert.equal(first.nick, "fundador");
      assert.equal(first.parcel_id, 1);
      assert.equal("owner_id" in first, false);
      const again = (
        await db.query(`select * from public.reserve_parcel('otro_nombre',1)`)
      ).rows[0];
      assert.equal(again.id, first.id);
      assert.equal(again.avatar, 2);
    },
  );
  await t.test(
    "otro usuario no puede apropiarse del nick, modificar la reserva o convertirse en admin",
    async () => {
      await login(user2);
      await assert.rejects(
        db.query(`select * from public.reserve_parcel('FUNDADOR',0)`),
        /nick ya está reservado/,
      );
      await assert.rejects(
        db.query(
          `insert into public.residents(owner_id,nick,avatar,parcel_id) values('${user2}','ataque',0,2)`,
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query(`insert into private.atlas_admins values('${user2}')`),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          `insert into public.world_objects(kind,name,x,y) values('house','No autorizado',800,1200)`,
        ),
        /row-level security/,
      );
      const own = (await db.query("select * from public.my_resident()")).rows;
      assert.equal(own.length, 0);
    },
  );
  await t.test(
    "la validación es del servidor, no solo del formulario",
    async () => {
      await login(user2);
      for (const nick of ["a", "<script>", "espacio no", "x".repeat(25)])
        await assert.rejects(
          db.query("select * from public.reserve_parcel($1,0)", [nick]),
          /nick debe/,
        );
      await assert.rejects(
        db.query(`select * from public.reserve_parcel('valido',99)`),
        /personaje válido/,
      );
      const second = (
        await db.query(`select * from public.reserve_parcel('vecino',1)`)
      ).rows[0];
      assert.notEqual(second.parcel_id, first.parcel_id);
    },
  );
  await t.test(
    "los datos públicos no exponen correo ni el ID de acceso",
    async () => {
      await login(null);
      const row = (
        await db.query(`select * from public.find_resident('@FUNDADOR')`)
      ).rows[0];
      assert.equal(row.nick, "fundador");
      assert.equal("owner_id" in row, false);
      assert.equal("email" in row, false);
      const visible = (
        await db.query("select * from public.atlas_residents(0,0,1600,2000)")
      ).rows;
      assert.equal(visible.length, 2);
    },
  );
  await t.test(
    "solo el propietario retira su registro; un admin puede construir y deja historial",
    async () => {
      await login(user3);
      await db.query("select public.remove_my_resident()");
      assert.equal(
        (await db.query(`select * from public.find_resident('fundador')`)).rows
          .length,
        1,
      );
      await db.exec("reset role");
      await db.query("insert into private.atlas_admins values($1)", [user3]);
      await login(user3);
      await db.query(
        `insert into public.world_objects(kind,name,x,y) values('flag','Primera bandera',800,1200)`,
      );
      await db.exec("reset role");
      assert.equal(
        (await db.query("select * from private.world_audit")).rows.length,
        1,
      );
      await login(user1);
      await db.query("select public.remove_my_resident()");
      assert.equal(
        (await db.query("select * from public.my_resident()")).rows.length,
        0,
      );
    },
  );
  await db.close();
});
