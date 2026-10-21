"use server";

import { revalidatePath } from "next/cache";
import { leerMarca } from "@/lib/baremo";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export type Respuesta = { ok: boolean; mensaje: string } | null;

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

export async function guardarOposicion(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion");
  const id = texto(form, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("oposiciones")
    .update({ fecha_examen: texto(form, "fecha_examen") || null, baremo_fuente: texto(form, "baremo_fuente") || null })
    .eq("id", id);
  if (error) return { ok: false, mensaje: "No se pudo guardar." };
  revalidatePath(`/oposiciones/${id}`);
  return { ok: true, mensaje: "Guardado." };
}

// Los decimales llevan coma, así que los diez valores se separan con punto y coma o espacios
function leerPuntos(valor: string): number[] | null | "error" {
  if (!valor) return null;
  const marcas = valor.split(/[;\s]+/).filter(Boolean).map(leerMarca);
  if (marcas.length !== 10 || marcas.some((m) => m === null)) return "error";
  return marcas as number[];
}

export async function guardarBaremo(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion");
  const id = texto(form, "id");
  const minima = leerMarca(texto(form, "minima"));
  const objetivo = texto(form, "objetivo") ? leerMarca(texto(form, "objetivo")) : null;
  const edadMin = Number(texto(form, "edad_min") || 0);
  const edadMax = Number(texto(form, "edad_max") || 120);
  const puntos = leerPuntos(texto(form, "puntos"));
  const sexo = texto(form, "sexo");
  if (minima === null) return { ok: false, mensaje: "Escribe la marca mínima, por ejemplo 14,4 o 9:25." };
  if (texto(form, "objetivo") && objetivo === null) return { ok: false, mensaje: "El objetivo no es una marca válida." };
  if (!Number.isInteger(edadMin) || !Number.isInteger(edadMax) || edadMin > edadMax) return { ok: false, mensaje: "Revisa el tramo de edad." };
  if (puntos === "error") return { ok: false, mensaje: "La tabla de puntos necesita 10 marcas separadas por punto y coma (del 1 al 10)." };

  const fila = {
    sexo: sexo === "H" || sexo === "M" ? sexo : null,
    edad_min: edadMin,
    edad_max: edadMax,
    marca_minima: minima,
    marca_objetivo: objetivo,
    puntos,
  };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("baremos").update(fila).eq("id", id)
    : await supabase.from("baremos").insert({ ...fila, prueba_id: texto(form, "prueba_id") });
  if (error) return { ok: false, mensaje: "No se pudo guardar." };
  revalidatePath(`/oposiciones/${texto(form, "oposicion_id")}`);
  return { ok: true, mensaje: id ? "Guardado." : "Añadido." };
}

export async function borrarBaremo(form: FormData) {
  await exigirRol("direccion");
  const supabase = await createClient();
  await supabase.from("baremos").delete().eq("id", texto(form, "id"));
  revalidatePath(`/oposiciones/${texto(form, "oposicion_id")}`);
}
