import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("obra compartida: sesión, espera, límite de 24 horas, reintentos y meta atómica", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  async function user(id) {
    await db.exec(
      `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
    );
  }
  async function ready() {
    await db.exec(
      "reset role;update private.harbor_work set started_at=now()-interval '9 seconds';set role authenticated",
    );
  }
  async function status() {
    return (await db.query("select public.harbor_status() s")).rows[0].s;
  }
  async function start() {
    return (await db.query("select public.start_harbor_work() s")).rows[0].s;
  }
  async function finish(token) {
    return (await db.query("select public.finish_harbor_work($1) s", [token]))
      .rows[0].s;
  }
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema private;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;`,
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611090001_harbor_game.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec("set role anon");
    assert.equal((await status()).deliveries, 0);
    await assert.rejects(start(), /permission denied/);
    await user(a);
    const w = await start();
    assert.equal((await start()).token, w.token);
    await assert.rejects(finish(w.token), /Termina de recoger/);
    assert.equal((await status()).deliveries, 0);
    await ready();
    assert.equal((await finish(w.token)).deliveries, 1);
    assert.equal((await finish(w.token)).deliveries, 1);
    assert.equal((await status()).my_deliveries, 1);
    await assert.rejects(start(), /24 horas/);
    assert.ok((await status()).next_at);
    await user(b);
    await assert.rejects(finish(w.token), /no válida/);
    await assert.rejects(
      db.query("select * from private.harbor_deliveries"),
      /permission denied/,
    );
    assert.equal((await status()).my_deliveries, 0);
    const expired = await start();
    await db.exec(
      "reset role;update private.harbor_work set started_at=now()-interval '31 minutes';set role authenticated",
    );
    await assert.rejects(finish(expired.token), /caducado/);
    const fresh = await start();
    assert.notEqual(fresh.token, expired.token);
    await ready();
    await db.exec(
      "reset role;update private.harbor_deliveries set delivered_at=now()-interval '25 hours';set role authenticated",
    );
    await user(a);
    const pending = await start();
    await ready();
    await db.exec(
      "reset role;update private.harbor_project set deliveries=49;set role authenticated",
    );
    await user(b);
    assert.equal((await finish(fresh.token)).deliveries, 50);
    assert.equal((await finish(fresh.token)).deliveries, 50);
    await user(a);
    await assert.rejects(finish(pending.token), /terminado/);
    assert.equal((await status()).deliveries, 50);
    await db.exec("reset role");
    assert.equal(
      (await db.query("select count(*)::int n from private.harbor_deliveries"))
        .rows[0].n,
      2,
    );
    await db.exec(
      "select set_config('request.jwt.claim.sub','',false);set role anon",
    );
    const pub = await status();
    assert.deepEqual(Object.keys(pub).sort(), [
      "deliveries",
      "goal",
      "my_deliveries",
      "next_at",
    ]);
    assert.equal(pub.my_deliveries, 0);
  } finally {
    await db.close();
  }
});
