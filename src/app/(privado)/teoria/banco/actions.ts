"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { randomUUID } from "node:crypto";
import { guardarFilas } from "@/lib/importar";
import { COMUN, idOposicion, leerImportacion, numeroTema } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const oposicionValida = (valor: string) => valor === COMUN || esUuid(valor);

const TIPOS_IMAGEN: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const MAX_IMAGEN = 2 * 1024 * 1024;

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
  if (id ? !esUuid(id) : !oposicionValida(oposicionId)) return { ok: false, mensaje: "No se pudo guardar." };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("temas").update({ nombre, numero }).eq("id", id)
    : await supabase.from("temas").insert({ oposicion_id: idOposicion(oposicionId), nombre, numero });
  if (error) return { ok: false, mensaje: error.code === "23505" ? "Ya hay un tema con ese nombre." : "No se pudo guardar." };
  revalidatePath("/teoria/banco");
  return { ok: true, mensaje: id ? "Guardado." : "Tema añadido." };
}

// Las preguntas del tema se quedan en el banco, sin tema
export async function borrarTema(form: FormData) {
  await exigirRol("direccion", "preparador");
  const id = texto(form, "id");
  if (!esUuid(id)) return;
  const supabase = await createClient();
  await supabase.from("temas").delete().eq("id", id);
  revalidatePath("/teoria/banco");
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
  if ((id && !esUuid(id)) || !oposicionValida(oposicion_id) || (tema_id && !esUuid(tema_id))) return fallo("No se pudo guardar.");
  const archivo = form.get("imagen");
  const nueva = archivo instanceof File && archivo.size > 0 ? archivo : null;
  if (nueva && !TIPOS_IMAGEN[nueva.type]) return fallo("La imagen tiene que ser PNG, JPG, WEBP o GIF.");
  if (nueva && nueva.size > MAX_IMAGEN) return fallo("La imagen pesa demasiado (máximo 2 MB).");

  const supabase = await createClient();
  const almacen = supabase.storage.from("preguntas");
  const { data: antes } = id ? await supabase.from("preguntas").select("imagen").eq("id", id).maybeSingle() : { data: null };
  let imagen: string | null = antes?.imagen ?? null;
  if (nueva) {
    const nombre = `${randomUUID()}.${TIPOS_IMAGEN[nueva.type]}`;
    const { error } = await almacen.upload(nombre, nueva, { contentType: nueva.type });
    if (error) return fallo("No se pudo subir la imagen. ¿Está ejecutada la migración 0014?");
    imagen = nombre;
  } else if (form.get("quitar_imagen") === "on") {
    imagen = null;
  }

  const fila = { tema_id: tema_id || null, enunciado, opciones, correcta, explicacion: explicacion || null, imagen };
  const { error } = id
    ? await supabase.from("preguntas").update({ ...fila, activa: valores.activa === "on" }).eq("id", id)
    : await supabase.from("preguntas").insert({ ...fila, oposicion_id: idOposicion(oposicion_id) });
  if (error) {
    if (nueva && imagen) await almacen.remove([imagen]);
    return fallo("No se pudo guardar. Inténtalo de nuevo.");
  }
  // La imagen anterior ya no la usa nadie
  if (antes?.imagen && antes.imagen !== imagen) await almacen.remove([antes.imagen]);
  revalidatePath("/teoria/banco");
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
    const { data } = await supabase.from("preguntas").delete().eq("id", id).select("imagen").maybeSingle();
    if (data?.imagen) await supabase.storage.from("preguntas").remove([data.imagen]);
    revalidatePath("/teoria/banco");
  }
  redirect(`/teoria/banco?${volver}`);
}

// Pegado desde Excel o CSV: crea los temas que falten y salta las preguntas que ya estén en el banco
export async function importarPreguntas(oposicionId: string, contenido: string): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  if (!oposicionValida(oposicionId)) return { ok: false, mensaje: "Elige la oposición." };
  const { filas, errores } = leerImportacion(contenido);
  if (!filas.length) return { ok: false, mensaje: "No hay ninguna pregunta válida que importar." };
  const r = await guardarFilas(idOposicion(oposicionId), filas);
  if (r.ok && errores.length) r.mensaje = r.mensaje.replace(/\.$/, ` · ${errores.length} con errores, sin importar.`);
  return r;
}
