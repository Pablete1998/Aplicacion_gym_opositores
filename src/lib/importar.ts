import "server-only";
import { revalidatePath } from "next/cache";
import { numeroTema, type FilaImportada } from "./preguntas";
import { createClient } from "./supabase/server";
import { normal } from "./texto";

// Guarda en el banco de una oposición (null = banco común) las preguntas ya leídas: crea los temas
// que falten y salta las que ya estén. Lo usan el pegado desde Excel y la carga desde el temario.
export async function guardarFilas(oposicion: string | null, filas: FilaImportada[]): Promise<{ ok: boolean; mensaje: string }> {
  const supabase = await createClient();
  const consultaTemas = supabase.from("temas").select("id, numero, nombre");
  const { data: temas, error: e1 } = await (oposicion ? consultaTemas.eq("oposicion_id", oposicion) : consultaTemas.is("oposicion_id", null));
  // Supabase devuelve como mucho 1000 filas por consulta: los enunciados ya guardados se leen por páginas
  const existentes: { enunciado: string }[] = [];
  let e2 = null;
  for (let desde = 0; !e2; desde += 1000) {
    const consulta = supabase.from("preguntas").select("enunciado");
    const { data, error } = await (oposicion ? consulta.eq("oposicion_id", oposicion) : consulta.is("oposicion_id", null)).order("id").range(desde, desde + 999);
    e2 = error;
    existentes.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  if (e1 || e2) return { ok: false, mensaje: "No se pudo leer el banco. ¿Está ejecutada la migración 0011?" };

  // Un tema se reconoce por su nombre o, si solo se escribe el número («3»), por su número
  const porNombre = new Map((temas ?? []).map((t) => [normal(t.nombre), t.id as string]));
  const porNumero = new Map((temas ?? []).filter((t) => t.numero !== null).map((t) => [t.numero as number, t.id as string]));
  const buscar = (nombre: string) =>
    porNombre.get(normal(nombre)) ?? (/^\d+$/.test(nombre) ? porNumero.get(Number(nombre)) : undefined);

  const nuevos = [...new Map(filas.filter((f) => f.tema && !buscar(f.tema)).map((f) => [normal(f.tema), f.tema])).values()];
  if (nuevos.length) {
    const { data: creados, error } = await supabase
      .from("temas")
      .insert(nuevos.map((nombre) => ({ oposicion_id: oposicion, nombre, numero: numeroTema(nombre) })))
      .select("id, nombre");
    if (error) return { ok: false, mensaje: "No se pudieron crear los temas nuevos." };
    for (const t of creados ?? []) porNombre.set(normal(t.nombre), t.id);
  }

  const vistas = new Set(existentes.map((p) => normal(p.enunciado)));
  const aInsertar = filas.filter((f) => {
    const clave = normal(f.enunciado);
    if (vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
  for (let i = 0; i < aInsertar.length; i += 500) {
    const { error } = await supabase.from("preguntas").insert(
      aInsertar.slice(i, i + 500).map((f) => ({
        oposicion_id: oposicion,
        tema_id: f.tema ? (buscar(f.tema) ?? null) : null,
        enunciado: f.enunciado,
        opciones: f.opciones,
        correcta: f.correcta,
        explicacion: f.explicacion,
      })),
    );
    if (error) return { ok: false, mensaje: `Se importaron ${i} preguntas y luego falló. Vuelve a pegar lo mismo: las ya importadas se saltan.` };
  }
  revalidatePath("/teoria/banco");

  const partes = [`${aInsertar.length} ${aInsertar.length === 1 ? "pregunta importada" : "preguntas importadas"}`];
  if (nuevos.length) partes.push(`${nuevos.length} ${nuevos.length === 1 ? "tema nuevo" : "temas nuevos"}`);
  if (filas.length > aInsertar.length) partes.push(`${filas.length - aInsertar.length} ya estaban en el banco`);
  return { ok: true, mensaje: partes.join(" · ") + "." };
}
