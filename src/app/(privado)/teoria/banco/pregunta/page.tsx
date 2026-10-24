import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { COMUN, etiquetaTema, NOMBRE_COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";
import { FormularioPregunta } from "../FormularioPregunta";

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Nueva pregunta (?oposicion=…&tema=…) o edición de una existente (?id=…)
export default async function Pregunta({ searchParams }: PageProps<"/teoria/banco/pregunta">) {
  await exigirRol("direccion", "preparador");
  const sp = await searchParams;
  const supabase = await createClient();

  const id = texto(sp.id);
  const { data: pregunta } = esUuid(id)
    ? await supabase.from("preguntas").select("id, oposicion_id, tema_id, enunciado, opciones, correcta, explicacion, activa, imagen").eq("id", id).maybeSingle()
    : { data: null };
  if (id && !pregunta) notFound();
  const oposicionId = pregunta ? (pregunta.oposicion_id ?? COMUN) : texto(sp.oposicion);
  const comun = oposicionId === COMUN;
  if (!comun && !esUuid(oposicionId)) notFound();

  const consultaTemas = supabase.from("temas").select("id, numero, nombre");
  const [{ data: oposicion }, { data: temas }] = await Promise.all([
    comun ? { data: { id: COMUN, nombre: NOMBRE_COMUN } } : supabase.from("oposiciones").select("id, nombre").eq("id", oposicionId).maybeSingle(),
    (comun ? consultaTemas.is("oposicion_id", null) : consultaTemas.eq("oposicion_id", oposicionId)).order("numero", { nullsFirst: false }).order("nombre"),
  ]);
  if (!oposicion) notFound();
  const opciones = (pregunta?.opciones as string[] | undefined) ?? [];
  const temaId = pregunta ? (pregunta.tema_id ?? "") : texto(sp.tema);

  return (
    <>
      <div>
        <p className="sub"><Link href={`/teoria/banco?${new URLSearchParams({ oposicion: oposicionId, tema: temaId })}`}>← Banco de tests</Link></p>
        <h1>{pregunta ? "Editar pregunta" : "Nueva pregunta"}</h1>
        <p className="sub">{oposicion.nombre}</p>
      </div>
      <section className="panel">
        <FormularioPregunta
          temas={(temas ?? []).map((t) => ({ id: t.id, nombre: etiquetaTema(t.numero, t.nombre) }))}
          inicial={{
            id: pregunta?.id ?? "",
            oposicion_id: oposicionId,
            tema_id: temaId,
            enunciado: pregunta?.enunciado ?? "",
            a: opciones[0] ?? "",
            b: opciones[1] ?? "",
            c: opciones[2] ?? "",
            d: opciones[3] ?? "",
            correcta: pregunta ? String(pregunta.correcta) : "",
            explicacion: pregunta?.explicacion ?? "",
            activa: pregunta && !pregunta.activa ? "" : "on",
          }}
          imagen={pregunta?.imagen ?? null}
        />
      </section>
    </>
  );
}
