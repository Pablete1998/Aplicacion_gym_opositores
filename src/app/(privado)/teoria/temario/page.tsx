import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { listarTemario } from "@/lib/temario-archivos";
import { clave, esDeAlumno, nombreOposicion, oposicionDelAlumno, revisiones, vigente } from "./datos";

const fecha = (f: string) => new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });

export default async function Temario({ searchParams }: PageProps<"/teoria/temario">) {
  const perfil = await exigirRol("direccion", "preparador", "alumno");
  const sp = await searchParams;
  const alumno = perfil.rol === "alumno";
  const [todos, revs, miOposicion] = await Promise.all([listarTemario(), revisiones(), alumno ? oposicionDelAlumno() : null]);

  const oposiciones = [...new Set(todos.map((t) => t.oposicion))];
  const elegida = alumno ? null : (oposiciones.find((o) => o === sp.oposicion) ?? oposiciones[0] ?? null);
  const temas = alumno ? todos.filter((t) => esDeAlumno(t, miOposicion) && vigente(t, revs)) : todos.filter((t) => t.oposicion === elegida);
  const pendientes = temas.filter((t) => !vigente(t, revs)).length;

  return (
    <>
      <div>
        <p className="sub"><Link href="/teoria">← Teoría</Link></p>
        <h1>Temario</h1>
        <p className="sub">
          {alumno
            ? "Los apuntes y esquemas de cada tema, sacados de las leyes vigentes del BOE y revisados por tus preparadores."
            : "Apuntes y esquemas de cada tema, sacados del temario de la última convocatoria y de los textos vigentes del BOE. Los alumnos solo ven los temas que un preparador ha revisado."}
        </p>
      </div>

      {!alumno && oposiciones.length > 1 && (
        <form className="campos" action="/teoria/temario">
          <label>
            Oposición
            <select name="oposicion" defaultValue={elegida ?? ""}>
              {oposiciones.map((o) => <option key={o} value={o}>{nombreOposicion(o)}</option>)}
            </select>
          </label>
          <button className="btn ghost">Ver</button>
        </form>
      )}
      {!alumno && pendientes > 0 && <p className="aviso medias">{pendientes} {pendientes === 1 ? "tema pendiente" : "temas pendientes"} de revisar.</p>}

      <section className="panel">
        {temas.length ? (
          <div className="tbl">
            <table>
              <thead><tr><th>Tema</th>{!alumno && <th>Estado</th>}<th>Preguntas</th><th>Actualizado</th></tr></thead>
              <tbody>
                {temas.map((t) => {
                  const r = revs.get(clave(t));
                  return (
                    <tr key={clave(t)}>
                      <td>
                        <Link href={`/teoria/temario/${t.carpeta}/${t.tema}`}>{t.tema ? `${t.tema}. ` : ""}{t.titulo}</Link>
                        {alumno && t.oposicion !== miOposicion && <span className="sub"> · común</span>}
                      </td>
                      {!alumno && (
                        <td>
                          {vigente(t, revs) ? (
                            <span className="pill p-objetivo">Revisado{r?.quien ? ` · ${r.quien}` : ""}</span>
                          ) : r ? (
                            <span className="pill p-apto">Cambió desde la revisión</span>
                          ) : (
                            <span className="pill p-apto">Sin revisar</span>
                          )}
                        </td>
                      )}
                      <td>{t.preguntas || ""}</td>
                      <td>{fecha(t.actualizado)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="sub">{alumno ? "Aún no hay temas revisados de tu oposición. Irán apareciendo aquí." : "Aún no hay temas escritos de esta oposición."}</p>
        )}
      </section>
    </>
  );
}
