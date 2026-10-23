import Link from "next/link";
import { exigirRol, ROLES, type Rol } from "@/lib/datos";
import { createAdminClient, hayClaveAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { asignarPreparador, cambiarAcceso, cambiarRol } from "./actions";
import { NuevaPersona, Restablecer } from "./Formularios";

// Orden del equipo: dirección siempre arriba
const ORDEN_EQUIPO: Rol[] = ["direccion", "preparador", "recepcion"];

export default async function Personal({ searchParams }: PageProps<"/personal">) {
  const { opo, grupo: grupoParam } = await searchParams;
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
  const [{ data: perfiles }, { data: alumnos }, { data: grupos }, { data: oposiciones }, { data: usuarios }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, rol").order("nombre"),
    supabase.from("alumnos").select("id, nombre, apellidos, perfil_id, oposicion_id, grupo_id").eq("activo", true).order("apellidos"),
    supabase.from("grupos").select("id, nombre, preparador_id, oposicion_id").order("nombre"),
    supabase.from("oposiciones").select("id, nombre").order("nombre"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const cuentas = new Map(usuarios?.users.map((u) => [u.id, u]) ?? []);
  const bloqueado = (id: string) => {
    const hasta = cuentas.get(id)?.banned_until;
    return Boolean(hasta && new Date(hasta) > new Date());
  };
  // Dirección también puede llevar grupos como preparador
  const preparadores = (perfiles ?? []).filter((p) => p.rol === "preparador" || p.rol === "direccion");
  const equipo = (perfiles ?? [])
    .filter((p) => p.rol !== "alumno")
    .sort((a, b) => ORDEN_EQUIPO.indexOf(a.rol as Rol) - ORDEN_EQUIPO.indexOf(b.rol as Rol));

  // Alumnos con acceso, con su oposición y grupo, filtrables por los dos
  const nombreOposicion = new Map((oposiciones ?? []).map((o) => [o.id, o.nombre]));
  const nombreGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nombre]));
  const alumnoDe = new Map((alumnos ?? []).filter((a) => a.perfil_id).map((a) => [a.perfil_id, a]));
  const gruposPorOposicion = [...(grupos ?? [])].sort((a, b) =>
    (nombreOposicion.get(a.oposicion_id) ?? "").localeCompare(nombreOposicion.get(b.oposicion_id) ?? "", "es"),
  );
  const oposicion = oposiciones?.find((o) => o.id === opo) ?? null;
  const gruposOposicion = (grupos ?? []).filter((g) => g.oposicion_id === oposicion?.id);
  const grupo = gruposOposicion.find((g) => g.id === grupoParam) ?? null;
  const conAcceso = (perfiles ?? []).filter((p) => p.rol === "alumno").map((p) => ({ perfil: p, alumno: alumnoDe.get(p.id) }));
  const alumnosFiltrados = conAcceso
    .filter(({ alumno }) => !oposicion || alumno?.oposicion_id === oposicion.id)
    .filter(({ alumno }) => !grupo || alumno?.grupo_id === grupo.id)
    .sort((a, b) => (a.alumno ? `${a.alumno.apellidos} ${a.alumno.nombre}` : a.perfil.nombre).localeCompare(b.alumno ? `${b.alumno.apellidos} ${b.alumno.nombre}` : b.perfil.nombre, "es"));
  const filtro = (o?: string, g?: string) => {
    const q = new URLSearchParams();
    if (o) q.set("opo", o);
    if (g) q.set("grupo", g);
    const texto = q.toString();
    return `/personal${texto ? `?${texto}` : ""}#alumnos` as const;
  };

  const celdasAcceso = (p: { id: string; nombre: string; rol: string }) => {
    const soyYo = p.id === yo.id;
    const sinAcceso = bloqueado(p.id);
    return (
      <>
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
      </>
    );
  };

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
        <h2>Equipo</h2>
        <p className="sub">Dirección, preparadores y recepción.</p>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th><th>Contraseña</th></tr>
            </thead>
            <tbody>
              {equipo.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombre}{p.id === yo.id && " (tú)"}</td>
                  <td>{cuentas.get(p.id)?.email}</td>
                  {celdasAcceso(p)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="alumnos">
        <h2>Alumnos con acceso</h2>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <Link href={filtro()} scroll={false} className="btn ghost" aria-current={!oposicion}>Todas</Link>
          {(oposiciones ?? []).map((o) => (
            <Link key={o.id} href={filtro(o.id)} scroll={false} className="btn ghost" aria-current={o.id === oposicion?.id}>{o.nombre}</Link>
          ))}
        </div>
        {oposicion && gruposOposicion.length > 0 && (
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <Link href={filtro(oposicion.id)} scroll={false} className="btn ghost" aria-current={!grupo}>Todos los grupos</Link>
            {gruposOposicion.map((g) => (
              <Link key={g.id} href={filtro(oposicion.id, g.id)} scroll={false} className="btn ghost" aria-current={g.id === grupo?.id}>{g.nombre}</Link>
            ))}
          </div>
        )}
        <p className="sub">{alumnosFiltrados.length} {alumnosFiltrados.length === 1 ? "alumno" : "alumnos"}</p>
        {alumnosFiltrados.length > 0 && (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Alumno</th><th>Correo</th><th>Oposición</th><th>Grupo</th><th>Rol</th><th>Acceso</th><th>Contraseña</th></tr>
              </thead>
              <tbody>
                {alumnosFiltrados.map(({ perfil: p, alumno: a }) => (
                  <tr key={p.id}>
                    <td>{a ? <Link href={`/alumnos/${a.id}`}>{a.apellidos}, {a.nombre}</Link> : p.nombre}</td>
                    <td>{cuentas.get(p.id)?.email}</td>
                    <td>{a ? nombreOposicion.get(a.oposicion_id) : "—"}</td>
                    <td>{(a?.grupo_id && nombreGrupo.get(a.grupo_id)) || "—"}</td>
                    {celdasAcceso(p)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Preparador de cada grupo</h2>
        <p className="sub">Cada preparador solo ve y registra marcas de los alumnos de sus grupos. Dirección también puede llevar grupos y sigue viéndolo todo.</p>
        <div className="tbl">
          <table>
            <thead><tr><th>Oposición</th><th>Grupo</th><th>Preparador</th></tr></thead>
            <tbody>
              {gruposPorOposicion.map((g) => (
                <tr key={g.id}>
                  <td>{nombreOposicion.get(g.oposicion_id)}</td>
                  <td>{g.nombre}</td>
                  <td>
                    <form action={asignarPreparador} className="row" style={{ justifyContent: "flex-start", flexWrap: "nowrap" }}>
                      <input type="hidden" name="grupo_id" value={g.id} />
                      <select name="preparador_id" defaultValue={g.preparador_id ?? ""} aria-label={`Preparador de ${g.nombre}`}>
                        <option value="">Sin preparador</option>
                        {preparadores.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.rol === "direccion" && " (Dirección)"}</option>)}
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
