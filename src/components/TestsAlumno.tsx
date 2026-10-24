import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatoNota, TIPOS, type TipoTest } from "@/lib/tests";

// Los últimos tests de teoría de un alumno, para su ficha (dirección y su preparador)
export async function TestsAlumno({ alumnoId }: { alumnoId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("intentos")
    .select("id, tipo, total, aciertos, fallos, blancos, nota, terminado_en")
    .eq("alumno_id", alumnoId)
    .not("terminado_en", "is", null)
    .order("terminado_en", { ascending: false })
    .limit(8);
  if (!data?.length) return null;
  return (
    <section className="panel">
      <h2>Tests de teoría</h2>
      <div className="tbl">
        <table>
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Aciertos</th><th>Fallos</th><th>En blanco</th><th>Nota</th></tr></thead>
          <tbody>
            {data.map((i) => (
              <tr key={i.id}>
                <td><Link href={`/teoria/tests/${i.id}`}>{new Date(i.terminado_en!).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "Europe/Madrid" })}</Link></td>
                <td>{TIPOS[i.tipo as TipoTest]}</td>
                <td>{i.aciertos} de {i.total}</td>
                <td>{i.fallos}</td>
                <td>{i.blancos}</td>
                <td><b>{formatoNota(i.nota)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
