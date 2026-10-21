import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

const fecha = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function Oposiciones() {
  await exigirRol("direccion");
  const supabase = await createClient();
  const { data } = await supabase.from("oposiciones").select("id, nombre, cuerpo, fecha_examen, baremo_fuente").order("nombre");
  return (
    <>
      <div>
        <h1>Oposiciones y baremos</h1>
        <p className="sub">Marcas mínimas de cada prueba por sexo y edad. Cuando salga una convocatoria nueva, actualízalas aquí.</p>
      </div>
      <section className="panel">
        <div className="tbl">
          <table>
            <thead><tr><th>Oposición</th><th>Examen previsto</th><th>Baremo</th></tr></thead>
            <tbody>
              {(data ?? []).map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/oposiciones/${o.id}`}>{o.nombre}</Link>{o.cuerpo && <span className="sub"> · {o.cuerpo}</span>}</td>
                  <td>{o.fecha_examen ? fecha(o.fecha_examen) : "Sin fecha"}</td>
                  <td>{o.baremo_fuente ?? "Sin fuente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
