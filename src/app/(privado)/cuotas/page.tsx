import Link from "next/link";
import { exigirRol, listarAlumnos, uno } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { cambiarCuota, marcarTodasPendientes } from "./actions";

const HORA = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" });

export default async function Cuotas() {
  await exigirRol("direccion");
  const supabase = await createClient();
  const [alumnos, { data: accesos }] = await Promise.all([
    listarAlumnos(),
    supabase.from("accesos").select("id, momento, permitido, motivo, alumnos(nombre, apellidos)").order("momento", { ascending: false }).limit(30),
  ]);
  const pendientes = alumnos.filter((a) => !a.cuota_al_dia);
  // Primero los pendientes, que son los que hay que cobrar
  const ordenados = [...pendientes, ...alumnos.filter((a) => a.cuota_al_dia)];

  return (
    <>
      <div>
        <h1>Cuotas y entradas</h1>
        <p className="sub">
          {alumnos.length - pendientes.length} al día y {pendientes.length} pendientes. Con la cuota pendiente, el QR no deja entrar.
        </p>
      </div>

      <section className="panel">
        <h2>Cuota de cada alumno</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Alumno</th><th>Grupo</th><th>Cuota</th></tr></thead>
            <tbody>
              {ordenados.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/alumnos/${a.id}`}>{a.apellidos}, {a.nombre}</Link></td>
                  <td>{a.grupo ?? "Sin grupo"}</td>
                  <td>
                    <form action={cambiarCuota}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="al_dia" value={a.cuota_al_dia ? "no" : "si"} />
                      {a.cuota_al_dia ? <span className="pill p-objetivo">Al día</span> : <span className="pill p-no_apto">Pendiente</span>}{" "}
                      <button className="btn ghost">{a.cuota_al_dia ? "Marcar pendiente" : "Marcar pagada"}</button>
                    </form>
                  </td>
                </tr>
              ))}
              {alumnos.length === 0 && <tr><td colSpan={3}>No hay alumnos todavía.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Empezar un mes nuevo</h2>
        <p className="sub">Pone a todos los alumnos activos como pendientes. Luego marcas como pagada la de cada uno según vaya pagando.</p>
        <form action={marcarTodasPendientes} className="row" style={{ justifyContent: "flex-start" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="confirmo" required style={{ width: "auto" }} /> Sí, marcar todas como pendientes
          </label>
          <button className="btn">Marcar todas pendientes</button>
        </form>
      </section>

      <section className="panel" id="entradas">
        <h2>Últimas entradas</h2>
        <div className="tbl">
          <table>
            <thead><tr><th>Cuándo</th><th>Alumno</th><th>Resultado</th></tr></thead>
            <tbody>
              {(accesos ?? []).map((e) => {
                const alumno = uno(e.alumnos);
                return (
                  <tr key={e.id}>
                    <td className="num">{HORA.format(new Date(e.momento))}</td>
                    <td>{alumno ? `${alumno.apellidos}, ${alumno.nombre}` : "Desconocido"}</td>
                    <td>
                      {e.permitido ? <span className="pill p-objetivo">Entró</span> : <span className="pill p-no_apto">Denegado</span>}
                      {e.motivo && <span className="sub"> {e.motivo}</span>}
                    </td>
                  </tr>
                );
              })}
              {(accesos ?? []).length === 0 && <tr><td colSpan={3}>Todavía no se ha leído ningún QR.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
