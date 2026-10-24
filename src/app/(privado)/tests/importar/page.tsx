import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { Importador } from "./Importador";

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function Importar({ searchParams }: PageProps<"/tests/importar">) {
  await exigirRol("direccion", "preparador");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: oposiciones } = await supabase.from("oposiciones").select("id, nombre").eq("activa", true).order("nombre");
  const oposicion = oposiciones?.find((o) => o.id === texto(sp.oposicion)) ?? oposiciones?.[0] ?? null;

  return (
    <>
      <div>
        <p className="sub"><Link href={`/tests?oposicion=${oposicion?.id ?? ""}`}>← Banco de tests</Link></p>
        <h1>Pegar preguntas desde Excel</h1>
        <p className="sub">
          Pon en Excel una pregunta por fila con estas columnas: <b>Tema · Pregunta · A · B · C · D · Correcta · Explicación</b>.
          Selecciona las filas, cópialas y pégalas aquí. También puedes subir el archivo guardado como CSV.
        </p>
        <p className="sub">
          <a href="/tests/plantilla">Descargar la plantilla</a> · La D se deja vacía si el examen tiene tres respuestas · En «Correcta» va la letra ·
          Los temas que no existan se crean solos · Las preguntas que ya estén en el banco se saltan.
        </p>
      </div>
      <section className="panel">
        <form className="campos" action="/tests/importar">
          <label>
            Oposición
            <select name="oposicion" defaultValue={oposicion?.id}>
              {(oposiciones ?? []).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </label>
          <button className="btn ghost">Cambiar</button>
        </form>
        {oposicion && <Importador key={oposicion.id} oposicionId={oposicion.id} oposicion={oposicion.nombre} />}
      </section>
    </>
  );
}
