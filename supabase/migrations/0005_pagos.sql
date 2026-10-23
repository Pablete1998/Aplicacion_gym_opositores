-- Cómo se pagó la cuota de cada mes: en efectivo, por el banco o regalada.
-- alumnos.cuota_al_dia sigue siendo lo que decide si el QR deja entrar; esta tabla guarda el historial.

create type forma_pago as enum ('efectivo', 'banco', 'regalado');

create table pagos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),   -- "2026-10"
  forma forma_pago not null,
  registrado_por uuid references perfiles on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (alumno_id, mes)
);

alter table pagos enable row level security;
create policy direccion_todo on pagos for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
create policy alumno_ver on pagos for select using (alumno_id = mi_alumno());
