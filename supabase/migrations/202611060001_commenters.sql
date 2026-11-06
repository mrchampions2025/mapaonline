-- Entradas públicas importadas desde comentarios. No crea identidades Auth.
begin;
alter table public.residents alter column owner_id drop not null;
alter table public.residents add column origin text not null default 'web'
  check (origin in ('web','comment'));
alter table public.residents add column alias text
  check (alias is null or char_length(alias) between 1 and 40);
alter table public.residents add constraint residents_import_ownership
  check ((origin='web' and owner_id is not null) or (origin='comment' and owner_id is null));

create table private.community_batches (
  batch_key text primary key check (char_length(batch_key) between 1 and 120),
  created_at timestamptz not null default now()
);
create table private.community_import_audit (
  batch_key text not null references private.community_batches(batch_key),
  nick text not null,
  sources jsonb not null default '[]',
  resident_id uuid not null references public.residents(id) on delete cascade,
  outcome text not null check (outcome in ('imported','preserved')),
  primary key (batch_key,nick)
);
alter table private.community_batches enable row level security;
alter table private.community_import_audit enable row level security;
revoke all on private.community_batches,private.community_import_audit from public,anon,authenticated;

create function private.import_commenters(p_batch_key text,p_rows jsonb)
returns table(nick text,parcel_id integer,outcome text)
language plpgsql security definer set search_path='' as $$
declare
  item jsonb;v_nick text;v_avatar integer;v_alias text;
  v_id uuid;v_parcel integer;v_outcome text;
begin
  if p_batch_key is null or char_length(p_batch_key) not between 1 and 120
    or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>1000 then
    raise exception 'Lote no válido.';
  end if;
  -- Todas las filas se validan antes de insertar. Cualquier error revierte el lote.
  for item in select value from jsonb_array_elements(p_rows) loop
    v_nick:=item->>'nick';v_alias:=nullif(item->>'alias','');
    if v_nick is null or v_nick !~ '^[a-z0-9._]{2,24}$'
      or jsonb_typeof(item->'avatar') is distinct from 'number'
      or (item->>'avatar') !~ '^[0-3]$'
      or (v_alias is not null and char_length(v_alias)>40)
      or (item ? 'sources' and jsonb_typeof(item->'sources') is distinct from 'array') then
      raise exception 'Fila de comentario no válida: %',coalesce(v_nick,'sin nick');
    end if;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('atlas-commenter-import',0));
  insert into private.community_batches(batch_key) values(p_batch_key) on conflict do nothing;
  for item in select value from jsonb_array_elements(p_rows) loop
    v_nick:=item->>'nick';v_avatar:=(item->>'avatar')::integer;v_alias:=nullif(item->>'alias','');
    select r.id,r.parcel_id into v_id,v_parcel from public.residents r where r.nick=v_nick;
    v_outcome:='preserved';
    if v_id is null then
      select p.id into v_parcel from public.parcels p join public.districts d on d.id=p.district_id
      where d.is_open and p.id<>21
        and not exists(select 1 from public.residents r where r.parcel_id=p.id)
      order by p.id for update of p skip locked limit 1;
      if v_parcel is null then raise exception 'No quedan parcelas libres.';end if;
      insert into public.residents(owner_id,nick,avatar,parcel_id,origin,alias)
        values(null,v_nick,v_avatar,v_parcel,'comment',v_alias)
        on conflict on constraint residents_nick_key do nothing returning id into v_id;
      if v_id is null then
        select r.id,r.parcel_id into v_id,v_parcel from public.residents r where r.nick=v_nick;
      else v_outcome:='imported';end if;
    end if;
    insert into private.community_import_audit(batch_key,nick,sources,resident_id,outcome)
      values(p_batch_key,v_nick,coalesce(item->'sources','[]'::jsonb),v_id,v_outcome)
      on conflict on constraint community_import_audit_pkey do nothing;
    return query select v_nick,v_parcel,v_outcome;
  end loop;
end;
$$;
revoke all on function private.import_commenters(text,jsonb) from public,anon,authenticated;

-- Los RPC públicos exponen únicamente el personaje y la posición, nunca owner_id.
drop function public.atlas_residents(double precision,double precision,double precision,double precision);
create function public.atlas_residents(p_left double precision,p_top double precision,p_right double precision,p_bottom double precision)
returns table(id uuid,nick text,avatar integer,parcel_id integer,x double precision,y double precision,district_id integer,origin text,alias text)
language sql stable security definer set search_path='' as $$
 select r.id,r.nick,r.avatar,r.parcel_id,p.x,p.y,p.district_id,r.origin,r.alias
 from public.residents r join public.parcels p on p.id=r.parcel_id
 where p.x between p_left and p_right and p.y between p_top and p_bottom
 order by r.parcel_id limit 750;
$$;
drop function public.find_resident(text);
create function public.find_resident(p_nick text)
returns table(id uuid,nick text,avatar integer,parcel_id integer,x double precision,y double precision,district_id integer,origin text,alias text)
language sql stable security definer set search_path='' as $$
 select r.id,r.nick,r.avatar,r.parcel_id,p.x,p.y,p.district_id,r.origin,r.alias
 from public.residents r join public.parcels p on p.id=r.parcel_id
 where r.nick=lower(ltrim(btrim(p_nick),'@')) limit 1;
$$;
create function public.atlas_directory(p_after integer default 0,p_limit integer default 100)
returns table(id uuid,nick text,avatar integer,parcel_id integer,x double precision,y double precision,district_id integer,origin text,alias text)
language sql stable security definer set search_path='' as $$
 select r.id,r.nick,r.avatar,r.parcel_id,p.x,p.y,p.district_id,r.origin,r.alias
 from public.residents r join public.parcels p on p.id=r.parcel_id
 where r.parcel_id>greatest(coalesce(p_after,0),0)
 order by r.parcel_id limit least(greatest(coalesce(p_limit,100),1),250);
$$;
revoke all on function public.atlas_residents(double precision,double precision,double precision,double precision),public.find_resident(text),public.atlas_directory(integer,integer) from public,anon,authenticated;
grant execute on function public.atlas_residents(double precision,double precision,double precision,double precision),public.find_resident(text),public.atlas_directory(integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
