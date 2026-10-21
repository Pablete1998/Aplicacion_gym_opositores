import { exigirRol, ROLES, type Rol } from "@/lib/datos";
import { createAdminClient, hayClaveAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { asignarPreparador, cambiarAcceso, cambiarRol } from "./actions";
import { NuevaPersona, Restablecer } from "./Formularios";

export default async function Personal() {
  const yo = await exigirRol("direccion");
  if (!hayClaveAdmin()) {
    return (
      <section className="panel">
        <h1>Personal</h1>
        <p className="aviso error">
          Falta configurar la variable <code>SUPABASE_SECRET_KEY</code> en Vercel (tipo Secret). Sin ella la app no puede crear accesos.
        </p>
      </section>
    );
  }

  const supabase = await createClient();
  const [{ data: perfiles }, { data: alumnos }, { data: grupos }, { data: usuarios }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, rol").order("nombre"),
    supabase.from("alumnos").select("id, nombre, apellidos, perfil_id").eq("activo", true).order("apellidos"),
    supabase.from("grupos").select("id, nombre, preparador_id").order("nombre"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const cuentas = new Map(usuarios?.users.map((u) => [u.id, u]) ?? []);
  const bloqueado = (id: string) => {
    const hasta = cuentas.get(id)?.banned_until;
    return Boolean(hasta && new Date(hasta) > new Date());
  };
  const preparadores = (perfiles ?? []).filter((p) => p.rol === "preparador");
  const alumnosSinAcceso = (alumnos ?? []).filter((a) => !a.perfil_id).map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombre}` }));

  return (
    <>
      <div>
        <h1>Personal y accesos</h1>
        <p className="sub">Da acceso a alumnos, preparadores y recepción, cambia su rol o quítale el acceso.</p>
      </div>

      <section className="panel">
        <h2>Dar acceso a una persona</h2>
        {alumnosSinAcceso.length === 0 && <p className="sub">Para dar acceso a un alumno, primero dale de alta en Alumnos.</p>}
        <NuevaPersona alumnosSinAcceso={alumnosSinAcceso} />
      </section>

      <section className="panel">
        <h2>Personas con acceso</h2>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th><th>Contraseña</th></tr>
            </thead>
            <tbody>
              {(perfiles ?? []).map((p) => {
                const soyYo = p.id === yo.id;
                const sinAcceso = bloqueado(p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.nombre}{soyYo && " (tú)"}</td>
                    <td>{cuentas.get(p.id)?.email}</td>
                    <td>
                      {soyYo ? ROLES[p.rol as Rol] : (
                        <form action={cambiarRol} className="row" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
                          <input type="hidden" name="id" value={p.id} />
                          <select name="rol" defaultValue={p.rol} aria-label={`Rol de ${p.nombre}`}>
                            {Object.entries(ROLES).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                          </select>
                          <button className="btn ghost">Guardar</button>
                        </form>
                      )}
                    </td>
                    <td>
                      {soyYo ? <span className="pill p-objetivo">Activo</span> : (
                        <form action={cambiarAcceso}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="activar" value={sinAcceso ? "si" : "no"} />
                          {sinAcceso ? <span className="pill p-no_apto">Sin acceso</span> : <span className="pill p-objetivo">Activo</span>}{" "}
                          <button className="btn ghost">{sinAcceso ? "Devolver acceso" : "Quitar acceso"}</button>
                        </form>
                      )}
                    </td>
                    <td>{!soyYo && <Restablecer id={p.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Preparador de cada grupo</h2>
        <p className="sub">Cada preparador solo ve y registra marcas de los alumnos de sus grupos.</p>
        <div className="tbl">
          <table>
            <thead><tr><th>Grupo</th><th>Preparador</th></tr></thead>
            <tbody>
              {(grupos ?? []).map((g) => (
                <tr key={g.id}>
                  <td>{g.nombre}</td>
                  <td>
                    <form action={asignarPreparador} className="row" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
                      <input type="hidden" name="grupo_id" value={g.id} />
                      <select name="preparador_id" defaultValue={g.preparador_id ?? ""} aria-label={`Preparador de ${g.nombre}`}>
                        <option value="">Sin preparador</option>
                        {preparadores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <button className="btn ghost">Guardar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
