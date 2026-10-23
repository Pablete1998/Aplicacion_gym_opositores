import Link from "next/link";
import { exigirRol, uno } from "@/lib/datos";
import { formatoEjercicio, hoyEnEspana, SENSACIONES } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";
import { anularValidacion, borrarPlan, copiarUltimo, validarMarca } from "./actions";
import { PlanForm } from "./PlanForm";

const FECHA = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default async function Planificar({ searchParams }: PageProps<"/planificar">) {
  const perfil = await exigirRol("direccion", "preparador");
  const { grupo: grupoParam, fecha: fechaParam, guardado } = await searchParams;
  const hoy = hoyEnEspana();
  const fecha = typeof fechaParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoy;
  const supabase = await createClient();

  let consulta = supabase.from("grupos").select("id, nombre, oposicion_id, oposiciones(nombre)").order("nombre");
  if (perfil.rol === "preparador") consulta = consulta.eq("preparador_id", perfil.id);
  const { data: grupos } = await consulta;
  const grupo = grupos?.find((g) => g.id === grupoParam) ?? grupos?.[0] ?? null;
  const enlace = (g: string, f: string) => `/planificar?grupo=${g}&fecha=${f}` as const;

  if (!grupo) {
    return (
      <section className="panel">
        <h1>Planificar sesiones</h1>
        <p className="sub">No llevas ningún grupo. Dirección puede asignártelo en Personal.</p>
      </section>
    );
  }

  const [{ data: plan }, { data: alumnos }, { data: pruebas }] = await Promise.all([
    supabase
      .from("planes")
      .select("id, titulo, notas, plan_ejercicios(id, nombre, pauta, unidad, prueba_id, orden), sesiones(alumno_id, terminada_en, sensacion, notas, sesion_marcas(id, ejercicio_id, valor, resultado_id))")
      .eq("grupo_id", grupo.id)
      .eq("fecha", fecha)
      .maybeSingle(),
    supabase.from("alumnos").select("id, nombre, apellidos, cuota_al_dia").eq("grupo_id", grupo.id).eq("activo", true).order("apellidos"),
    // Pruebas físicas de la oposición del grupo: un ejercicio puede ser una de ellas
    supabase.from("pruebas").select("id, nombre, unidad").eq("oposicion_id", grupo.oposicion_id).eq("tipo", "fisica").order("orden"),
  ]);
  const ejercicios = [...(plan?.plan_ejercicios ?? [])].sort((a, b) => a.orden - b.orden);
  const sesionDe = new Map((plan?.sesiones ?? []).map((s) => [s.alumno_id, s]));
  const hechas = (plan?.sesiones ?? []).filter((s) => s.terminada_en).length;
  // Ejercicios que son prueba oficial: sus marcas las puede validar el preparador como testigo
  const oficiales = new Map(ejercicios.filter((e) => e.prueba_id).map((e) => [e.id, e]));

  return (
    <>
      <div>
        <h1>Planificar sesiones</h1>
        <p className="sub">El plan del día de cada grupo. Los alumnos con la cuota al día lo ven en su móvil, empiezan la sesión y apuntan sus marcas.</p>
      </div>

      <section className="panel">
        <form className="campos">
          <label>
            Grupo
            <select name="grupo" defaultValue={grupo.id}>
              {grupos!.map((g) => <option key={g.id} value={g.id}>{g.nombre} · {uno(g.oposiciones)?.nombre}</option>)}
            </select>
          </label>
          <label>
            Día
            <input type="date" name="fecha" defaultValue={fecha} />
          </label>
          <button className="btn ghost">Ver</button>
        </form>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <Link href={enlace(grupo.id, sumarDias(fecha, -1))} className="btn ghost">← Día anterior</Link>
          {fecha !== hoy && <Link href={enlace(grupo.id, hoy)} className="btn ghost">Hoy</Link>}
          <Link href={enlace(grupo.id, sumarDias(fecha, 1))} className="btn ghost">Día siguiente →</Link>
        </div>
      </section>

      <section className="panel">
        <div className="row">
          <h2>{grupo.nombre} · {FECHA.format(new Date(`${fecha}T12:00:00Z`))}{fecha === hoy && " (hoy)"}</h2>
          {!plan && (
            <form action={copiarUltimo}>
              <input type="hidden" name="grupo" value={grupo.id} />
              <input type="hidden" name="fecha" value={fecha} />
              <button className="btn ghost">Copiar el último plan</button>
            </form>
          )}
        </div>
        {guardado && plan && <p className="aviso ok">Plan guardado. Los alumnos del grupo ya lo ven.</p>}
        {!plan && <p className="sub">Este día aún no tiene plan. Escríbelo o copia el último y ajústalo.</p>}
        <PlanForm
          key={[plan?.id, ...ejercicios.map((e) => e.id)].join()}
          grupo={grupo.id}
          fecha={fecha}
          titulo={plan?.titulo ?? ""}
          notas={plan?.notas ?? ""}
          ejercicios={ejercicios.map((e) => ({ id: e.id, nombre: e.nombre, pauta: e.pauta ?? "", unidad: e.unidad ?? "", prueba: e.prueba_id ?? "" }))}
          pruebas={pruebas ?? []}
        />
        {plan && (
          <details>
            <summary className="sub">Borrar el plan de este día</summary>
            <form action={borrarPlan} className="row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
              <input type="hidden" name="grupo" value={grupo.id} />
              <input type="hidden" name="fecha" value={fecha} />
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name="confirmo" required style={{ width: "auto" }} /> Sí, borrar el plan y lo que hayan apuntado
              </label>
              <button className="btn ghost">Borrar</button>
            </form>
          </details>
        )}
      </section>

      {plan && (
        <section className="panel">
          <h2>Quién la ha hecho</h2>
          <p className="sub">
            {hechas} de {alumnos?.length ?? 0} han terminado la sesión.
            {oficiales.size > 0 && " Si has visto una marca de prueba oficial, valídala y contará en su baremo, el ranking y los informes."}
          </p>
          <div className="tbl">
            <table>
              <thead><tr><th>Alumno</th><th>Sesión</th><th>Sensación</th><th>Nota</th>{oficiales.size > 0 && <th>Marcas oficiales</th>}</tr></thead>
              <tbody>
                {(alumnos ?? []).map((a) => {
                  const s = sesionDe.get(a.id);
                  return (
                    <tr key={a.id}>
                      <td><Link href={`/alumnos/${a.id}#sesiones`}>{a.apellidos}, {a.nombre}</Link></td>
                      <td>
                        {s?.terminada_en ? <span className="pill p-objetivo">Terminada</span>
                          : s ? <span className="pill p-apto">En curso · {s.sesion_marcas.length}/{ejercicios.length}</span>
                          : !a.cuota_al_dia ? <span className="pill p-no_apto">Cuota pendiente</span>
                          : <span className="sub">Sin empezar</span>}
                      </td>
                      <td>{s?.sensacion ? SENSACIONES[s.sensacion] : ""}</td>
                      <td>{s?.notas ?? ""}</td>
                      {oficiales.size > 0 && (
                        <td className="testigo">
                          {(s?.sesion_marcas ?? []).filter((m) => oficiales.has(m.ejercicio_id) && m.valor !== null).map((m) => {
                            const e = oficiales.get(m.ejercicio_id)!;
                            return (
                              <form key={m.id} action={m.resultado_id ? anularValidacion : validarMarca}>
                                <input type="hidden" name="marca" value={m.id} />
                                {e.nombre}: <span className="num">{formatoEjercicio(e.unidad, Number(m.valor))}</span>{" "}
                                {m.resultado_id ? (
                                  <><span className="pill p-objetivo">✓ Oficial</span> <button className="enlace">Anular</button></>
                                ) : (
                                  <button className="btn ghost">Validar</button>
                                )}
                              </form>
                            );
                          })}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
