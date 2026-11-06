import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('importar comentaristas conserva propietarios, evita duplicados y no permite apropiación',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated;
 insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
 await db.exec(await readFile(new URL('../supabase/migrations/202611050001_atlas.sql',import.meta.url),'utf8'));
 await db.exec(`select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);set role authenticated;`);
 const old=(await db.query("select * from public.reserve_parcel('fundador',3)")).rows[0];
 await db.exec('reset role');
 await db.exec(await readFile(new URL('../supabase/migrations/202611060001_commenters.sql',import.meta.url),'utf8'));
 const batch=[{nick:'fundador',avatar:0},{nick:'comentarista',avatar:2,alias:'Lancelot',sources:['https://www.tiktok.com/@paisde.seguidores/video/7705063582198762774']},{nick:'votante',avatar:1},{nick:'comentarista',avatar:0}];
 const imported=(await db.query('select * from private.import_commenters($1,$2::jsonb)',['test-1',JSON.stringify(batch)])).rows;
 assert.equal(imported.filter(x=>x.outcome==='imported').length,2);
 assert.equal((await db.query('select count(*)::int n from public.residents')).rows[0].n,3);
 const original=(await db.query("select * from public.residents where nick='fundador'")).rows[0];
 assert.equal(original.id,old.id);assert.equal(original.avatar,3);assert.equal(original.parcel_id,old.parcel_id);
 assert.ok(original.owner_id);assert.equal(original.origin,'web');
 const guest=(await db.query("select * from public.residents where nick='comentarista'")).rows[0];
 assert.equal(guest.owner_id,null);assert.equal(guest.origin,'comment');assert.equal(guest.avatar,2);assert.equal(guest.alias,'Lancelot');
 const replay=(await db.query('select * from private.import_commenters($1,$2::jsonb)',['test-1',JSON.stringify(batch)])).rows;
 assert.equal(replay.filter(x=>x.outcome==='imported').length,0);
 assert.equal((await db.query('select count(*)::int n from private.community_import_audit')).rows[0].n,3);
 await assert.rejects(db.query('select * from private.import_commenters($1,$2::jsonb)',['invalid',JSON.stringify([{nick:'valido',avatar:1},{nick:'<script>',avatar:1}])]),/no válida/);
 assert.equal((await db.query("select count(*)::int n from public.residents where nick='valido'")).rows[0].n,0);
 await db.exec("select set_config('request.jwt.claim.sub','',false);set role anon");
 const pub=(await db.query('select * from public.atlas_directory(0,100)')).rows;
 assert.equal(pub.length,3);assert.equal(pub.find(x=>x.nick==='comentarista').origin,'comment');
 assert.equal('owner_id' in pub[0],false);assert.equal('email' in pub[0],false);
 assert.equal((await db.query('select * from public.atlas_directory($1,100)',[pub[1].parcel_id])).rows.length,1);
 await assert.rejects(db.query("select * from private.import_commenters('hack','[]')"),/permission denied/);
 await assert.rejects(db.query('select * from public.residents'),/permission denied/);
 await db.exec("reset role;select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);set role authenticated");
 await assert.rejects(db.query("select * from public.reserve_parcel('comentarista',0)"),/nick ya está reservado/);
 assert.equal((await db.query('select * from public.my_resident()')).rows.length,0);
 await db.exec('reset role');
 const still=(await db.query("select owner_id,parcel_id from public.residents where nick='comentarista'")).rows[0];
 assert.equal(still.owner_id,null);assert.equal(still.parcel_id,guest.parcel_id);
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,2);
 } finally {await db.close();}
});
