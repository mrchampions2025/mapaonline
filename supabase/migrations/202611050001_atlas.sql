-- Ejecutar una vez en un proyecto nuevo de Supabase. No contiene secretos.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.districts (
  id integer primary key,
  name text not null check (char_length(name) between 1 and 60),
  x double precision not null,
  y double precision not null,
  is_open boolean not null default true
);
create table public.parcels (
  id integer primary key,
  district_id integer not null references public.districts(id),
  x double precision not null,
  y double precision not null
);
create table public.residents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  nick text not null unique check (nick ~ '^[a-z0-9._]{2,24}$'),
  avatar integer not null check (avatar between 0 and 3),
  parcel_id integer not null unique references public.parcels(id),
  created_at timestamptz not null default now()
);
create table private.atlas_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.world_objects (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('house','tree','port','farm','road','flag')),
  name text not null check (char_length(name) between 1 and 60),
  x double precision not null check (x between 100 and 1500),
  y double precision not null check (y between 500 and 1600),
  created_at timestamptz not null default now()
);
create table private.world_audit (
  id bigint generated always as identity primary key,
  object_id uuid,
  actor_id uuid,
  operation text not null,
  previous_state jsonb,
  next_state jsonb,
  created_at timestamptz not null default now()
);

-- Mantener estas fórmulas alineadas con src/lib/world.ts.
with centers as (
  select i as id,
    25.48+((i-1)%2)*6 as gx,
    27.48+((i-1)/2)*6 as gy,
    (array['Barrio Fundador','La Arboleda','Las Terrazas','Horizonte'])[i] as name
  from generate_series(1,4) i
)
insert into public.districts(id,name,x,y)
select id,name,800+(gx-gy)*17,
1060+(gx+gy-44)*8.7-(12+65*exp(-((gx-14)^2+(gy-14)^2)/24)+90*exp(-((gx-27)^2+(gy-15)^2)/22)+4*sin(gx*.35)*cos(gy*.42))
from centers;
with grid as (
  select n+1 as id, n/1024+1 as district_id,
    23+((n/1024)%2)*6+(n%32)*.16 as gx,
    25+((n/1024)/2)*6+((n%1024)/32)*.16 as gy
  from generate_series(0,4095) n
)
insert into public.parcels(id,district_id,x,y)
select id,district_id,800+(gx-gy)*17,
1060+(gx+gy-44)*8.7-(12+65*exp(-((gx-14)^2+(gy-14)^2)/24)+90*exp(-((gx-27)^2+(gy-15)^2)/22)+4*sin(gx*.35)*cos(gy*.42))
from grid;
create index parcels_position on public.parcels(x,y);

alter table public.districts enable row level security;
alter table public.parcels enable row level security;
alter table public.residents enable row level security;
alter table public.world_objects enable row level security;
alter table private.atlas_admins enable row level security;
alter table private.world_audit enable row level security;
-- Reservas y perfiles solo se exponen mediante RPC con columnas explícitas.
-- owner_id y correo nunca aparecen en respuestas públicas.
revoke all on public.districts,public.parcels,public.residents,public.world_objects from anon,authenticated;
grant select on public.world_objects to anon,authenticated;
create policy objects_read on public.world_objects for select to anon,authenticated using (true);

create function public.is_atlas_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.atlas_admins a where a.user_id=auth.uid());
$$;
grant insert,update,delete on public.world_objects to authenticated;
create policy objects_insert on public.world_objects for insert to authenticated with check (public.is_atlas_admin());
create policy objects_update on public.world_objects for update to authenticated using (public.is_atlas_admin()) with check (public.is_atlas_admin());
create policy objects_delete on public.world_objects for delete to authenticated using (public.is_atlas_admin());

