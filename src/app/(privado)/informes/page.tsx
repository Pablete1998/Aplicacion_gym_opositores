import Link from "next/link";
import { ETIQUETA_ESTADO, estadoMarca, formatoMarca, puntosMarca } from "@/lib/baremo";
import { cargarFicha, exigirRol, uno, type Ficha } from "@/lib/datos";
import { diasDesde, ETIQUETA_TENDENCIA, tendencia, type Tendencia } from "@/lib/informes";
import { createClient } from "@/lib/supabase/server";

// Sin marcas en este tiempo, el alumno aparece en "Necesitan atención"
const DIAS_SIN_MARCAS = 21;
const FLECHA: Record<Tendencia, string> = { mejora: "↑", estable: "→", empeora: "↓" };

export default async function Informes({ searchParams }: PageProps<"/informes">) {
  const perfil = await exigirRol("direccion", "preparador");
  const { grupo: grupoParam } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase.from("grupos").select("id, nombre, oposiciones(nombre)").order("nombre");
  if (perfil.rol === "preparador") consulta = consulta.eq("preparador_id", perfil.id);
  const { data: grupos } = await consulta;
  const grupo = grupos?.find((g) => g.id === grupoParam) ?? grupos?.[0] ?? null;

  const { data: alumnos } = grupo
    ? await supabase.from("alumnos").select("id").eq("grupo_id", grupo.id).eq("activo", true).order("apellidos")
    : { data: null };
  const fichas = (await Promise.all((alumnos ?? []).map((a) => cargarFicha(a.id)))).filter((f): f is Ficha => f !== null);

  // Columnas: todas las pruebas de la oposición, en su orden (las de un solo sexo incluidas)
  const columnas = new Map<string, string>();
  for (const f of fichas) for (const p of f.pruebas) columnas.set(p.id, p.nombre);

  const filas = fichas.map((f) => {
    const celdas = new Map(
      f.pruebas.map((p) => {
        const ultima = p.serie[p.serie.length - 1];
        return [
          p.id,
          ultima
            ? {
                texto: formatoMarca(p.unidad, ultima.marca),
                estado: p.baremo ? estadoMarca(p.baremo, ultima.marca) : null,
                puntos: p.baremo ? puntosMarca(p.baremo, ultima.marca) : null,
                tendencia: tendencia(p.serie, p.mayorEsMejor),
              }
            : null,
        ];
      }),
    );
    const ultimaFecha = f.pruebas.flatMap((p) => p.serie.map((s) => s.fecha)).sort().at(-1) ?? null;
    const suspensas = f.pruebas.filter((p) => celdas.get(p.id)?.estado === "no_apto").map((p) => p.nombre);
    const empeora = f.pruebas.filter((p) => celdas.get(p.id)?.tendencia === "empeora").map((p) => p.nombre);
    const motivos = [
      ultimaFecha === null ? "No tiene marcas" : diasDesde(ultimaFecha) > DIAS_SIN_MARCAS ? `Sin marcas desde hace ${diasDesde(ultimaFecha)} días` : null,
      suspensas.length ? `No apto en ${suspensas.join(", ")}` : null,
      empeora.length ? `Empeora en ${empeora.join(", ")}` : null,
    ].filter((m): m is string => m !== null);
    return { ficha: f, celdas, motivos, todoApto: f.pruebas.length > 0 && f.pruebas.every((p) => celdas.get(p.id)?.estado && celdas.get(p.id)?.estado !== "no_apto") };
  });
  const atencion = filas.filter((f) => f.motivos.length);

  return (
    <>
      <div>
        <h1>Informes</h1>
        <p className="sub">Cómo va cada grupo: última marca de cada alumno, si llega al baremo y si mejora o se estanca respecto a hace un mes.</p>
      </div>

      <section className="panel">
        {grupos?.length ? (
          <form className="campos" action="/informes">
            <label>
              Grupo
              <select id="grupo" name="grupo" defaultValue={grupo?.id}>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre} · {uno(g.oposiciones)?.nombre}</option>)}
              </select>
            </label>
            <button className="btn">Ver</button>
          </form>
        ) : (
          <p className="sub">No llevas ningún grupo. Dirección puede asignártelo en Personal.</p>
        )}
        {grupo && (
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <span className="pill p-op">{fichas.length} alumnos</span>
            <span className="pill p-objetivo">{filas.filter((f) => f.todoApto).length} aptos en todo</span>
            <span className="pill p-no_apto">{atencion.length} necesitan atención</span>
          </div>
        )}
      </section>

      {atencion.length > 0 && (
        <section className="panel">
          <h2>Necesitan atención</h2>
          <ul className="atencion">
            {atencion.map((f) => (
              <li key={f.ficha.id}>
                <Link href={`/alumnos/${f.ficha.id}`}>{f.ficha.nombreCompleto}</Link>
                <span className="sub">{f.motivos.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {grupo && fichas.length > 0 && (
        <section className="panel">
          <div className="row">
            <h2>Última marca por prueba</h2>
            <span className="sub leyenda">↑ mejora · → estancado · ↓ empeora (frente a hace un mes)</span>
          </div>
          <div className="tbl">
            <table className="resumen">
              <thead>
                <tr>
                  <th>Alumno</th>
                  {[...columnas].map(([id, nombre]) => <th key={id}>{nombre}</th>)}
                  <th>Informe</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.ficha.id}>
                    <td><Link href={`/alumnos/${f.ficha.id}`}>{f.ficha.nombreCompleto}</Link></td>
                    {[...columnas.keys()].map((id) => {
                      if (!f.ficha.pruebas.some((p) => p.id === id)) return <td key={id} className="sub">No la hace</td>;
                      const c = f.celdas.get(id);
                      if (!c) return <td key={id} className="sub">—</td>;
                      return (
                        <td key={id}>
                          <span className="num">{c.texto}</span>
                          {c.tendencia && <span className={`flecha t-${c.tendencia}`} title={ETIQUETA_TENDENCIA[c.tendencia]}> {FLECHA[c.tendencia]}</span>}
                          <br />
                          {c.estado && <span className={`pill p-${c.estado}`}>{ETIQUETA_ESTADO[c.estado]}{c.puntos !== null && ` · ${c.puntos} p`}</span>}
                        </td>
                      );
                    })}
                    <td><Link href={`/alumnos/${f.ficha.id}/informe`} className="btn ghost">Mensual</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
