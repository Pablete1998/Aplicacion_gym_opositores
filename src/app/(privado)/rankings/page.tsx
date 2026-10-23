import Link from "next/link";
import { formatoMarca } from "@/lib/baremo";
import { exigirRol, miAlumnoId, uno } from "@/lib/datos";
import { haceDias } from "@/lib/informes";
import { agruparRanking, type Ejercicio, type MarcaRanking, type PruebaRanking } from "@/lib/ranking";
import { createClient } from "@/lib/supabase/server";
import { ponerMote } from "./actions";

const PERIODOS = { "30": "Último mes", "90": "Últimos 3 meses", todo: "Desde siempre" } as const;
type Periodo = keyof typeof PERIODOS;
const MEDALLA = ["🥇", "🥈", "🥉"];
const EN_RESUMEN = 3;

const FECHA = (f: string) => f.split("-").reverse().join("/");

function Puesto({ puesto }: { puesto: number }) {
  return <span className="puesto">{MEDALLA[puesto - 1] ?? `${puesto}.º`}</span>;
}

export default async function Rankings({ searchParams }: PageProps<"/rankings">) {
  const perfil = await exigirRol("direccion", "preparador", "alumno");
  const { opo: opoParam, periodo: periodoParam, ej, mote: moteParam } = await searchParams;
  const periodo: Periodo = typeof periodoParam === "string" && Object.hasOwn(PERIODOS, periodoParam) ? (periodoParam as Periodo) : "90";
  const supabase = await createClient();

  const alumnoId = perfil.rol === "alumno" ? await miAlumnoId() : null;
  const [{ data: pruebasDatos }, { data: marcasDatos, error }, { data: yo }] = await Promise.all([
    supabase.from("pruebas").select("id, nombre, tipo, unidad, mayor_es_mejor, orden, oposiciones!inner(nombre, activa)").eq("oposiciones.activa", true),
    supabase.rpc("ranking_academia", { p_desde: periodo === "todo" ? null : haceDias(Number(periodo)) }),
    alumnoId ? supabase.from("alumnos").select("mote").eq("id", alumnoId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (error) return <p className="aviso error">Los rankings aún no están activados: falta ejecutar la migración 0009 en Supabase.</p>;

  const pruebas: PruebaRanking[] = (pruebasDatos ?? []).map((p) => ({ ...p, oposicion: uno(p.oposiciones)?.nombre ?? "" }));
  const marcas = ((marcasDatos ?? []) as MarcaRanking[]).map((m) => ({ ...m, marca: Number(m.marca) }));
  const oposiciones = [...new Set(pruebas.map((p) => p.oposicion))].sort((a, b) => a.localeCompare(b, "es"));
  const oposicion = typeof opoParam === "string" && oposiciones.includes(opoParam) ? opoParam : null;
  const ejercicios = agruparRanking(pruebas, marcas, oposicion);
  const elegido = ejercicios.find((e) => e.clave === ej);
  const conFicha = perfil.rol === "direccion";

  const enlace = (cambios: { opo?: string | null; periodo?: Periodo; ej?: string | null }) => {
    const q = new URLSearchParams();
    const o = cambios.opo === undefined ? oposicion : cambios.opo;
    const p = cambios.periodo ?? periodo;
    const e = cambios.ej === undefined ? elegido?.clave : cambios.ej;
    if (o) q.set("opo", o);
    if (p !== "90") q.set("periodo", p);
    if (e) q.set("ej", e);
    return `/rankings${q.size ? `?${q}` : ""}`;
  };

  const nombre = (m: MarcaRanking) =>
    conFicha ? <Link href={`/alumnos/${m.alumno_id}`}>{m.nombre}</Link> : m.soy_yo ? <strong>{m.nombre} (tú)</strong> : m.nombre;

  return (
    <>
      <div>
        <h1>Rankings</h1>
        <p className="sub">
          La mejor marca de cada alumno en cada prueba, {oposicion ? `en ${oposicion}` : "en toda la academia"}. Mujeres y hombres por separado.
        </p>
      </div>

      <section className="panel">
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <Link href={enlace({ opo: null, ej: null })} className="btn ghost" aria-current={!oposicion ? "true" : undefined}>Toda la academia</Link>
          {oposiciones.map((o) => (
            <Link key={o} href={enlace({ opo: o, ej: null })} className="btn ghost" aria-current={o === oposicion ? "true" : undefined}>{o}</Link>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
            <Link key={p} href={enlace({ periodo: p })} className="btn ghost" aria-current={p === periodo ? "true" : undefined}>{PERIODOS[p]}</Link>
          ))}
        </div>
        {!oposicion && <p className="sub">En toda la academia, las pruebas iguales de varias oposiciones (como las dominadas) cuentan juntas.</p>}
      </section>

      {elegido ? (
        <Completo ejercicio={elegido} nombre={nombre} volver={enlace({ ej: null })} conOposicion={!oposicion} />
      ) : ejercicios.length === 0 ? (
        <p className="sub">Todavía no hay marcas en este periodo.</p>
      ) : (
        <div className="rankings">
          {ejercicios.map((e) => (
            <section key={e.clave} className="panel">
              <h2>{e.nombre}</h2>
              {!oposicion && e.oposiciones.length > 1 && <p className="sub">{e.oposiciones.join(" · ")}</p>}
              <div className="podios">
                {(["mujeres", "hombres"] as const).map((sexo) =>
                  e[sexo].length > 0 ? (
                    <div key={sexo}>
                      <h3>{sexo === "mujeres" ? "Mujeres" : "Hombres"}</h3>
                      <ol className="podio">
                        {e[sexo].filter((m) => m.puesto <= EN_RESUMEN).map((m) => (
                          <li key={m.alumno_id} className={m.soy_yo ? "yo" : undefined}>
                            <Puesto puesto={m.puesto} />
                            <span>{nombre(m)}</span>
                            <span className="num">{formatoMarca(e.unidad, m.marca)}</span>
                          </li>
                        ))}
                      </ol>
                      {(() => {
                        const yo = e[sexo].find((m) => m.soy_yo && m.puesto > EN_RESUMEN);
                        return yo && <p className="sub">Tú vas {yo.puesto}.º de {e[sexo].length} con {formatoMarca(e.unidad, yo.marca)}.</p>;
                      })()}
                    </div>
                  ) : null,
                )}
              </div>
              <Link href={enlace({ ej: e.clave })} className="sub">Ver ranking completo ({e.mujeres.length + e.hombres.length})</Link>
            </section>
          ))}
        </div>
      )}

      {alumnoId && (
        <section className="panel" id="mote">
          <h2>Tu mote</h2>
          <p className="sub">Sale junto a tu nombre en los rankings. Déjalo en blanco para no llevar mote.</p>
          {moteParam === "ok" && <p className="aviso ok">Mote guardado.</p>}
          {moteParam === "error" && <p className="aviso error">No se pudo guardar. Como mucho 30 letras.</p>}
          <form action={ponerMote} className="row" style={{ justifyContent: "flex-start" }}>
            <input name="mote" defaultValue={yo?.mote ?? ""} maxLength={30} placeholder="Ej.: el Martinico" aria-label="Tu mote" style={{ maxWidth: 260 }} />
            <button className="btn">Guardar</button>
          </form>
        </section>
      )}
    </>
  );
}

function Completo({ ejercicio: e, nombre, volver, conOposicion }: {
  ejercicio: Ejercicio;
  nombre: (m: MarcaRanking) => React.ReactNode;
  volver: string;
  conOposicion: boolean;
}) {
  return (
    <>
      <Link href={volver} className="sub">← Todas las pruebas</Link>
      <div className="grid2">
        {(["mujeres", "hombres"] as const).map((sexo) => (
          <section key={sexo} className="panel">
            <h2>{e.nombre} · {sexo === "mujeres" ? "Mujeres" : "Hombres"}</h2>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th></th><th>Alumno</th>{conOposicion && <th>Oposición</th>}<th>Grupo</th><th>Marca</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {e[sexo].map((m) => (
                    <tr key={m.alumno_id} className={m.soy_yo ? "yo" : undefined}>
                      <td><Puesto puesto={m.puesto} /></td>
                      <td>{nombre(m)}</td>
                      {conOposicion && <td>{m.oposicion}</td>}
                      <td>{m.grupo ?? "—"}</td>
                      <td className="num">{formatoMarca(e.unidad, m.marca)}</td>
                      <td className="num">{FECHA(m.fecha)}</td>
                    </tr>
                  ))}
                  {e[sexo].length === 0 && <tr><td colSpan={6}>Sin marcas en este periodo.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
