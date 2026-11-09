import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("inventario privado: visitantes, sesiones separadas, especies válidas y reintentos", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema private;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611090002_animal_inventory.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    async function user(id) {
      await db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
      );
    }
    const inventory = async () =>
      (await db.query("select public.adventure_inventory() s")).rows[0].s;
    const discover = async (code) =>
      (await db.query("select public.discover_animal($1) s", [code])).rows[0].s;
    await db.exec("set role anon");
    assert.deepEqual((await inventory()).animals, []);
    await assert.rejects(discover("forest_fox"), /permission denied/);
    await user(a);
    assert.equal((await discover("forest_fox")).animals.length, 1);
    assert.equal((await discover("forest_fox")).animals.length, 1);
    assert.equal((await discover("hill_owl")).animals.length, 2);
    await assert.rejects(discover("invalid"), /Especie no válida/);
    await assert.rejects(discover(null), /Especie no válida/);
    await assert.rejects(
      db.query("select * from private.animal_discoveries"),
      /permission denied/,
    );
    await user(b);
    assert.equal((await inventory()).animals.length, 0);
    await discover("north_bird");
    assert.equal((await inventory()).animals.length, 1);
    await user(a);
    assert.deepEqual((await inventory()).animals.map((a) => a.code).sort(), [
      "forest_fox",
      "hill_owl",
    ]);
    const keys = Object.keys((await inventory()).animals[0]);
    assert.deepEqual(keys.sort(), ["code", "discovered_at"]);
  } finally {
    await db.close();
  }
});
