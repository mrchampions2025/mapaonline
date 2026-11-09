-- Fauna discoveries belong to the current session; no resident/parcel migration.
begin;
create table private.animal_discoveries (
 owner_id uuid not null references auth.users(id) on delete cascade,
 code text not null check(code in ('forest_fox','hill_owl','golden_deer','coast_rabbit','island_turtle','north_bird')),
 discovered_at timestamptz not null default now(),
 primary key(owner_id,code)
);
alter table private.animal_discoveries enable row level security;
revoke all on private.animal_discoveries from public,anon,authenticated;
create function public.adventure_inventory() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('animals',coalesce(jsonb_agg(jsonb_build_object('code',code,'discovered_at',discovered_at) order by discovered_at),'[]'::jsonb))
 from private.animal_discoveries where owner_id=auth.uid();
$$;
create function public.discover_animal(p_code text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Necesitas una sesión para guardar el descubrimiento.';end if;
 if p_code not in ('forest_fox','hill_owl','golden_deer','coast_rabbit','island_turtle','north_bird') or p_code is null then raise exception 'Especie no válida.';end if;
 insert into private.animal_discoveries(owner_id,code) values(auth.uid(),p_code) on conflict(owner_id,code) do nothing;
 return public.adventure_inventory();
end;$$;
revoke all on function public.adventure_inventory(),public.discover_animal(text) from public;
grant execute on function public.adventure_inventory() to anon,authenticated;
grant execute on function public.discover_animal(text) to authenticated;
commit;
