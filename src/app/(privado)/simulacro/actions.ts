"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { leerMarca } from "@/lib/baremo";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export type Respuesta = { ok: boolean; mensaje: string } | null;

// Guarda de una vez las marcas de todo el grupo. Cada campo se llama m_<id del alumno>.
export async function guardarSimulacro(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const grupoId = String(form.get("grupo") ?? "");
  const pruebaId = String(form.get("prueba") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  if (!grupoId || !pruebaId || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Elige grupo, prueba y fecha." };

  const filas: { alumno_id: string; prueba_id: string; fecha: string; marca: number }[] = [];
  const malas: string[] = [];
  for (const [clave, valor] of form) {
    if (!clave.startsWith("m_") || typeof valor !== "string" || !valor.trim()) continue;
    const marca = leerMarca(valor);
    if (marca === null) malas.push(valor.trim());
    else filas.push({ alumno_id: clave.slice(2), prueba_id: pruebaId, fecha, marca });
  }
  if (malas.length) {
    return { ok: false, mensaje: `No se ha guardado nada. Revisa ${malas.length === 1 ? "esta marca" : "estas marcas"}: ${malas.join(", ")}. Escríbelas como 11,4, 8 o 3:45.` };
  }
  if (!filas.length) return { ok: false, mensaje: "Apunta al menos una marca." };

  const supabase = await createClient();
  const { error } = await supabase.from("resultados").insert(filas);
  if (error) return { ok: false, mensaje: "No se pudo guardar. Comprueba que los alumnos son de tu grupo." };
  for (const f of filas) revalidatePath(`/alumnos/${f.alumno_id}`);
  redirect(`/simulacro?${new URLSearchParams({ grupo: grupoId, prueba: pruebaId, fecha })}`);
}
