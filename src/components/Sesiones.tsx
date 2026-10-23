import { uno } from "@/lib/datos";
import { evolucionEjercicios, formatoEjercicio, SENSACIONES, type EjercicioHecho } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";

const FECHA = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const MOSTRAR = 20;

// Diario de entrenamiento de un alumno: evolución de cada ejercicio y sus últimas sesiones
export async function Sesiones({ alumnoId, titulo = "Sesiones de entrenamiento" }: { alumnoId: string; titulo?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sesiones")
    .select("id, terminada_en, sensacion, notas, planes(fecha, titulo), sesion_marcas(valor, hecho, plan_ejercicios(nombre, unidad, orden))")
    .eq("alumno_id", alumnoId)
    .order("empezada_en", { ascending: false })
    .limit(100);
  // Si la migración 0006 aún no está aplicada, la consulta falla y no se muestra nada
  if (!data || data.length === 0) {
    return (
      <section className="panel" id="sesiones">
        <h2>{titulo}</h2>
        <p className="sub">Todavía no hay sesiones. Aparecerán aquí al empezar la sesión del día desde el móvil.</p>
      </section>
    );
  }

  const sesiones = data.map((s) => {
    const plan = uno(s.planes);
    return {
      ...s,
      fecha: plan?.fecha ?? "",
      titulo: plan?.titulo ?? "",
      marcas: s.sesion_marcas
        .map((m) => ({ ...m, ejercicio: uno(m.plan_ejercicios) }))
        .filter((m) => m.ejercicio)
        .sort((a, b) => a.ejercicio!.orden - b.ejercicio!.orden),
    };
  });
  const hechos: EjercicioHecho[] = sesiones.flatMap((s) =>
    s.marcas.map((m) => ({ nombre: m.ejercicio!.nombre, unidad: m.ejercicio!.unidad, valor: m.valor === null ? null : Number(m.valor), fecha: s.fecha })),
  );
  const evolucion = evolucionEjercicios(hechos).filter((e) => e.serie.length > 1);

  return (
    <section className="panel" id="sesiones">
      <h2>{titulo}</h2>
      <p className="sub">{sesiones.filter((s) => s.terminada_en).length} sesiones terminadas.</p>
      {evolucion.length > 0 && (
        <>
          <h3>Cómo evoluciona cada ejercicio</h3>
          <ul className="evolucion">
            {evolucion.map((e) => {
              const ultimas = e.serie.slice(-6);
              return (
                <li key={`${e.nombre}|${e.unidad}`}>
                  <strong>{e.nombre}</strong>
                  <span className="num">{ultimas.map((s) => formatoEjercicio(e.unidad, s.valor)).join(" → ")}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="tbl">
        <table>
          <thead><tr><th>Día</th><th>Sesión</th><th>Sensación</th><th>Lo apuntado</th></tr></thead>
          <tbody>
            {sesiones.slice(0, MOSTRAR).map((s) => (
              <tr key={s.id}>
                <td className="num">{s.fecha && FECHA.format(new Date(`${s.fecha}T12:00:00Z`))}</td>
                <td>{s.titulo}{!s.terminada_en && <> <span className="pill p-apto">Sin terminar</span></>}</td>
                <td>{s.sensacion ? SENSACIONES[s.sensacion] : ""}{s.notas && <div className="sub">{s.notas}</div>}</td>
                <td className="apuntado">
                  {s.marcas.length === 0 ? <span className="sub">Nada</span> : s.marcas.map((m) => (
                    <span key={m.ejercicio!.nombre}>{m.ejercicio!.nombre}: <span className="num">{formatoEjercicio(m.ejercicio!.unidad, m.valor === null ? null : Number(m.valor))}</span></span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
