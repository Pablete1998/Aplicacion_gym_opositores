-- Sesiones de entrenamiento: la academia publica el plan del día de cada grupo y el alumno,
-- con la cuota al día, empieza su sesión y apunta lo que hace en cada ejercicio.
-- Son su diario de entrenamiento: no cambian las marcas oficiales (tabla resultados).

-- Fecha de hoy en España (el servidor de la base de datos va en UTC)
create function hoy_es() returns date language sql stable as $$
  select (now() at time zone 'Europe/Madrid')::date
$$;

create table planes (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references grupos on delete cascade,
  fecha date not null,
  titulo text not null,
  notas text,
  creado_por uuid references perfiles on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (grupo_id, fecha)
);

create table plan_ejercicios (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references planes on delete cascade,
  orden int not null default 0,
  nombre text not null,
  pauta text,          -- "4 × 400 m, recuperación 90 s"
  unidad text          -- qué apunta el alumno: "seg", "reps", "kg", "m", "min"; null = solo marcar hecho
);

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos on delete cascade,
  plan_id uuid not null references planes on delete cascade,
  empezada_en timestamptz not null default now(),
  terminada_en timestamptz,
  sensacion int check (sensacion between 1 and 5),
  notas text,
  unique (alumno_id, plan_id)
);

create table sesion_marcas (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references sesiones on delete cascade,
  ejercicio_id uuid not null references plan_ejercicios on delete cascade,
  valor numeric,
  hecho boolean not null default true,
  unique (sesion_id, ejercicio_id)
);

create index on sesiones (alumno_id);
create index on plan_ejercicios (plan_id);

-- ¿Lleva esta persona el grupo como preparador?
create function lleva_grupo(p_grupo uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from grupos where id = p_grupo and preparador_id = auth.uid())
$$;

-- ¿Es la sesión del alumno que ha iniciado sesión y sigue abierta?
create function es_mi_sesion_abierta(p_sesion uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sesiones where id = p_sesion and alumno_id = mi_alumno() and terminada_en is null)
$$;

alter table planes enable row level security;
alter table plan_ejercicios enable row level security;
alter table sesiones enable row level security;
alter table sesion_marcas enable row level security;

-- Dirección: todo
create policy direccion_todo on planes for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on plan_ejercicios for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on sesiones for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy direccion_todo on sesion_marcas for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');

-- Preparador: planifica sus grupos y ve las sesiones de sus alumnos
create policy preparador_planes on planes for all
  using (mi_rol() = 'preparador' and lleva_grupo(grupo_id))
  with check (mi_rol() = 'preparador' and lleva_grupo(grupo_id));
create policy preparador_ejercicios on plan_ejercicios for all
  using (mi_rol() = 'preparador' and lleva_grupo((select grupo_id from planes where id = plan_id)))
  with check (mi_rol() = 'preparador' and lleva_grupo((select grupo_id from planes where id = plan_id)));
create policy preparador_ver on sesiones for select using (mi_rol() = 'preparador' and es_preparador_de(alumno_id));
create policy preparador_ver on sesion_marcas for select
  using (mi_rol() = 'preparador' and es_preparador_de((select alumno_id from sesiones where id = sesion_id)));

-- Alumno: ve el plan de su grupo, sus sesiones y sus marcas; apunta solo en su sesión abierta
create policy alumno_ver on planes for select
  using (grupo_id = (select grupo_id from alumnos where id = mi_alumno()));
create policy alumno_ver on plan_ejercicios for select
  using ((select grupo_id from planes where id = plan_id) = (select grupo_id from alumnos where id = mi_alumno()));
create policy alumno_ver on sesiones for select using (alumno_id = mi_alumno());
create policy alumno_ver on sesion_marcas for select
  using ((select alumno_id from sesiones where id = sesion_id) = mi_alumno());
create policy alumno_apuntar on sesion_marcas for insert with check (es_mi_sesion_abierta(sesion_id));
create policy alumno_corregir on sesion_marcas for update
  using (es_mi_sesion_abierta(sesion_id)) with check (es_mi_sesion_abierta(sesion_id));
create policy alumno_quitar on sesion_marcas for delete using (es_mi_sesion_abierta(sesion_id));

-- Empezar la sesión de hoy: solo con la cuota al día y con el plan de hoy de su grupo
create function empezar_sesion(p_plan uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a alumnos;
  pl planes;
  v_id uuid;
begin
  select * into a from alumnos where id = mi_alumno();
  if not found then raise exception 'Tu usuario no está vinculado a una ficha de alumno'; end if;
  if not a.activo then raise exception 'Estás de baja en la academia'; end if;
  if not a.cuota_al_dia then raise exception 'Tienes la cuota pendiente: pásate por recepción para empezar la sesión'; end if;
  select * into pl from planes where id = p_plan;
  if not found or pl.grupo_id is distinct from a.grupo_id then raise exception 'Este plan no es de tu grupo'; end if;
  if pl.fecha <> hoy_es() then raise exception 'Solo puedes empezar la sesión de hoy'; end if;
  insert into sesiones (alumno_id, plan_id) values (a.id, p_plan)
  on conflict (alumno_id, plan_id) do nothing
  returning id into v_id;
  if v_id is null then select id into v_id from sesiones where alumno_id = a.id and plan_id = p_plan; end if;
  return v_id;
end $$;

-- Terminar la sesión con cómo se ha sentido (1 a 5) y una nota opcional
create function terminar_sesion(p_sesion uuid, p_sensacion int, p_notas text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_mi_sesion_abierta(p_sesion) then raise exception 'Esta sesión no está abierta'; end if;
  update sesiones set terminada_en = now(), sensacion = p_sensacion, notas = nullif(trim(p_notas), '')
  where id = p_sesion;
end $$;

revoke execute on function empezar_sesion(uuid), terminar_sesion(uuid, int, text) from public, anon;
grant execute on function empezar_sesion(uuid), terminar_sesion(uuid, int, text) to authenticated;
