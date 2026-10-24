"use server";

import { exigirRol, miAlumnoId } from "@/lib/datos";
import { programar, TARJETA_NUEVA, type EstadoTarjeta, type Nota } from "@/lib/repaso";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";

// hoy: vuelve en menos de 20 minutos, así que se repasa en esta misma sesión
export type Valoracion = { ok: true; tarjeta: EstadoTarjeta; toca_en: string; hoy: boolean } | { ok: false; mensaje: string };

// Guarda cómo de bien se sabía la tarjeta y calcula cuándo vuelve
export async function valorar(preguntaId: string, nota: Nota): Promise<Valoracion> {
  await exigirRol("alumno");
  const alumnoId = await miAlumnoId();
  if (!alumnoId || !esUuid(preguntaId) || ![1, 2, 3, 4].includes(nota)) return { ok: false, mensaje: "No se pudo guardar." };
  const supabase = await createClient();
  const { data: actual } = await supabase
    .from("tarjetas")
    .select("estado, paso, facilidad, intervalo, repeticiones, lapsos")
    .eq("alumno_id", alumnoId)
    .eq("pregunta_id", preguntaId)
    .maybeSingle();
  const antes: EstadoTarjeta = actual
    ? { ...actual, facilidad: Number(actual.facilidad), intervalo: Number(actual.intervalo) }
    : TARJETA_NUEVA;
  const ahora = new Date();
  const { toca_en, ...tarjeta } = programar(antes, nota, ahora);
  const { error } = await supabase
    .from("tarjetas")
    .upsert({ alumno_id: alumnoId, pregunta_id: preguntaId, ...tarjeta, toca_en: toca_en.toISOString(), ultima_en: ahora.toISOString() });
  if (error) return { ok: false, mensaje: "No se pudo guardar. Revisa la conexión." };
  return { ok: true, tarjeta, toca_en: toca_en.toISOString(), hoy: toca_en.getTime() - ahora.getTime() < 20 * 60_000 };
}
