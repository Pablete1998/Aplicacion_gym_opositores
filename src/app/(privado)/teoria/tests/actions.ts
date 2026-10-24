"use server";

import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function empezarTest(form: FormData) {
  await exigirRol("alumno");
  const tipo = texto(form, "tipo");
  const tema = texto(form, "tema");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("empezar_test", {
    p_tipo: tipo,
    p_tema: esUuid(tema) ? tema : null,
    p_cuantas: Number(texto(form, "cuantas")) || 10,
    p_minutos: Number(texto(form, "minutos")) || null,
    // Solo se manda cuando hace falta, para que funcione aunque no esté ejecutada la migración 0014
    ...(tema === COMUN ? { p_comun: true } : {}),
  });
  if (error || !data) redirect(`/teoria/tests?aviso=${error?.message.includes("No hay preguntas") ? "sin-preguntas" : "error"}`);
  redirect(`/teoria/tests/${data}`);
}

export type Correccion = { ok: true; correcta: number | null; explicacion: string | null } | { ok: false; mensaje: string };

export async function responder(intentoId: string, preguntaId: string, elegida: number | null): Promise<Correccion> {
  await exigirRol("alumno");
  if (!esUuid(intentoId) || !esUuid(preguntaId)) return { ok: false, mensaje: "Respuesta no válida." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("responder", { p_intento: intentoId, p_pregunta: preguntaId, p_elegida: elegida });
  if (error) return { ok: false, mensaje: error.message.includes("tiempo") ? "Se acabó el tiempo." : "No se pudo guardar la respuesta. Revisa la conexión." };
  const fila = (data as { correcta: number; explicacion: string | null }[] | null)?.[0];
  return { ok: true, correcta: fila?.correcta ?? null, explicacion: fila?.explicacion ?? null };
}

export async function terminarTest(intentoId: string) {
  await exigirRol("alumno");
  if (!esUuid(intentoId)) return;
  const supabase = await createClient();
  await supabase.rpc("terminar_test", { p_intento: intentoId });
  redirect(`/teoria/tests/${intentoId}`);
}
