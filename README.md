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
| `/mi` | Alumno | Su evolución y su QR de acceso |

Las oposiciones son datos: cada una tiene sus pruebas (unidad y si más es mejor) y sus baremos (mínimo y objetivo, por sexo y edad).
Añadir una oposición nueva no requiere tocar código.

Los permisos están en la base de datos con seguridad por filas (`supabase/migrations/0001_esquema.sql`):
dirección ve todo, el preparador solo sus grupos, el alumno solo lo suyo y recepción solo puede registrar accesos.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) en una región de la UE.
2. En el editor SQL, ejecuta en orden `supabase/migrations/0001_esquema.sql`, `supabase/seed.sql`, `supabase/migrations/0002_personal.sql`, `supabase/migrations/0003_baremos_oficiales.sql`, `supabase/migrations/0004_ranking_y_toques.sql`, `supabase/migrations/0005_pagos.sql`, `supabase/migrations/0006_sesiones.sql` y `supabase/migrations/0007_testigo.sql`.
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
- Fase 2: banco de test, temario basado en el BOE y vídeos.
