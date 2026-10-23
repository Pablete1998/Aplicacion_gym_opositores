-- Perfil del alumno: ranking del grupo y "toques" entre compañeros.
-- Los alumnos no pueden leer las marcas de otros (RLS), así que el ranking sale de una función que
-- devuelve solo lo justo: nombre con la inicial del apellido y la mejor marca de cada periodo.

-- Mejor marca de cada compañero del grupo en cada prueba física: la del periodo actual (desde p_desde)
-- y la del periodo anterior (de p_antes a p_desde), para saber si mejora o se estanca.
create function ranking_mi_grupo(p_desde date, p_antes date)
returns table (prueba_id uuid, alumno_id uuid, nombre text, marca numeric, marca_anterior numeric, soy_yo boolean)
language sql stable security definer set search_path = public as $$
  select r.prueba_id,
         a.id,
         a.nombre || ' ' || left(a.apellidos, 1) || '.',
         case when p.mayor_es_mejor then max(r.marca) filter (where r.fecha >= p_desde)
              else min(r.marca) filter (where r.fecha >= p_desde) end,
         case when p.mayor_es_mejor then max(r.marca) filter (where r.fecha < p_desde)
              else min(r.marca) filter (where r.fecha < p_desde) end,
         a.id = yo.id
  from alumnos yo
  join alumnos a on a.grupo_id = yo.grupo_id and a.activo
  join resultados r on r.alumno_id = a.id and r.fecha >= p_antes
  join pruebas p on p.id = r.prueba_id and p.tipo = 'fisica'
  where yo.id = mi_alumno()
  group by r.prueba_id, a.id, a.nombre, a.apellidos, p.mayor_es_mejor, yo.id
$$;

-- Un toque es un mensaje corto de una lista cerrada que un alumno manda a un compañero de su grupo
create table toques (
  id uuid primary key default gen_random_uuid(),
  de_alumno uuid not null references alumnos on delete cascade,
  para_alumno uuid not null references alumnos on delete cascade,
  mensaje text not null check (mensaje in ('espabila', 'vamos', 'te_echamos_de_menos', 'a_por_todas', 'crack')),
  leido boolean not null default false,
  creado_en timestamptz not null default now()
);
create index toques_para on toques (para_alumno, creado_en desc);

alter table toques enable row level security;
create policy direccion_todo on toques for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy alumno_ver_recibidos on toques for select using (para_alumno = mi_alumno());
create policy alumno_marcar_leido on toques for update using (para_alumno = mi_alumno()) with check (para_alumno = mi_alumno());

-- Manda un toque: solo a compañeros del mismo grupo y como mucho uno al día a la misma persona
create function dar_toque(p_para uuid, p_mensaje text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_yo uuid := mi_alumno();
begin
  if v_yo is null then
    raise exception 'Solo los alumnos pueden dar toques';
  end if;
  if p_para = v_yo then
    raise exception 'No puedes darte un toque a ti mismo';
  end if;
  if not exists (
    select 1 from alumnos yo join alumnos otro on otro.grupo_id = yo.grupo_id
    where yo.id = v_yo and otro.id = p_para and otro.activo
  ) then
    raise exception 'Solo puedes dar toques a compañeros de tu grupo';
  end if;
  if exists (
    select 1 from toques where de_alumno = v_yo and para_alumno = p_para and creado_en > now() - interval '1 day'
  ) then
    raise exception 'Ya le has dado un toque hoy';
  end if;
  insert into toques (de_alumno, para_alumno, mensaje) values (v_yo, p_para, p_mensaje);
end
$$;

-- Toques recibidos sin leer, con el nombre de quien los manda
create function mis_toques() returns table (id uuid, de text, mensaje text, creado_en timestamptz)
language sql stable security definer set search_path = public as $$
  select t.id, a.nombre, t.mensaje, t.creado_en
  from toques t join alumnos a on a.id = t.de_alumno
  where t.para_alumno = mi_alumno() and not t.leido
  order by t.creado_en desc
  limit 20
$$;

revoke execute on function ranking_mi_grupo(date, date), dar_toque(uuid, text), mis_toques() from public, anon;
grant execute on function ranking_mi_grupo(date, date), dar_toque(uuid, text), mis_toques() to authenticated;
