-- Baremos oficiales de las últimas convocatorias publicadas en el BOE.
-- Añade pruebas solo para un sexo (p. ej. dominadas en hombres y suspensión en mujeres),
-- tablas de puntos de 0 a 10 (Policía Nacional) y la fuente de cada baremo.
-- Se puede ejecutar sobre una base con seed.sql ya cargado: actualiza los datos existentes.

alter table pruebas add column sexo sexo;                  -- null = la hacen hombres y mujeres
alter table oposiciones add column baremo_fuente text;
-- puntos[i] = marca necesaria para obtener i puntos (de 1 a 10). Solo en oposiciones que puntúan
alter table baremos add column puntos numeric[] check (puntos is null or cardinality(puntos) = 10);

-- ---------- Policía Nacional, Escala Básica ----------
-- Resolución de 31 de julio de 2025 (BOE-A-2025-16610), anexo II. Cada ejercicio puntúa de 0 a 10,
-- un 0 elimina y hay que sacar 5 de media. Mínimo = marca de 5 puntos; objetivo = marca de 8 puntos.

update oposiciones set baremo_fuente = 'BOE-A-2025-16610 (Resolución de 31 de julio de 2025), anexo II'
where nombre = 'Policía Nacional';

insert into pruebas (oposicion_id, nombre, tipo, unidad, mayor_es_mejor, orden, sexo)
select id, 'Suspensión en barra', 'fisica', 'segundos', true, 2, 'M' from oposiciones where nombre = 'Policía Nacional'
on conflict (oposicion_id, nombre) do nothing;
update pruebas set sexo = 'H'
where nombre = 'Dominadas' and oposicion_id = (select id from oposiciones where nombre = 'Policía Nacional');

-- ---------- Guardia Civil, Cabos y Guardias ----------
-- Resolución 160/38243/2026, de 5 de mayo (BOE-A-2026-9982), apéndice II. Apto / no apto por sexo y edad.

update oposiciones set baremo_fuente = 'BOE-A-2026-9982 (Resolución 160/38243/2026, de 5 de mayo), apéndice II'
where nombre = 'Guardia Civil';
update pruebas set nombre = 'Extensiones de brazos'
where nombre = 'Flexiones' and oposicion_id = (select id from oposiciones where nombre = 'Guardia Civil');
update pruebas set nombre = 'Circuito de agilidad y coordinación'
where nombre = 'Circuito de coordinación' and oposicion_id = (select id from oposiciones where nombre = 'Guardia Civil');

-- ---------- Fuerzas Armadas, Tropa y Marinería ----------
-- Resolución 452/38557/2025, de 29 de diciembre (BOE-A-2026-436), apéndice 4. Marcas de ingreso.

update oposiciones set baremo_fuente = 'BOE-A-2026-436 (Resolución 452/38557/2025, de 29 de diciembre), apéndice 4'
where nombre = 'Fuerzas Armadas';
update pruebas set nombre = 'Flexo-extensiones de brazos', orden = 1
where nombre = 'Flexiones' and oposicion_id = (select id from oposiciones where nombre = 'Fuerzas Armadas');
update pruebas set nombre = 'Circuito de agilidad-velocidad'
where nombre = 'Circuito de agilidad' and oposicion_id = (select id from oposiciones where nombre = 'Fuerzas Armadas');
insert into pruebas (oposicion_id, nombre, tipo, unidad, mayor_es_mejor, orden)
select id, 'Plancha isométrica', 'fisica', 'segundos', true, 2 from oposiciones where nombre = 'Fuerzas Armadas'
on conflict (oposicion_id, nombre) do nothing;
-- El salto horizontal ya no está en la convocatoria; se borra solo si nadie tiene marcas en él
delete from pruebas p
where p.nombre = 'Salto horizontal'
  and p.oposicion_id = (select id from oposiciones where nombre = 'Fuerzas Armadas')
  and not exists (select 1 from resultados r where r.prueba_id = p.id);

-- ---------- Bombero ----------
-- No hay convocatoria estatal: cada ayuntamiento, diputación o consorcio publica la suya.
update oposiciones set baremo_fuente = 'Orientativo: depende de la convocatoria de cada ayuntamiento o consorcio'
where nombre = 'Bombero';

-- ---------- Baremos ----------
-- Se sustituyen los baremos de las tres oposiciones con convocatoria oficial.

delete from baremos where prueba_id in (
  select p.id from pruebas p join oposiciones o on o.id = p.oposicion_id
  where o.nombre in ('Policía Nacional', 'Guardia Civil', 'Fuerzas Armadas') and p.tipo = 'fisica'
);

