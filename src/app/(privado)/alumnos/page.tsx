import Link from "next/link";
import { exigirRol, listarAlumnos } from "@/lib/datos";

export default async function Alumnos() {
  const perfil = await exigirRol("direccion", "preparador");
  const alumnos = await listarAlumnos();
  return (
    <>
      <div className="row">
        <div>
          <h1>{perfil.rol === "preparador" ? "Mis alumnos" : "Alumnos"}</h1>
          <p className="sub">{alumnos.length} alumnos activos. Pulsa uno para ver su ficha y evolución.</p>
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
