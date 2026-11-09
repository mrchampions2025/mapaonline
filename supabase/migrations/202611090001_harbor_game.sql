-- First cooperative activity. No resident, parcel or existing ownership changes.
begin;
create table private.harbor_project (
 id boolean primary key default true check(id), deliveries integer not null default 0 check(deliveries between 0 and 50)
);
insert into private.harbor_project(id) values(true);
create table private.harbor_work (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 token uuid not null unique default gen_random_uuid(), started_at timestamptz not null default now()
);
create table private.harbor_deliveries (
 token uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 delivered_at timestamptz not null default now()
);
create index harbor_deliveries_owner_time on private.harbor_deliveries(owner_id,delivered_at desc);
alter table private.harbor_project enable row level security;
alter table private.harbor_work enable row level security;
alter table private.harbor_deliveries enable row level security;
revoke all on private.harbor_project,private.harbor_work,private.harbor_deliveries from public,anon,authenticated;

create function public.harbor_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('deliveries',p.deliveries,'goal',50,
 'next_at',(select max(d.delivered_at)+interval '24 hours' from private.harbor_deliveries d where d.owner_id=auth.uid()),
 'my_deliveries',(select count(*) from private.harbor_deliveries d where d.owner_id=auth.uid()))
 from private.harbor_project p where p.id;
$$;
create function public.start_harbor_work() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w private.harbor_work;
begin
 if u is null then raise exception 'Necesitas una sesión de invitado para guardar tu entrega.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 if exists(select 1 from private.harbor_deliveries where owner_id=u and delivered_at>now()-interval '24 hours') then
  raise exception 'Ya has entregado madera. Tu próxima jornada se abre en 24 horas desde la entrega.';
 end if;
 if (select deliveries from private.harbor_project where id)>=50 then raise exception 'El muelle ya está terminado. ¡Gracias por participar!';end if;
 insert into private.harbor_work(owner_id) values(u) on conflict(owner_id) do update
 set token=case when harbor_work.started_at<now()-interval '30 minutes' then gen_random_uuid() else harbor_work.token end,
 started_at=case when harbor_work.started_at<now()-interval '30 minutes' then now() else harbor_work.started_at end
 returning * into w;
 return jsonb_build_object('token',w.token,'started_at',w.started_at);
end; $$;
create function public.finish_harbor_work(p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w private.harbor_work; n integer;
begin
 if u is null then raise exception 'Sesión necesaria.';end if;
 perform pg_advisory_xact_lock(hashtextextended('harbor:'||u::text,0));
 -- A retried delivery returns its result without another increment.
 if exists(select 1 from private.harbor_deliveries where token=p_token and owner_id=u) then return public.harbor_status();end if;
 select * into w from private.harbor_work where owner_id=u and token=p_token for update;
 if not found then raise exception 'Jornada no válida. Vuelve a empezar.';end if;
 if w.started_at>now()-interval '8 seconds' then raise exception 'Termina de recoger la madera antes de entregarla.';end if;
 if w.started_at<now()-interval '30 minutes' then raise exception 'La jornada ha caducado. Vuelve a empezar.';end if;
 if exists(select 1 from private.harbor_deliveries where owner_id=u and delivered_at>now()-interval '24 hours') then raise exception 'Ya has entregado madera hoy.';end if;
 select deliveries into n from private.harbor_project where id for update;
 if n>=50 then raise exception 'El muelle ya está terminado. ¡Gracias por participar!';end if;
 insert into private.harbor_deliveries(token,owner_id) values(p_token,u);
 update private.harbor_project set deliveries=deliveries+1 where id;
 delete from private.harbor_work where owner_id=u;
 return public.harbor_status();
end; $$;
revoke all on function public.harbor_status(),public.start_harbor_work(),public.finish_harbor_work(uuid) from public;
grant execute on function public.harbor_status() to anon,authenticated;
grant execute on function public.start_harbor_work(),public.finish_harbor_work(uuid) to authenticated;
commit;