with b (oposicion, prueba, sexo, edad_min, edad_max, minima, objetivo, puntos) as (values
  -- Policía Nacional: tiempos en segundos (máximo para cada punto) y repeticiones (mínimo)
  ('Policía Nacional', 'Circuito de agilidad', 'H', 0, 120, 10.5, 9.3, '{11.6,11.4,11.2,10.9,10.5,10.1,9.7,9.3,8.8,8.2}'),
  ('Policía Nacional', 'Circuito de agilidad', 'M', 0, 120, 11.6, 10.3, '{12.7,12.5,12.3,12.0,11.6,11.2,10.8,10.3,9.8,9.3}'),
  ('Policía Nacional', 'Dominadas', 'H', 0, 120, 10, 15, '{5,6,7,8,10,12,14,15,16,17}'),
  ('Policía Nacional', 'Suspensión en barra', 'M', 0, 120, 57, 78, '{36,41,46,52,57,63,70,78,86,95}'),
  ('Policía Nacional', 'Carrera 1000 m', 'H', 0, 120, 204, 186, '{228,222,216,210,204,198,192,186,180,174}'),
  ('Policía Nacional', 'Carrera 1000 m', 'M', 0, 120, 249, 222, '{285,276,267,258,249,240,231,222,213,204}'),
  -- Guardia Civil: menos de 35, de 35 a 39 y 40 o más
  ('Guardia Civil', 'Carrera 2000 m', 'H', 0, 34, 565, null, null),
  ('Guardia Civil', 'Carrera 2000 m', 'H', 35, 39, 588, null, null),
  ('Guardia Civil', 'Carrera 2000 m', 'H', 40, 120, 633, null, null),
  ('Guardia Civil', 'Carrera 2000 m', 'M', 0, 34, 674, null, null),
  ('Guardia Civil', 'Carrera 2000 m', 'M', 35, 39, 695, null, null),
  ('Guardia Civil', 'Carrera 2000 m', 'M', 40, 120, 769, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'H', 0, 34, 14.0, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'H', 35, 39, 14.4, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'H', 40, 120, 15.1, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'M', 0, 34, 16.0, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'M', 35, 39, 16.4, null, null),
  ('Guardia Civil', 'Circuito de agilidad y coordinación', 'M', 40, 120, 17.9, null, null),
  ('Guardia Civil', 'Extensiones de brazos', 'H', 0, 39, 16, null, null),
  ('Guardia Civil', 'Extensiones de brazos', 'H', 40, 120, 14, null, null),
  ('Guardia Civil', 'Extensiones de brazos', 'M', 0, 39, 11, null, null),
  ('Guardia Civil', 'Extensiones de brazos', 'M', 40, 120, 9, null, null),
  ('Guardia Civil', 'Natación 50 m', 'H', 0, 34, 70, null, null),
  ('Guardia Civil', 'Natación 50 m', 'H', 35, 39, 71, null, null),
  ('Guardia Civil', 'Natación 50 m', 'H', 40, 120, 73, null, null),
  ('Guardia Civil', 'Natación 50 m', 'M', 0, 34, 81, null, null),
  ('Guardia Civil', 'Natación 50 m', 'M', 35, 39, 83, null, null),
  ('Guardia Civil', 'Natación 50 m', 'M', 40, 120, 88, null, null),
  -- Fuerzas Armadas: marcas de ingreso
  ('Fuerzas Armadas', 'Flexo-extensiones de brazos', 'H', 0, 120, 9, null, null),
  ('Fuerzas Armadas', 'Flexo-extensiones de brazos', 'M', 0, 120, 5, null, null),
  ('Fuerzas Armadas', 'Plancha isométrica', null, 0, 120, 40, null, null),
  ('Fuerzas Armadas', 'Carrera 2000 m', 'H', 0, 120, 714, null, null),
  ('Fuerzas Armadas', 'Carrera 2000 m', 'M', 0, 120, 778, null, null),
  ('Fuerzas Armadas', 'Circuito de agilidad-velocidad', 'H', 0, 120, 15.4, null, null),
  ('Fuerzas Armadas', 'Circuito de agilidad-velocidad', 'M', 0, 120, 17.1, null, null)
)
insert into baremos (prueba_id, sexo, edad_min, edad_max, marca_minima, marca_objetivo, puntos)
select p.id, b.sexo::sexo, b.edad_min, b.edad_max, b.minima, b.objetivo, b.puntos::numeric[]
from b
join oposiciones o on o.nombre = b.oposicion
join pruebas p on p.oposicion_id = o.id and p.nombre = b.prueba;
