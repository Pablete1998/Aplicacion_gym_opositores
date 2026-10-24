import Link from "next/link";
import { exigirRol, miAlumnoId, uno } from "@/lib/datos";
import { etiquetaTema } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { formatoNota, TIPOS, type TipoTest } from "@/lib/tests";
import { SelectorTema, type TemaAlumno } from "../SelectorTema";
import { empezarTest } from "./actions";


const AVISOS: Record<string, string> = {
  "sin-preguntas": "No hay preguntas para ese test. Prueba con otro tema.",
  error: "No se pudo empezar el test. Inténtalo de nuevo.",
};

const cuando = (f: string) => new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" });

export default async function Estudiar({ searchParams }: PageProps<"/teoria/tests">) {
  await exigirRol("alumno");
  const { aviso, tema } = await searchParams;
  const alumnoId = await miAlumnoId();
  const supabase = await createClient();
  const [{ data: temas, error }, { data: intentos }] = await Promise.all([
    supabase.rpc("mis_temas"),
    supabase
      .from("intentos")
      .select("id, tipo, total, aciertos, fallos, blancos, nota, empezado_en, terminado_en, temas(numero, nombre)")
      .eq("alumno_id", alumnoId ?? "")
      .order("empezado_en", { ascending: false })
      .limit(15),
  ]);
  const filas = ((temas ?? []) as TemaAlumno[]).map((t) => ({ ...t, en_banco: Number(t.en_banco), vistas: Number(t.vistas), dominadas: Number(t.dominadas), pendientes: Number(t.pendientes) }));
  const enBanco = filas.reduce((a, t) => a + t.en_banco, 0);
  const pendientes = filas.reduce((a, t) => a + t.pendientes, 0);
  const dominadas = filas.reduce((a, t) => a + t.dominadas, 0);
  const aMedias = (intentos ?? []).filter((i) => !i.terminado_en);
  const hechos = (intentos ?? []).filter((i) => i.terminado_en);

  return (
    <>
      <div>
        <p className="sub"><Link href="/teoria">← Teoría</Link></p>
        <h1>Tests</h1>
        <p className="sub">Practica con las preguntas de la academia. Lo que falles vuelve en el repaso hasta que lo aciertes.</p>
      </div>

      {typeof aviso === "string" && AVISOS[aviso] && <p className="aviso error">{AVISOS[aviso]}</p>}
      {error && <p className="aviso error">Los tests aún no están preparados. Avisa a la academia.</p>}

      {aMedias.slice(0, 3).map((i) => (
        <p key={i.id} className="aviso medias row">
          <span>Tienes un {TIPOS[i.tipo as TipoTest].toLowerCase()} a medias del {cuando(i.empezado_en)}.</span>
          <Link className="btn" href={`/teoria/tests/${i.id}`}>Seguir</Link>
        </p>
      ))}

      {!error && enBanco === 0 ? (
        <section className="panel">
          <p className="sub">Tu academia aún no ha subido preguntas de tu oposición. En cuanto las suba, aparecerán aquí.</p>
        </section>
      ) : (
        <>
          <div className="cifras">
            <div className="dato"><span className="v">{enBanco}</span> preguntas en el banco</div>
            <div className="dato"><span className="v">{dominadas}</span> dominadas</div>
            <div className="dato"><span className="v">{pendientes}</span> por repasar</div>
          </div>

          <div className="grid2">
            <section className="panel">
              <h2>Practicar</h2>
              <p className="sub">Ves al momento si aciertas y por qué.</p>
              <form action={empezarTest} className="campos">
                <input type="hidden" name="tipo" value="practica" />
                <label>
                  Tema
                  <SelectorTema temas={filas} defaultValue={typeof tema === "string" ? tema : ""} contar />
                </label>
                <label>
                  Preguntas
                  <select name="cuantas" defaultValue="10">
                    {[10, 20, 30, 50].map((n) => <option key={n}>{n}</option>)}
                  </select>
                </label>
                <button className="btn">Empezar</button>
              </form>
            </section>

            <section className="panel">
              <h2>Simulacro de examen</h2>
              <p className="sub">Como el día del examen: con tiempo, la nota al final y los fallos restan.</p>
              <form action={empezarTest} className="campos">
                <input type="hidden" name="tipo" value="simulacro" />
                {filas.some((t) => t.comun) && (
                  <label>
                    De
                    <select name="tema" defaultValue="">
                      <option value="">Mi temario</option>
                      <option value="comun">Psicotécnicos, ortografía…</option>
                    </select>
                  </label>
                )}
                <label>
                  Preguntas
                  <input name="cuantas" type="number" min={5} max={200} defaultValue={Math.min(100, Math.max(5, enBanco))} />
                </label>
                <label>
                  Minutos
                  <input name="minutos" type="number" min={1} max={300} defaultValue={50} />
                </label>
                <button className="btn">Empezar</button>
              </form>
            </section>

            <section className="panel">
              <h2>Repasar fallos</h2>
              <p className="sub">
                {pendientes
                  ? `Tienes ${pendientes} ${pendientes === 1 ? "pregunta" : "preguntas"} que fallaste la última vez. Cuando la aciertes, sale del repaso.`
                  : "No tienes fallos pendientes. ¡Bien!"}
              </p>
              {pendientes > 0 && (
                <form action={empezarTest}>
                  <input type="hidden" name="tipo" value="fallos" />
                  <input type="hidden" name="cuantas" value="20" />
                  <button className="btn">Repasar {Math.min(20, pendientes)}</button>
                </form>
              )}
            </section>

            <section className="panel">
              <h2>Cómo vas por temas</h2>
              <div className="tbl">
                <table>
                  <thead><tr><th>Tema</th><th>Dominadas</th><th>Por repasar</th></tr></thead>
                  <tbody>
                    {filas.map((t) => (
                      <tr key={t.tema_id ?? (t.comun ? "sin-comun" : "sin")}>
                        <td>{t.tema ? etiquetaTema(t.numero, t.tema) : "Sin tema"}{t.comun && <span className="sub"> · común</span>}</td>
                        <td>
                          <span className="avance" style={{ "--avance": `${t.en_banco ? (100 * t.dominadas) / t.en_banco : 0}%` } as React.CSSProperties}>
                            {t.dominadas} de {t.en_banco}
                          </span>
                        </td>
                        <td>{t.pendientes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}

      {hechos.length > 0 && (
        <section className="panel">
          <h2>Tus últimos tests</h2>
          <div className="tbl">
            <table>
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Aciertos</th><th>Fallos</th><th>En blanco</th><th>Nota</th></tr></thead>
              <tbody>
                {hechos.map((i) => {
                  const tema = uno(i.temas);
                  return (
                    <tr key={i.id}>
                      <td><Link href={`/teoria/tests/${i.id}`}>{cuando(i.empezado_en)}</Link></td>
                      <td>{TIPOS[i.tipo as TipoTest]}{tema && <span className="sub"> · {etiquetaTema(tema.numero, tema.nombre)}</span>}</td>
                      <td>{i.aciertos}</td>
                      <td>{i.fallos}</td>
                      <td>{i.blancos}</td>
                      <td><b>{formatoNota(i.nota)}</b></td>
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
