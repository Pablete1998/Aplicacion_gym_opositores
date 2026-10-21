import Link from "next/link";
import { exigirRol, listarAlumnos, llevaGrupos } from "@/lib/datos";

export default async function Alumnos({ searchParams }: PageProps<"/alumnos">) {
  const perfil = await exigirRol("direccion", "preparador");
  // Un director que también lleva grupos puede filtrar sus alumnos
  const conGrupos = perfil.rol === "direccion" && (await llevaGrupos(perfil.id));
  const soloMios = conGrupos && (await searchParams).mios === "1";
  const alumnos = await listarAlumnos(soloMios ? perfil.id : undefined);
  return (
    <>
      <div className="row">
        <div>
          <h1>{perfil.rol === "preparador" ? "Mis alumnos" : "Alumnos"}</h1>
          <p className="sub">{alumnos.length} alumnos activos. Pulsa uno para ver su ficha y evolución.</p>
          {conGrupos && (
            <p className="sub">
              {soloMios ? <Link href="/alumnos">Ver todos los alumnos</Link> : <Link href="/alumnos?mios=1">Ver solo mis grupos</Link>}
            </p>
          )}
        </div>
        {perfil.rol === "direccion" && <Link href="/alumnos/nuevo" className="btn">Dar de alta alumno</Link>}
      </div>
      <section className="panel">
        <div className="tbl">
          <table>
            <thead>
              <tr>
                <th>Nombre</th><th>Oposición</th><th>Grupo</th>
                {perfil.rol === "direccion" && <th>Cuota</th>}
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/alumnos/${a.id}`}>{a.apellidos}, {a.nombre}</Link></td>
                  <td><span className="pill p-op">{a.oposicion}</span></td>
                  <td>{a.grupo ?? "Sin grupo"}</td>
                  {perfil.rol === "direccion" && (
                    <td>{a.cuota_al_dia ? <span className="pill p-objetivo">Al día</span> : <span className="pill p-no_apto">Pendiente</span>}</td>
                  )}
                </tr>
              ))}
              {alumnos.length === 0 && (
                <tr><td colSpan={4}>No hay alumnos todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
