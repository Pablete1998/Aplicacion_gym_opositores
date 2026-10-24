"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/datos";
import { guardarFilas } from "@/lib/importar";
import { COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { leerTema } from "@/lib/temario-archivos";

export type Respuesta = { ok: boolean; mensaje: string } | null;

// Un preparador lo ha leído y da el visto bueno a esta versión: desde ahora lo ven los alumnos
export async function marcarRevisado(carpeta: string, tema: number): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const leido = await leerTema(carpeta, tema);
  if (!leido) return { ok: false, mensaje: "No existe ese tema." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("temario_revisiones")
    .upsert({ carpeta, tema, version: leido.tema.actualizado, revisado_en: new Date().toISOString(), revisado_por: (await supabase.auth.getClaims()).data?.claims.sub });
  if (error) return { ok: false, mensaje: "No se pudo guardar. ¿Está ejecutada la migración 0015?" };
  revalidatePath("/teoria/temario");
  return { ok: true, mensaje: "Revisado. Ya lo ven los alumnos." };
}

export async function quitarRevision(carpeta: string, tema: number): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const supabase = await createClient();
  await supabase.from("temario_revisiones").delete().eq("carpeta", carpeta).eq("tema", tema);
  revalidatePath("/teoria/temario");
  return { ok: true, mensaje: "Retirado: los alumnos ya no lo ven." };
}

// Pasa al banco las preguntas que acompañan al tema (las que ya estén se saltan)
export async function cargarPreguntas(carpeta: string, tema: number): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const leido = await leerTema(carpeta, tema);
  if (!leido?.preguntas.length) return { ok: false, mensaje: "Este tema no trae preguntas." };
  let oposicion: string | null = null;
  if (leido.tema.oposicion !== COMUN) {
    const supabase = await createClient();
    const { data } = await supabase.from("oposiciones").select("id").eq("nombre", leido.tema.oposicion).maybeSingle();
    if (!data) return { ok: false, mensaje: `No hay ninguna oposición llamada «${leido.tema.oposicion}» en la app.` };
    oposicion = data.id;
  }
  return guardarFilas(oposicion, leido.preguntas);
}