create function private.audit_world() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.world_audit(object_id,actor_id,operation,previous_state,next_state)
  values(coalesce(new.id,old.id),auth.uid(),tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
create trigger world_audit after insert or update or delete on public.world_objects for each row execute function private.audit_world();

create function public.atlas_districts()
returns table(id integer,name text,x double precision,y double precision,residents bigint,capacity bigint)
language sql stable security definer set search_path = '' as $$
  select d.id,d.name,d.x,d.y,count(r.id),count(p.id)
  from public.districts d join public.parcels p on p.district_id=d.id
  left join public.residents r on r.parcel_id=p.id where d.is_open
  group by d.id order by d.id;
$$;
create function public.atlas_residents(p_left double precision,p_top double precision,p_right double precision,p_bottom double precision)
returns table(id uuid,nick text,avatar integer,parcel_id integer,x double precision,y double precision,district_id integer)
language sql stable security definer set search_path = '' as $$
  select r.id,r.nick,r.avatar,r.parcel_id,p.x,p.y,p.district_id
  from public.residents r join public.parcels p on p.id=r.parcel_id
  where p.x between p_left and p_right and p.y between p_top and p_bottom
  order by r.parcel_id limit 750;
$$;
create function public.find_resident(p_nick text)
returns table(id uuid,nick text,avatar integer,parcel_id integer,x double precision,y double precision,district_id integer)
language sql stable security definer set search_path = '' as $$
  select r.id,r.nick,r.avatar,r.parcel_id,p.x,p.y,p.district_id
  from public.residents r join public.parcels p on p.id=r.parcel_id
  where r.nick=lower(ltrim(btrim(p_nick),'@')) limit 1;
$$;
create function public.my_resident()
returns table(id uuid,nick text,avatar integer,parcel_id integer,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id,r.nick,r.avatar,r.parcel_id,r.created_at from public.residents r where r.owner_id=auth.uid();
$$;

create function public.reserve_parcel(p_nick text,p_avatar integer)
returns table(id uuid,nick text,avatar integer,parcel_id integer,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_nick text := lower(ltrim(btrim(p_nick),'@'));
  v_parcel integer;
begin
  if v_user is null then raise exception 'Inicia sesión para reservar una parcela.'; end if;
  -- Serializa solicitudes de la misma identidad, incluso en pestañas diferentes.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  if exists(select 1 from public.residents r where r.owner_id=v_user) then
    return query select r.id,r.nick,r.avatar,r.parcel_id,r.created_at from public.residents r where r.owner_id=v_user;
    return;
  end if;
  if v_nick is null or v_nick !~ '^[a-z0-9._]{2,24}$' then
    raise exception 'El nick debe tener entre 2 y 24 letras, números, puntos o guiones bajos.';
  end if;
  if p_avatar is null or p_avatar not between 0 and 3 then raise exception 'Elige un personaje válido.'; end if;
  select p.id into v_parcel from public.parcels p join public.districts d on d.id=p.district_id
  where d.is_open and not exists(select 1 from public.residents r where r.parcel_id=p.id)
  order by p.id for update of p skip locked limit 1;
  if v_parcel is null then raise exception 'Ahora no hay parcelas disponibles. Volveremos a abrir plazas.'; end if;
  begin
    insert into public.residents(owner_id,nick,avatar,parcel_id) values(v_user,v_nick,p_avatar,v_parcel);
  exception when unique_violation then
    raise exception 'Ese nick ya está reservado. Elige otro nombre público.';
  end;
  return query select r.id,r.nick,r.avatar,r.parcel_id,r.created_at from public.residents r where r.owner_id=v_user;
end;
$$;

-- Una persona puede retirar su nick del mapa sin borrar su cuenta Auth.
create function public.remove_my_resident() returns void
language sql security definer set search_path = '' as $$
  delete from public.residents where owner_id=auth.uid();
$$;

-- Las funciones de PostgreSQL son ejecutables por PUBLIC por defecto: cerrar explícitamente.
revoke all on function public.is_atlas_admin(),public.atlas_districts(),public.atlas_residents(double precision,double precision,double precision,double precision),public.find_resident(text),public.my_resident(),public.reserve_parcel(text,integer),public.remove_my_resident() from public,anon,authenticated;
revoke all on function private.audit_world() from public,anon,authenticated;
grant execute on function public.atlas_districts(),public.atlas_residents(double precision,double precision,double precision,double precision),public.find_resident(text) to anon,authenticated;
grant execute on function public.my_resident(),public.reserve_parcel(text,integer),public.is_atlas_admin(),public.remove_my_resident() to authenticated;
commit;
