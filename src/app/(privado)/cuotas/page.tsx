import { exigirRol, listarAlumnos, uno } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { mesActual, nombreMes } from "@/lib/informes";
import { FORMAS_PAGO, type FormaPago } from "@/lib/pagos";
import { marcarTodasPendientes } from "./actions";
import { Tabla, type FilaCuota } from "./Tabla";

const HORA = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" });

export default async function Cuotas() {
  await exigirRol("direccion");
  const supabase = await createClient();
  const mes = mesActual();
  const [alumnos, { data: accesos }, { data: pagos }] = await Promise.all([
    listarAlumnos(),
    supabase.from("accesos").select("id, momento, permitido, motivo, alumnos(nombre, apellidos)").order("momento", { ascending: false }).limit(30),
    supabase.from("pagos").select("alumno_id, forma").eq("mes", mes),
  ]);
  const formaDe = new Map((pagos ?? []).map((p) => [p.alumno_id, p.forma as FormaPago]));
  // Cuántos han pagado este mes de cada forma
  const porForma = Object.entries(FORMAS_PAGO).map(([forma, nombre]) => ({
    nombre,
    cuantos: (pagos ?? []).filter((p) => p.forma === forma).length,
  }));
  const pendientes = alumnos.filter((a) => !a.cuota_al_dia);
  // Primero los pendientes, que son los que hay que cobrar
  const ordenados: FilaCuota[] = [...pendientes, ...alumnos.filter((a) => a.cuota_al_dia)].map((a) => ({
    ...a,
    forma: (a.cuota_al_dia && formaDe.get(a.id)) || null,
  }));

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
        <p className="sub">
          {nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1)}: {porForma.map((f) => `${f.cuantos} ${f.nombre.toLowerCase()}`).join(", ")}.
        </p>
        <Tabla filas={ordenados} />
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
