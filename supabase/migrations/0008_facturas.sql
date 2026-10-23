-- Facturas de las cuotas. Cada cuota cobrada (efectivo o banco) genera una factura con numeración
-- correlativa por serie y año. Las facturas no se editan ni se borran: un error se corrige con una
-- factura rectificativa. Cada factura guarda la huella (SHA-256) de sus datos y de la anterior, como
-- pide VeriFactu, para dejar la app preparada; el envío a Hacienda queda para más adelante.

-- Datos de la academia para las facturas (una sola fila)
create table datos_facturacion (
  id int primary key default 1 check (id = 1),
  razon_social text not null default '',
  nif text not null default '',
  domicilio text not null default '',
  codigo_postal text not null default '',
  localidad text not null default '',
  provincia text not null default '',
  email text,
  serie text not null default 'A' check (serie ~ '^[A-Z0-9]{1,5}$'),
  iva numeric not null default 21 check (iva >= 0 and iva <= 30),
  exencion text,                       -- si el IVA es 0: artículo que lo exime, sale en la factura
  precio_cuota numeric check (precio_cuota >= 0),   -- IVA incluido
  concepto text not null default 'Cuota mensual de preparación de oposiciones'
);
insert into datos_facturacion (id) values (1);

-- Datos del alumno para la factura completa; sin NIF se emite factura simplificada
alter table alumnos add column nif text;
alter table alumnos add column domicilio text;
alter table alumnos add column cuota_importe numeric check (cuota_importe >= 0);   -- si paga distinto del precio general

alter table pagos add column importe numeric check (importe >= 0);

create table facturas (
  id uuid primary key default gen_random_uuid(),
  serie text not null,                 -- "A2026"; las rectificativas, "RA2026"
  numero int not null,
  fecha date not null,
  mes_cuota text not null,             -- "2026-10"
  pago_id uuid references pagos on delete set null,
  alumno_id uuid references alumnos on delete set null,
  tipo text not null check (tipo in ('completa', 'simplificada')),
  emisor jsonb not null,               -- copia de datos_facturacion al emitir
  cliente_nombre text not null,
  cliente_nif text,
  cliente_domicilio text,
  concepto text not null,
  base numeric not null,
  iva_tipo numeric not null,
  iva_cuota numeric not null,
  total numeric not null,
  exencion text,
  forma_pago forma_pago not null,
  rectifica_id uuid references facturas,
  motivo_rectificacion text,
  huella text not null,
  huella_anterior text,
  emitida_por uuid references perfiles on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  unique (serie, numero)
);
create index on facturas (fecha);
create index on facturas (pago_id);
create unique index una_rectificativa on facturas (rectifica_id) where rectifica_id is not null;

alter table datos_facturacion enable row level security;
alter table facturas enable row level security;
create policy direccion_todo on datos_facturacion for all using (mi_rol() = 'direccion') with check (mi_rol() = 'direccion');
-- Facturas: dirección las ve; se crean solo con las funciones de abajo y nunca se cambian ni se borran
create policy direccion_ver on facturas for select using (mi_rol() = 'direccion');
create policy alumno_ver on facturas for select using (alumno_id = mi_alumno());

-- Siguiente número de una serie, sin huecos. Bloquea la emisión de facturas hasta acabar la
-- transacción, así tampoco se cruzan dos facturas al encadenar las huellas.
create function siguiente_factura(p_serie text) returns int
language plpgsql as $$
declare
  v int;
begin
  perform pg_advisory_xact_lock(hashtext('facturas'));
  select coalesce(max(numero), 0) + 1 into v from facturas where serie = p_serie;
  return v;
end $$;

-- Huella encadenada: datos clave de la factura más la huella de la anterior
create function huella_factura(f facturas, p_anterior text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(concat_ws('|',
    (f.emisor ->> 'nif'), f.serie, f.numero::text, f.fecha::text, f.cliente_nif, f.total::text, f.iva_cuota::text, coalesce(p_anterior, '')
  ), 'UTF8')), 'hex')
$$;

-- Factura vigente de un pago: la que no es rectificativa ni está anulada por una
create function factura_vigente(p_pago uuid) returns uuid
language sql stable as $$
  select f.id from facturas f
  where f.pago_id = p_pago and f.rectifica_id is null
    and not exists (select 1 from facturas r where r.rectifica_id = f.id)
  limit 1
$$;

