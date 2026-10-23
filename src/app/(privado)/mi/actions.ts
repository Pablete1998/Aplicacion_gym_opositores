"use server";

import { revalidatePath } from "next/cache";
import { exigirRol, miAlumnoId } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { esClaveToque } from "@/lib/toques";

export type Respuesta = { ok: boolean; mensaje: string } | null;

export async function darToque(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("alumno");
  const para = String(form.get("para") ?? "");
  const mensaje = String(form.get("mensaje") ?? "");
  if (!para || !esClaveToque(mensaje)) return { ok: false, mensaje: "Elige un mensaje." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("dar_toque", { p_para: para, p_mensaje: mensaje });
  // Los motivos de rechazo (ya le diste uno hoy, no es de tu grupo…) vienen escritos desde la base de datos
  if (error) return { ok: false, mensaje: error.message.includes("hoy") ? "Ya le has dado un toque hoy. Mañana más." : "No se pudo mandar el toque." };
  return { ok: true, mensaje: "¡Toque enviado!" };
}

export async function marcarToquesLeidos() {
  await exigirRol("alumno");
  const id = await miAlumnoId();
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("toques").update({ leido: true }).eq("para_alumno", id).eq("leido", false);
  revalidatePath("/mi");
}
