-- Datos iniciales de ejemplo.
-- ATENCIÓN: las marcas mínimas y objetivo son ORIENTATIVAS. Antes de usar la app con alumnos
-- hay que sustituirlas por los baremos oficiales de cada convocatoria (BOE), por sexo y edad.

insert into oposiciones (nombre, cuerpo, fecha_examen) values
  ('Policía Nacional', 'Escala Básica', '2027-03-14'),
  ('Guardia Civil', 'Cabos y Guardias', '2027-05-22'),
  ('Bombero', 'Bombero conductor', '2027-02-06'),
  ('Fuerzas Armadas', 'Tropa y Marinería', '2027-04-10');

with p (oposicion, nombre, tipo, unidad, mayor_es_mejor, orden, minima, objetivo) as (values
  ('Policía Nacional', 'Circuito de agilidad', 'fisica', 'segundos', false, 1, 12.0, 10.6),
  ('Policía Nacional', 'Dominadas', 'fisica', 'repeticiones', true, 2, 5, 13),
  ('Policía Nacional', 'Carrera 1000 m', 'fisica', 'segundos', false, 3, 245, 195),
  ('Policía Nacional', 'Test de conocimientos', 'teorica', 'nota', true, 4, 5, 8),
  ('Guardia Civil', 'Carrera 2000 m', 'fisica', 'segundos', false, 1, 600, 470),
  ('Guardia Civil', 'Flexiones', 'fisica', 'repeticiones', true, 2, 16, 32),
  ('Guardia Civil', 'Natación 50 m', 'fisica', 'segundos', false, 3, 70, 45),
  ('Guardia Civil', 'Circuito de coordinación', 'fisica', 'segundos', false, 4, 14.0, 11.8),
  ('Guardia Civil', 'Test de conocimientos', 'teorica', 'nota', true, 5, 5, 8),
  ('Bombero', 'Natación 100 m', 'fisica', 'segundos', false, 1, 95, 72),
  ('Bombero', 'Dominadas', 'fisica', 'repeticiones', true, 2, 10, 20),
  ('Bombero', 'Press banca 40 kg', 'fisica', 'repeticiones', true, 3, 20, 38),
  ('Bombero', 'Carrera 3000 m', 'fisica', 'segundos', false, 4, 780, 650),
  ('Bombero', 'Test de conocimientos', 'teorica', 'nota', true, 5, 5, 8),
  ('Fuerzas Armadas', 'Salto horizontal', 'fisica', 'centimetros', true, 1, 170, 230),
  ('Fuerzas Armadas', 'Flexiones', 'fisica', 'repeticiones', true, 2, 14, 30),
  ('Fuerzas Armadas', 'Circuito de agilidad', 'fisica', 'segundos', false, 3, 15.5, 13.0),
  ('Fuerzas Armadas', 'Carrera 2000 m', 'fisica', 'segundos', false, 4, 640, 500),
  ('Fuerzas Armadas', 'Test de conocimientos', 'teorica', 'nota', true, 5, 5, 8)
), nuevas as (
  insert into pruebas (oposicion_id, nombre, tipo, unidad, mayor_es_mejor, orden)
  select o.id, p.nombre, p.tipo::tipo_prueba, p.unidad::unidad, p.mayor_es_mejor, p.orden
  from p join oposiciones o on o.nombre = p.oposicion
  returning id, oposicion_id, nombre
)
insert into baremos (prueba_id, marca_minima, marca_objetivo)
select n.id, p.minima, p.objetivo
from nuevas n join oposiciones o on o.id = n.oposicion_id
join p on p.oposicion = o.nombre and p.nombre = n.nombre;

insert into grupos (nombre, oposicion_id)
select g.nombre, o.id from (values
  ('PN mañana', 'Policía Nacional'), ('PN tarde', 'Policía Nacional'),
  ('GC tarde', 'Guardia Civil'), ('Bomberos', 'Bombero'), ('FAS fin de semana', 'Fuerzas Armadas')
) g (nombre, oposicion) join oposiciones o on o.nombre = g.oposicion;