-- Emite la factura de un pago (efectivo o banco) con los datos actuales de la academia y del alumno.
-- Si la que tenía se anuló (p. ej. faltaba el NIF), emite una nueva.
create function emitir_factura(p_pago uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d datos_facturacion;
  p pagos;
  a alumnos;
  f facturas;
  v_total numeric;
  v_base numeric;
  v_anterior text;
begin
  if mi_rol() is distinct from 'direccion' then raise exception 'Solo dirección puede emitir facturas'; end if;
  select * into d from datos_facturacion where id = 1;
  if d.razon_social = '' or d.nif = '' or d.domicilio = '' then
    raise exception 'Faltan los datos fiscales de la academia (Facturas → Datos de facturación)';
  end if;
  select * into p from pagos where id = p_pago;
  if not found then raise exception 'Pago no encontrado'; end if;
  if p.forma = 'regalado' then raise exception 'Una cuota regalada no se factura'; end if;
  perform pg_advisory_xact_lock(hashtext('pago:' || p_pago::text));
  f.id := factura_vigente(p_pago);
  if f.id is not null then return f.id; end if;
  select * into a from alumnos where id = p.alumno_id;
  v_total := coalesce(p.importe, a.cuota_importe, d.precio_cuota);
  if v_total is null or v_total <= 0 then raise exception 'Falta el importe de la cuota (Facturas → Datos de facturación)'; end if;
  v_base := round(v_total / (1 + d.iva / 100), 2);

  f.id := gen_random_uuid();
  f.serie := d.serie || extract(year from hoy_es())::text;
  f.numero := siguiente_factura(f.serie);
  f.fecha := hoy_es();
  f.mes_cuota := p.mes;
  f.pago_id := p.id;
  f.alumno_id := a.id;
  f.tipo := case when coalesce(a.nif, '') <> '' then 'completa' else 'simplificada' end;
  f.emisor := to_jsonb(d) - 'id' - 'precio_cuota' - 'serie';
  f.cliente_nombre := a.nombre || ' ' || a.apellidos;
  f.cliente_nif := nullif(a.nif, '');
  f.cliente_domicilio := nullif(a.domicilio, '');
  f.concepto := d.concepto || ' · ' || p.mes;
  f.base := v_base;
  f.iva_tipo := d.iva;
  f.iva_cuota := v_total - v_base;
  f.total := v_total;
  f.exencion := case when d.iva = 0 then d.exencion end;
  f.forma_pago := p.forma;
  select huella into v_anterior from facturas order by creado_en desc, numero desc limit 1;
  f.huella_anterior := v_anterior;
  f.huella := huella_factura(f, v_anterior);
  f.emitida_por := auth.uid();
  f.creado_en := now();
  insert into facturas select (f).*;
  update pagos set importe = v_total where id = p.id and importe is null;
  return f.id;
end $$;

-- Anula una factura con una rectificativa por el importe en negativo
create function rectificar_factura(p_factura uuid, p_motivo text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o facturas;
  r facturas;
  v_anterior text;
begin
  if mi_rol() is distinct from 'direccion' then raise exception 'Solo dirección puede rectificar facturas'; end if;
  select * into o from facturas where id = p_factura;
  if not found or o.rectifica_id is not null then raise exception 'Factura no encontrada'; end if;
  perform pg_advisory_xact_lock(hashtext('rectifica:' || p_factura::text));
  select id into r.id from facturas where rectifica_id = p_factura;
  if r.id is not null then return r.id; end if;
  r := o;
  r.id := gen_random_uuid();
  r.serie := 'R' || o.serie;
  r.numero := siguiente_factura(r.serie);
  r.fecha := hoy_es();
  r.base := -o.base;
  r.iva_cuota := -o.iva_cuota;
  r.total := -o.total;
  r.rectifica_id := o.id;
  r.motivo_rectificacion := coalesce(nullif(trim(p_motivo), ''), 'Anulación');
  select huella into v_anterior from facturas order by creado_en desc, numero desc limit 1;
  r.huella_anterior := v_anterior;
  r.huella := huella_factura(r, v_anterior);
  r.emitida_por := auth.uid();
  r.creado_en := now();
  insert into facturas select (r).*;
  return r.id;
end $$;

revoke execute on function emitir_factura(uuid), rectificar_factura(uuid, text), siguiente_factura(text), factura_vigente(uuid) from public, anon;
grant execute on function emitir_factura(uuid), rectificar_factura(uuid, text) to authenticated;


-- Endurece las funciones de 0007: si no hay rol, también se rechaza
create or replace function validar_marca(p_marca uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  m sesion_marcas;
  v_alumno uuid;
  v_fecha date;
  v_prueba uuid;
  v_resultado uuid;
begin
  select * into m from sesion_marcas where id = p_marca;
  if not found then raise exception 'Marca no encontrada'; end if;
  select s.alumno_id, p.fecha, e.prueba_id into v_alumno, v_fecha, v_prueba
  from sesiones s join planes p on p.id = s.plan_id join plan_ejercicios e on e.id = m.ejercicio_id
  where s.id = m.sesion_id;
  if not coalesce(mi_rol() = 'direccion' or (mi_rol() = 'preparador' and es_preparador_de(v_alumno)), false) then
    raise exception 'Solo su preparador o dirección pueden validar esta marca';
  end if;
  if v_prueba is null then raise exception 'Este ejercicio no es una prueba oficial'; end if;
  if m.valor is null then raise exception 'No hay marca que validar'; end if;
  if m.resultado_id is not null then return m.resultado_id; end if;
  insert into resultados (alumno_id, prueba_id, fecha, marca, registrado_por)
  values (v_alumno, v_prueba, v_fecha, m.valor, auth.uid())
  returning id into v_resultado;
  update sesion_marcas set resultado_id = v_resultado, validada_por = auth.uid() where id = p_marca;
  return v_resultado;
end $$;

create or replace function anular_validacion(p_marca uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m sesion_marcas;
  v_alumno uuid;
begin
  select * into m from sesion_marcas where id = p_marca;
  if not found then raise exception 'Marca no encontrada'; end if;
  select alumno_id into v_alumno from sesiones where id = m.sesion_id;
  if not coalesce(mi_rol() = 'direccion' or (mi_rol() = 'preparador' and es_preparador_de(v_alumno)), false) then
    raise exception 'Solo su preparador o dirección pueden anular esta validación';
  end if;
  update sesion_marcas set resultado_id = null, validada_por = null where id = p_marca;
  delete from resultados where id = m.resultado_id;
end $$;
