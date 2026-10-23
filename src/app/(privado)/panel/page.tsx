import Link from "next/link";
import { exigirRol, listarAlumnos } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

// Igual que en Informes: sin marcas en este tiempo, el alumno necesita atención
const DIAS_SIN_MARCAS = 21;
const ZONA = "Europe/Madrid";

// Medianoche de hoy en Madrid, con su desfase (horario de verano o de invierno)
function inicioDeHoy(): string {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("sv-SE", { timeZone: ZONA });
  const desfase = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, timeZoneName: "longOffset" })
    .formatToParts(ahora)
    .find((p) => p.type === "timeZoneName")
    ?.value.replace("GMT", "");
  return `${fecha}T00:00:00${desfase || "+00:00"}`;
}

function haceDias(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
}

export default async function Panel() {
  const perfil = await exigirRol("direccion", "preparador");
  const direccion = perfil.rol === "direccion";
  const supabase = await createClient();

  const alumnos = await listarAlumnos(direccion ? undefined : perfil.id);
  const ids = alumnos.map((a) => a.id);
  const [{ data: conMarcas }, { count: marcasSemana }, { count: sinAcceso }, { data: entradasHoy }] = await Promise.all([
    supabase.from("resultados").select("alumno_id").in("alumno_id", ids).gte("fecha", haceDias(DIAS_SIN_MARCAS)),
    supabase.from("resultados").select("id", { count: "exact", head: true }).in("alumno_id", ids).gte("fecha", haceDias(7)),
    direccion
      ? supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("activo", true).is("perfil_id", null)
      : Promise.resolve({ count: null }),
    direccion
      ? supabase.from("accesos").select("alumno_id, permitido").gte("momento", inicioDeHoy())
      : Promise.resolve({ data: null }),
  ]);

  const activos = new Set((conMarcas ?? []).map((r) => r.alumno_id));
  const sinMarcas = alumnos.filter((a) => !activos.has(a.id)).length;
  const sinGrupo = alumnos.filter((a) => !a.grupo).length;
  const cuotasPendientes = alumnos.filter((a) => !a.cuota_al_dia).length;
  const dentroHoy = new Set((entradasHoy ?? []).filter((e) => e.permitido).map((e) => e.alumno_id)).size;
  const rechazadasHoy = (entradasHoy ?? []).filter((e) => !e.permitido).length;

  const pendientes: { cuantos: number; texto: string; href: string; accion: string }[] = [
    { cuantos: sinMarcas, texto: `sin marcas en ${DIAS_SIN_MARCAS} días`, href: "/informes", accion: "Ver en Informes" },
    ...(direccion
      ? [
          { cuantos: cuotasPendientes, texto: "con la cuota pendiente", href: "/cuotas", accion: "Ir a Cuotas" },
          { cuantos: sinGrupo, texto: "sin grupo", href: "/alumnos?grupo=sin", accion: "Ver alumnos" },
          { cuantos: sinAcceso ?? 0, texto: "sin acceso a la app", href: "/personal", accion: "Dar acceso" },
        ]
      : []),
  ].filter((p) => p.cuantos > 0);

  const acciones: { href: string; titulo: string; texto: string }[] = [
    { href: "/registrar", titulo: "Registrar marca", texto: "Apunta una marca de un alumno" },
    { href: "/simulacro", titulo: "Simulacro de grupo", texto: "Mide a todo el grupo en una prueba" },
    ...(direccion
      ? [
          { href: "/acceso", titulo: "Control de acceso", texto: "Lee el QR de quien entra" },
          { href: "/alumnos/nuevo", titulo: "Dar de alta", texto: "Un alumno nuevo" },
        ]
      : [{ href: "/informes", titulo: "Informes", texto: "Cómo va cada grupo" }]),
  ];

  const hoy = new Date().toLocaleDateString("es-ES", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <div>
        <h1>Hola, {perfil.nombre.split(" ")[0]}</h1>
        <p className="sub">{hoy.charAt(0).toUpperCase() + hoy.slice(1)}</p>
      </div>

      <div className="atajos">
        {acciones.map((a) => (
          <Link key={a.href} href={a.href} className="atajo">
            <strong>{a.titulo}</strong>
            <span>{a.texto}</span>
          </Link>
        ))}
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Para revisar</h2>
          {pendientes.length === 0 ? (
            <p className="sub">Todo en orden. No hay nada pendiente.</p>
          ) : (
            <ul className="pendientes">
              {pendientes.map((p) => (
                <li key={p.href}>
                  <span className="cuantos">{p.cuantos}</span>
                  <span>{p.cuantos === 1 ? "alumno" : "alumnos"} {p.texto}</span>
                  <Link href={p.href} className="btn ghost">{p.accion}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>{direccion ? "La academia" : "Tus grupos"}</h2>
          <div className="cifras">
            <Link href="/alumnos" className="dato"><span className="v">{alumnos.length}</span>alumnos activos</Link>
            <div className="dato"><span className="v">{marcasSemana ?? 0}</span>marcas esta semana</div>
            {direccion && <Link href="/cuotas" className="dato"><span className="v">{dentroHoy}</span>han entrado hoy</Link>}
            {direccion && rechazadasHoy > 0 && (
              <Link href="/cuotas" className="dato"><span className="v">{rechazadasHoy}</span>entradas rechazadas hoy</Link>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
