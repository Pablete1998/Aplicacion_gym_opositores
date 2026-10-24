"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { leerImportacion, numeroTema } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid, normal } from "@/lib/texto";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export type Respuesta = { ok: boolean; mensaje: string } | null;

// Con error se devuelve lo escrito para no perderlo (React vacía el formulario tras cada envío)
export type RespuestaPregunta = { ok: boolean; mensaje: string; n: number; valores?: Record<string, string> } | null;

export async function guardarTema(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const id = texto(form, "id");
  const oposicionId = texto(form, "oposicion_id");
  const nombre = texto(form, "nombre").slice(0, 200);
  const numero = texto(form, "numero") ? Number(texto(form, "numero")) : numeroTema(nombre);
  if (!nombre) return { ok: false, mensaje: "Escribe el nombre del tema." };
  if (numero !== null && !(Number.isInteger(numero) && numero >= 0 && numero < 1000)) return { ok: false, mensaje: "El número del tema no es válido." };
  if (id ? !esUuid(id) : !esUuid(oposicionId)) return { ok: false, mensaje: "No se pudo guardar." };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("temas").update({ nombre, numero }).eq("id", id)
    : await supabase.from("temas").insert({ oposicion_id: oposicionId, nombre, numero });
  if (error) return { ok: false, mensaje: error.code === "23505" ? "Ya hay un tema con ese nombre." : "No se pudo guardar." };
  revalidatePath("/tests");
  return { ok: true, mensaje: id ? "Guardado." : "Tema añadido." };
}

// Las preguntas del tema se quedan en el banco, sin tema
export async function borrarTema(form: FormData) {
  await exigirRol("direccion", "preparador");
  const id = texto(form, "id");
  if (!esUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("temas").delete().eq("id", id);
  revalidatePath("/tests");
}

export async function guardarPregunta(_prev: RespuestaPregunta, form: FormData): Promise<RespuestaPregunta> {
  await exigirRol("direccion", "preparador");
  const n = (_prev?.n ?? 0) + 1;
  const valores = Object.fromEntries(["id", "oposicion_id", "tema_id", "enunciado", "a", "b", "c", "d", "correcta", "explicacion", "activa"].map((c) => [c, texto(form, c)]));
  const fallo = (mensaje: string) => ({ ok: false, mensaje, n, valores });

  const { id, oposicion_id, tema_id, enunciado, explicacion } = valores;
  const todas = [valores.a, valores.b, valores.c, valores.d];
  const opciones = todas.slice(0, todas.findLastIndex((o) => o !== "") + 1);
  const correcta = Number(valores.correcta);
  if (!enunciado) return fallo("Escribe la pregunta.");
  if (enunciado.length > 2000 || explicacion.length > 2000) return fallo("El texto es demasiado largo (máximo 2000 letras).");
  if (opciones.length < 2) return fallo("Escribe al menos las respuestas A y B.");
  if (opciones.some((o) => o === "")) return fallo("Las respuestas van seguidas: no dejes una vacía entre otras dos.");
  if (!valores.correcta || !(correcta >= 0 && correcta < opciones.length)) return fallo("Marca cuál es la respuesta correcta.");
  if ((id && !esUuid(id)) || !esUuid(oposicion_id) || (tema_id && !esUuid(tema_id))) return fallo("No se pudo guardar.");

  const fila = { tema_id: tema_id || null, enunciado, opciones, correcta, explicacion: explicacion || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("preguntas").update({ ...fila, activa: valores.activa === "on" }).eq("id", id)
    : await supabase.from("preguntas").insert({ ...fila, oposicion_id });
  if (error) return fallo("No se pudo guardar. Inténtalo de nuevo.");
  revalidatePath("/tests");
  // Tras una nueva, el formulario queda limpio y en el mismo tema para escribir la siguiente
  return id
    ? { ok: true, mensaje: "Guardada.", n, valores }
    : { ok: true, mensaje: "Pregunta añadida. Puedes escribir la siguiente.", n, valores: { tema_id } };
}

export async function borrarPregunta(form: FormData) {
  await exigirRol("direccion", "preparador");
  const id = texto(form, "id");
  const volver = new URLSearchParams({ oposicion: texto(form, "oposicion_id"), tema: texto(form, "tema_id") });
  if (esUuid(id)) {
    const supabase = await createClient();
    await supabase.from("preguntas").delete().eq("id", id);
    revalidatePath("/tests");
  }
  redirect(`/tests?${volver}`);
}

// Pegado desde Excel o CSV: crea los temas que falten y salta las preguntas que ya estén en el banco
export async function importarPreguntas(oposicionId: string, contenido: string): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  if (!esUuid(oposicionId)) return { ok: false, mensaje: "Elige la oposición." };
  const { filas, errores } = leerImportacion(contenido);
  if (!filas.length) return { ok: false, mensaje: "No hay ninguna pregunta válida que importar." };

  const supabase = await createClient();
  const { data: temas, error: e1 } = await supabase.from("temas").select("id, numero, nombre").eq("oposicion_id", oposicionId);
  // Supabase devuelve como mucho 1000 filas por consulta: los enunciados ya guardados se leen por páginas
  const existentes: { enunciado: string }[] = [];
  let e2 = null;
  for (let desde = 0; !e2; desde += 1000) {
    const { data, error } = await supabase.from("preguntas").select("enunciado").eq("oposicion_id", oposicionId).order("id").range(desde, desde + 999);
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
      .insert(nuevos.map((nombre) => ({ oposicion_id: oposicionId, nombre, numero: numeroTema(nombre) })))
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
        oposicion_id: oposicionId,
        tema_id: f.tema ? (buscar(f.tema) ?? null) : null,
        enunciado: f.enunciado,
        opciones: f.opciones,
        correcta: f.correcta,
        explicacion: f.explicacion,
      })),
    );
    if (error) return { ok: false, mensaje: `Se importaron ${i} preguntas y luego falló. Vuelve a pegar lo mismo: las ya importadas se saltan.` };
  }
  revalidatePath("/tests");

  const partes = [`${aInsertar.length} ${aInsertar.length === 1 ? "pregunta importada" : "preguntas importadas"}`];
  if (nuevos.length) partes.push(`${nuevos.length} ${nuevos.length === 1 ? "tema nuevo" : "temas nuevos"}`);
  if (filas.length > aInsertar.length) partes.push(`${filas.length - aInsertar.length} ya estaban en el banco`);
  if (errores.length) partes.push(`${errores.length} con errores, sin importar`);
  return { ok: true, mensaje: partes.join(" · ") + "." };
}
