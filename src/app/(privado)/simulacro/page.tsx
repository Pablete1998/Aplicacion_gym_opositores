import Link from "next/link";
import { baremoAplicable, edadEn, ETIQUETA_ESTADO, estadoMarca, formatoMarca, puntosMarca, type Baremo, type BaremoFila, type Unidad } from "@/lib/baremo";
import { exigirRol, uno } from "@/lib/datos";
import { hoyEnEspana } from "@/lib/sesiones";
import { clasificar, mejorMarca } from "@/lib/simulacro";
import { createClient } from "@/lib/supabase/server";
import { Hoja, type Pendiente } from "./Hoja";

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function Simulacro({ searchParams }: PageProps<"/simulacro">) {
  const perfil = await exigirRol("direccion", "preparador");
  const sp = await searchParams;
  const hoy = hoyEnEspana();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto(sp.fecha) ?? "") ? texto(sp.fecha)! : hoy;
  const supabase = await createClient();

  let consulta = supabase.from("grupos").select("id, nombre, oposicion_id, oposiciones(nombre)").order("nombre");
  if (perfil.rol === "preparador") consulta = consulta.eq("preparador_id", perfil.id);
  const { data: grupos } = await consulta;
  const grupo = grupos?.find((g) => g.id === texto(sp.grupo)) ?? null;

  const { data: pruebas } = grupo
    ? await supabase
        .from("pruebas")
        .select("id, nombre, unidad, mayor_es_mejor, sexo, baremos(sexo, edad_min, edad_max, marca_minima, marca_objetivo, puntos)")
        .eq("oposicion_id", grupo.oposicion_id)
        .eq("tipo", "fisica")
        .order("orden")
    : { data: null };
  const prueba = pruebas?.find((p) => p.id === texto(sp.prueba)) ?? null;

  // Alumnos del grupo que hacen la prueba (dominadas solo hombres, suspensión solo mujeres)
  const { data: alumnos } = grupo && prueba
    ? await supabase.from("alumnos").select("id, nombre, apellidos, sexo, fecha_nacimiento").eq("grupo_id", grupo.id).eq("activo", true).order("apellidos")
    : { data: null };
  const participantes = (alumnos ?? []).filter((a) => prueba?.sexo == null || a.sexo === prueba.sexo);
  const { data: resultados } = prueba && participantes.length
    ? await supabase.from("resultados").select("alumno_id, marca").eq("prueba_id", prueba.id).eq("fecha", fecha).in("alumno_id", participantes.map((a) => a.id))
    : { data: null };

  const filas = participantes.map((a) => {
    const fila = prueba ? baremoAplicable(prueba.baremos as BaremoFila[], a.sexo, edadEn(a.fecha_nacimiento, new Date(fecha))) : null;
    const baremo: Baremo | null = prueba && fila
      ? {
          unidad: prueba.unidad as Unidad,
          mayorEsMejor: prueba.mayor_es_mejor,
          minima: Number(fila.marca_minima),
          objetivo: fila.marca_objetivo === null ? null : Number(fila.marca_objetivo),
          puntos: fila.puntos?.map(Number) ?? null,
        }
      : null;
    const marcas = (resultados ?? []).filter((r) => r.alumno_id === a.id).map((r) => Number(r.marca));
    return { id: a.id, nombre: `${a.apellidos}, ${a.nombre}`, baremo, marca: mejorMarca(marcas, prueba?.mayor_es_mejor ?? true) };
  });
  const pendientes: Pendiente[] = filas.filter((f) => f.marca === null).map(({ id, nombre, baremo }) => ({ id, nombre, baremo }));
  const clasificacion = clasificar(
    filas.flatMap((f) => (f.marca === null ? [] : [{ ...f, marca: f.marca }])),
    prueba?.mayor_es_mejor ?? true,
  );
  const conEstado = clasificacion.map((f) => ({ ...f, estado: f.baremo ? estadoMarca(f.baremo, f.marca) : null, puntos: f.baremo ? puntosMarca(f.baremo, f.marca) : null }));
  const aptos = conEstado.filter((f) => f.estado && f.estado !== "no_apto").length;
  const hayPuntos = conEstado.some((f) => f.puntos !== null);
  const enlace = (p: Record<string, string>) => `/simulacro?${new URLSearchParams({ fecha, ...p })}`;

  return (
    <>
      <div>
        <h1>Simulacro de grupo</h1>
        <p className="sub">Apunta las marcas de todo el grupo en una sola pantalla y mira la clasificación al momento.</p>
      </div>

      <section className="panel">
        {grupos?.length ? (
          <form className="campos" action="/simulacro">
            <label>
              Grupo
              <select id="grupo" name="grupo" defaultValue={grupo?.id ?? grupos[0].id}>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre} · {uno(g.oposiciones)?.nombre}</option>)}
              </select>
            </label>
            <label>
              Fecha
              <input id="fecha" name="fecha" type="date" defaultValue={fecha} max={hoy} />
            </label>
            {prueba && grupo && <input type="hidden" name="prueba" value={prueba.id} />}
            <button className="btn">{grupo ? "Cambiar" : "Empezar"}</button>
          </form>
        ) : (
          <p className="sub">No llevas ningún grupo. Dirección puede asignártelo en Personal.</p>
        )}
        {grupo && (
          <div className="row" style={{ justifyContent: "flex-start" }}>
            {pruebas?.length ? pruebas.map((p) => (
              <Link key={p.id} href={enlace({ grupo: grupo.id, prueba: p.id })} className="btn ghost" aria-current={p.id === prueba?.id}>
                {p.nombre}
              </Link>
            )) : <p className="sub">Esta oposición no tiene pruebas físicas.</p>}
          </div>
        )}
      </section>

      {grupo && prueba && (
        <div className="grid2">
          <section className="panel">
            <h2>Apuntar marcas</h2>
            {pendientes.length ? (
              <Hoja key={`${prueba.id}-${fecha}`} grupo={grupo.id} prueba={prueba.id} fecha={fecha} alumnos={pendientes} />
            ) : (
              <p className="sub">{participantes.length ? "Todo el grupo tiene ya marca en esta prueba ese día." : "No hay alumnos en este grupo que hagan esta prueba."}</p>
            )}
          </section>
          <section className="panel">
            <div className="row">
              <h2>Clasificación</h2>
              {conEstado.length > 0 && <span className="pill p-op">{aptos} de {conEstado.length} aptos</span>}
            </div>
            {conEstado.length ? (
              <div className="tbl">
                <table>
                  <thead>
                    <tr><th>#</th><th>Alumno</th><th>Marca</th>{hayPuntos && <th>Puntos</th>}<th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {conEstado.map((f) => (
                      <tr key={f.id}>
                        <td className="num">{f.puesto}</td>
                        <td><Link href={`/alumnos/${f.id}?prueba=${prueba.id}`}>{f.nombre}</Link></td>
                        <td className="num">{formatoMarca(prueba.unidad as Unidad, f.marca)}</td>
                        {hayPuntos && <td className="num">{f.puntos ?? "—"}</td>}
                        <td>{f.estado ? <span className={`pill p-${f.estado}`}>{ETIQUETA_ESTADO[f.estado]}</span> : <span className="sub">Sin baremo</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="sub">Aún no hay marcas de este día.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
