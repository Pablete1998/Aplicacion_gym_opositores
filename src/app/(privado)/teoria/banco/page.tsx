import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { COMUN, etiquetaTema, idOposicion, LETRAS, NOMBRE_COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";
import { ImagenPregunta } from "@/components/ImagenPregunta";
import { NuevoTema, Tema } from "./Temas";

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const MOSTRAR = 100;

export default async function BancoTests({ searchParams }: PageProps<"/teoria/banco">) {
  await exigirRol("direccion", "preparador");
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: activas } = await supabase.from("oposiciones").select("id, nombre").eq("activa", true).order("nombre");
  const oposiciones = [...(activas ?? []), { id: COMUN, nombre: NOMBRE_COMUN }];
  const oposicion = oposiciones.find((o) => o.id === texto(sp.oposicion)) ?? oposiciones[0];
  const comun = oposicion.id === COMUN;
  const tema = texto(sp.tema); // "" = todos, "sin" = sin tema, o el id del tema
  const buscar = texto(sp.q).slice(0, 100);

  const consultaTemas = supabase.from("temas").select("id, numero, nombre");
  const [{ data: temas, error }, { data: resumen }] = await Promise.all([
    (comun ? consultaTemas.is("oposicion_id", null) : consultaTemas.eq("oposicion_id", oposicion.id)).order("numero", { nullsFirst: false }).order("nombre"),
    supabase.rpc("resumen_banco", { p_oposicion: idOposicion(oposicion.id) }),
  ]);
  const cuenta = new Map(((resumen ?? []) as { tema_id: string | null; total: number }[]).map((r) => [r.tema_id ?? "sin", Number(r.total)]));
  const total = [...cuenta.values()].reduce((a, b) => a + b, 0);

  let consulta = supabase.from("preguntas").select("id, tema_id, enunciado, opciones, correcta, explicacion, activa, imagen", { count: "exact" });
  consulta = comun ? consulta.is("oposicion_id", null) : consulta.eq("oposicion_id", oposicion.id);
  if (tema === "sin") consulta = consulta.is("tema_id", null);
  else if (esUuid(tema)) consulta = consulta.eq("tema_id", tema);
  // Las comas y paréntesis romperían el filtro de Supabase
  if (buscar) consulta = consulta.ilike("enunciado", `%${buscar.replace(/[%_,()\\]/g, " ")}%`);
  const { data: preguntas, count } = await consulta.order("creado_en", { ascending: false }).limit(MOSTRAR);

  const nombreTema = new Map((temas ?? []).map((t) => [t.id, etiquetaTema(t.numero, t.nombre)]));
  const enlace = (p: Record<string, string>) => `/teoria/banco?${new URLSearchParams({ oposicion: oposicion.id, ...p })}`;

  return (
    <>
      <div className="row">
        <div>
          <p className="sub"><Link href="/teoria">← Teoría</Link></p>
          <h1>Banco de tests</h1>
          <p className="sub">Las preguntas tipo test de cada oposición, ordenadas por temas. Con ellas practicarán los alumnos.</p>
        </div>
        <div className="row">
          <Link className="btn ghost" href={`/teoria/banco/importar?oposicion=${oposicion.id}`}>Pegar desde Excel</Link>
          <Link className="btn" href={`/teoria/banco/pregunta?${new URLSearchParams({ oposicion: oposicion.id, tema: esUuid(tema) ? tema : "" })}`}>Nueva pregunta</Link>
        </div>
      </div>

      {error && <p className="aviso error">Falta ejecutar la migración 0011_banco_tests.sql en Supabase.</p>}

      <section className="panel">
        <form className="filtros" action="/teoria/banco">
          <label>
            Buscar en las preguntas
            <input name="q" defaultValue={buscar} placeholder="Ej. Constitución" />
          </label>
          <label>
            Oposición
            <select name="oposicion" defaultValue={oposicion.id}>
              {oposiciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
          <label>
            Tema
            <select name="tema" defaultValue={tema}>
              <option value="">Todos</option>
              {(temas ?? []).map((t) => <option key={t.id} value={t.id}>{nombreTema.get(t.id)}</option>)}
              <option value="sin">Sin tema</option>
            </select>
          </label>
          <button className="btn">Ver</button>
        </form>
      </section>

        <div className="grid2">
          <section className="panel">
            <h2>{comun ? "Temas comunes" : `Temas de ${oposicion.nombre}`}</h2>
            <p className="sub">{total} {total === 1 ? "pregunta" : "preguntas"} en total.</p>
            {(temas ?? []).map((t) => (
              <Tema key={t.id} id={t.id} numero={t.numero} nombre={t.nombre} etiqueta={nombreTema.get(t.id)!} preguntas={cuenta.get(t.id) ?? 0} href={enlace({ tema: t.id })} />
            ))}
            {(cuenta.get("sin") ?? 0) > 0 && (
              <p className="sub"><Link href={enlace({ tema: "sin" })}>{cuenta.get("sin")} sin tema</Link></p>
            )}
            <NuevoTema oposicionId={oposicion.id} />
          </section>

          <section className="panel">
            <h2>
              {tema === "sin" ? "Sin tema" : esUuid(tema) ? nombreTema.get(tema) : "Últimas preguntas"}
              {buscar && <span className="sub"> · «{buscar}»</span>}
            </h2>
            {count! > MOSTRAR && <p className="sub">Se ven las {MOSTRAR} últimas de {count}. Elige un tema o busca para ver otras.</p>}
            {preguntas?.length ? (
              <ol className="preguntas">
                {preguntas.map((p) => (
                  <li key={p.id} className={p.activa ? undefined : "apagada"}>
                    <div className="row">
                      <strong>{p.enunciado}</strong>
                      <Link href={`/teoria/banco/pregunta?id=${p.id}`}>Editar</Link>
                    </div>
                    <ul>
                      {(p.opciones as string[]).map((o, i) => (
                        <li key={i} className={i === p.correcta ? "correcta" : undefined}>
                          <b>{LETRAS[i]})</b> {o}
                        </li>
                      ))}
                    </ul>
                    {p.imagen && <ImagenPregunta nombre={p.imagen} />}
                    {p.explicacion && <p className="sub">{p.explicacion}</p>}
                    {!tema && p.tema_id && <p className="sub">{nombreTema.get(p.tema_id)}</p>}
                    {!p.activa && <p className="sub">Retirada: los alumnos no la verán.</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sub">
                {buscar ? "Ninguna pregunta contiene ese texto." : "Aún no hay preguntas aquí. Añade una o pega varias desde Excel."}
              </p>
            )}
          </section>
        </div>
    </>
  );
}
