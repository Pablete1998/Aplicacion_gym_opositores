"use server";

import { revalidatePath } from "next/cache";
import { leerMarca } from "@/lib/baremo";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export type Respuesta = { ok: boolean; mensaje: string } | null;

export async function registrarMarca(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const alumnoId = String(form.get("alumno") ?? "");
  const pruebaId = String(form.get("prueba") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  const marca = leerMarca(String(form.get("marca") ?? ""));
  if (!alumnoId || !pruebaId) return { ok: false, mensaje: "Elige alumno y prueba." };
  if (marca === null) return { ok: false, mensaje: "Escribe la marca como número, por ejemplo 11,4, 8 o 3:45." };

  const supabase = await createClient();
  const { error } = await supabase.from("resultados").insert({ alumno_id: alumnoId, prueba_id: pruebaId, fecha: fecha || undefined, marca });
  if (error) return { ok: false, mensaje: "No se pudo guardar. Comprueba que el alumno es de tu grupo." };
  revalidatePath(`/alumnos/${alumnoId}`);
  return { ok: true, mensaje: "Marca guardada." };
}
