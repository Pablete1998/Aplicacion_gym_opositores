# Academia Opositores

Web-app para una academia de opositores (Policía Nacional, Guardia Civil, Bombero, Fuerzas Armadas y más adelante otras).
Fase 1: seguimiento de pruebas físicas y teóricas, evolución de cada alumno frente al baremo y control de acceso por QR.

## Qué hay

| Ruta | Para quién | Qué hace |
| --- | --- | --- |
| `/login` | Todos | Entrada con correo y contraseña |
| `/alumnos` | Dirección, preparadores | Lista de alumnos (cada preparador ve solo sus grupos) |
| `/alumnos/[id]` | Dirección, preparadores | Ficha: situación frente al baremo, gráfica de evolución e historial |
| `/registrar` | Dirección, preparadores | Registrar una marca (acepta `11,4`, `8` o `3:45`) |
| `/acceso` | Recepción, dirección | Lector de QR: registra la entrada y la deniega si la cuota está pendiente |
| `/mi` | Alumno | Su evolución y su QR de acceso |

Las oposiciones son datos: cada una tiene sus pruebas (unidad y si más es mejor) y sus baremos (mínimo y objetivo, por sexo y edad).
Añadir una oposición nueva no requiere tocar código.

Los permisos están en la base de datos con seguridad por filas (`supabase/migrations/0001_esquema.sql`):
dirección ve todo, el preparador solo sus grupos, el alumno solo lo suyo y recepción solo puede registrar accesos.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) en una región de la UE.
2. En el editor SQL, ejecuta `supabase/migrations/0001_esquema.sql` y después `supabase/seed.sql`.
3. Copia `.env.example` a `.env.local` y rellena la URL y la clave pública del proyecto.
4. `npm install` y `npm run dev`.
5. Crea los usuarios en Supabase (Authentication → Users). Cada usuario nuevo empieza con rol `alumno`;
   cambia el rol en la tabla `perfiles` y vincula a los alumnos con `alumnos.perfil_id`.

> Los baremos de `seed.sql` son **orientativos**. Antes de usar la app con alumnos hay que cargar los oficiales de cada convocatoria.

## Comprobaciones

```bash
npm test        # lógica de baremos
npm run lint
npm run build
```

## Pendiente

- Formularios de alta de alumnos, grupos y oposiciones (hoy se hace desde Supabase).
- Avisos a grupos (la tabla y los permisos ya existen).
- Lectura del QR con la cámara de la tablet (hoy funciona con lector USB/Bluetooth o pegando el código).
- Tipos generados con `supabase gen types` en lugar del ayudante `uno()`.
- Fase 2: banco de test, temario basado en el BOE y vídeos.
