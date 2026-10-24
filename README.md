# Academia Opositores

Web-app para una academia de opositores (Policía Nacional, Guardia Civil, Bombero, Fuerzas Armadas y más adelante otras).
Fase 1: seguimiento de pruebas físicas y teóricas, evolución de cada alumno frente al baremo y control de acceso por QR.

## Qué hay

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/login` | Todos | Entrada con correo y contraseña |
| `/alumnos` | Dirección, preparadores | Lista de alumnos (cada preparador ve solo sus grupos) |
| `/alumnos/nuevo`, `/alumnos/[id]/editar` | Dirección | Alta y edición de alumnos (cuota, grupo, baja) |
| `/alumnos/[id]` | Dirección, preparadores | Ficha: situación frente al baremo, gráfica de evolución e historial |
| `/registrar` | Dirección, preparadores | Registrar una marca (acepta `11,4`, `8` o `3:45`) |
| `/personal` | Dirección | Dar acceso (contraseña provisional), cambiar rol, quitar acceso y asignar preparadores a grupos |
| `/cuenta` | Todos | Cambiar la contraseña (obligatorio tras una provisional) |
| `/acceso` | Recepción, dirección | Lector de QR: registra la entrada y la deniega si la cuota está pendiente |
| `/mi` | Alumno | Su evolución, su QR de acceso y sus facturas |
| `/rankings` | Todos menos recepción | La mejor marca de cada alumno en cada prueba, de toda la academia o por oposición, mujeres y hombres por separado, con el mote de cada uno si tiene |
| `/facturas` | Dirección | Facturas de las cuotas (salen solas al marcar una cuota pagada), rectificativas, datos fiscales y CSV para el gestor por mes o trimestre |
| `/teoria` | Dirección, preparadores, alumnos | Portada de la parte teórica: de aquí salen el banco, los tests y lo que venga |
| `/teoria/banco` | Dirección, preparadores | Banco de preguntas tipo test por oposición y tema, más un banco común a todas (psicotécnicos, ortografía…): alta una a una con imagen opcional, edición, retirar o borrar |
| `/teoria/banco/importar` | Dirección, preparadores | Pegar preguntas copiadas de Excel (o subir un CSV); crea los temas que falten y salta las repetidas |
| `/teoria/tests` | Alumno | Práctica por temas (corrige al momento), simulacro con tiempo (los fallos restan) y repaso de fallos; cómo va en cada tema |
| `/teoria/repaso` | Alumno | Repaso diario tipo Anki con las preguntas del banco: 20 nuevas al día y las que tocan; Otra vez, Difícil, Bien o Fácil decide cuándo vuelve cada una (`src/lib/repaso.ts`) |
| `/teoria/tests/[id]` | Alumno, dirección, su preparador | El test en marcha o su corrección. Los tests de cada alumno salen también en su ficha |
| `/facturas/[id]` | Dirección, el alumno | Factura para imprimir o guardar en PDF |

Las oposiciones son datos: cada una tiene sus pruebas (unidad y si más es mejor) y sus baremos (mínimo y objetivo, por sexo y edad).
Añadir una oposición nueva no requiere tocar código.

Los permisos están en la base de datos con seguridad por filas (`supabase/migrations/0001_esquema.sql`):
dirección ve todo, el preparador solo sus grupos, el alumno solo lo suyo y recepción solo puede registrar accesos.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) en una región de la UE.
2. En el editor SQL, ejecuta en orden `supabase/migrations/0001_esquema.sql`, `supabase/seed.sql`, `supabase/migrations/0002_personal.sql`, `supabase/migrations/0003_baremos_oficiales.sql`, `supabase/migrations/0004_ranking_y_toques.sql`, `supabase/migrations/0005_pagos.sql`, `supabase/migrations/0006_sesiones.sql`, `supabase/migrations/0007_testigo.sql`, `supabase/migrations/0008_facturas.sql`, `supabase/migrations/0009_rankings.sql`, `supabase/migrations/0010_seguridad.sql`, `supabase/migrations/0011_banco_tests.sql`, `supabase/migrations/0012_tests_alumnos.sql`, `supabase/migrations/0013_repaso_espaciado.sql` y `supabase/migrations/0014_comun_e_imagenes.sql`.
3. Copia `.env.example` a `.env.local` y rellena la URL, la clave pública y la clave secreta del proyecto.
   La clave secreta (`SUPABASE_SECRET_KEY`) solo se usa en el servidor para crear accesos; en Vercel va como tipo Secret.
4. `npm install` y `npm run dev`.
5. Crea el primer usuario de dirección en Supabase (Authentication → Users) y ponle `rol = 'direccion'` en `perfiles`.
   El resto de accesos se crean desde la página Personal de la app.

> `0003_baremos_oficiales.sql` carga los baremos de las últimas convocatorias del BOE (Policía Nacional, Guardia Civil y Fuerzas Armadas). Los de Bombero siguen siendo **orientativos** porque dependen de cada ayuntamiento o consorcio. Se editan desde **Oposiciones** en la app.

## Comprobaciones

```bash
npm test        # lógica de baremos
npm run lint
npm run build
```

## Pendiente

- Formularios de grupos y oposiciones (hoy desde Supabase).
- Avisos a grupos (la tabla y los permisos ya existen).
- Lectura del QR con la cámara de la tablet (hoy funciona con lector USB/Bluetooth o pegando el código).
- Tipos generados con `supabase gen types` en lugar del ayudante `uno()`.
- Fase 2: temario y esquemas por tema, ortografía, plan de estudio, nota estimada y avisos del BOE.
