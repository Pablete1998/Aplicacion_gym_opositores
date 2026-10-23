"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerMarca } from "@/lib/baremo";
import { exigirRol, miAlumnoId } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";
import { esClaveToque } from "@/lib/toques";

export type Respuesta = { ok: boolean; mensaje: string } | null;

export async function darToque(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("alumno");
  const para = String(form.get("para") ?? "");
  const mensaje = String(form.get("mensaje") ?? "");
  if (!esUuid(para) || !esClaveToque(mensaje)) return { ok: false, mensaje: "Elige un mensaje." };
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

// Empieza la sesión de hoy. La base de datos comprueba la cuota, el grupo y que el plan sea de hoy.
export async function empezarSesion(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("alumno");
  const plan = String(form.get("plan") ?? "");
  if (!esUuid(plan)) return { ok: false, mensaje: "No se pudo empezar la sesión." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("empezar_sesion", { p_plan: plan });
  if (error) return { ok: false, mensaje: error.message || "No se pudo empezar la sesión." };
  revalidatePath("/mi");
  redirect("/mi/sesion");
}

// Guarda lo apuntado en cada ejercicio y, si se pide, termina la sesión
export async function guardarSesion(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("alumno");
  const sesion = String(form.get("sesion") ?? "");
  const ejercicios = form.getAll("ejercicio").map(String).filter(esUuid);
  if (!esUuid(sesion)) return { ok: false, mensaje: "No se pudo guardar." };
  const filas: { sesion_id: string; ejercicio_id: string; valor: number | null; hecho: boolean }[] = [];
  for (const id of ejercicios) {
    const texto = String(form.get(`v_${id}`) ?? "").trim();
    if (form.has(`v_${id}`)) {
      if (!texto) continue;
      const valor = leerMarca(texto);
      if (valor === null) return { ok: false, mensaje: `«${texto}» no es una marca válida. Escribe un número, por ejemplo 12, 60,5 o 3:45.` };
      filas.push({ sesion_id: sesion, ejercicio_id: id, valor, hecho: true });
    } else if (form.get(`h_${id}`) === "on") {
      filas.push({ sesion_id: sesion, ejercicio_id: id, valor: null, hecho: true });
    }
  }
  const supabase = await createClient();
  if (filas.length) {
    const { error } = await supabase.from("sesion_marcas").upsert(filas, { onConflict: "sesion_id,ejercicio_id" });
    if (error) return { ok: false, mensaje: "No se pudo guardar. ¿Ya habías terminado la sesión?" };
  }
  // Lo que se desmarca o se deja vacío se quita
  const apuntados = filas.map((f) => f.ejercicio_id);
  let quitar = supabase.from("sesion_marcas").delete().eq("sesion_id", sesion);
  if (apuntados.length) quitar = quitar.not("ejercicio_id", "in", `(${apuntados.join(",")})`);
  await quitar;

  if (form.get("terminar") === "si") {
    const sensacion = Number(form.get("sensacion"));
    if (!(sensacion >= 1 && sensacion <= 5)) return { ok: false, mensaje: "Dinos cómo te has sentido para terminar." };
    const { error } = await supabase.rpc("terminar_sesion", { p_sesion: sesion, p_sensacion: sensacion, p_notas: String(form.get("notas") ?? "") });
    if (error) return { ok: false, mensaje: "No se pudo terminar la sesión." };
    revalidatePath("/mi");
    redirect("/mi/sesion?terminada=1");
  }
  revalidatePath("/mi/sesion");
  return { ok: true, mensaje: "Guardado." };
}
