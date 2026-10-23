"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { esUnidadEjercicio } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";

export type Respuesta = { ok: boolean; mensaje: string } | null;

const volver = (grupo: string, fecha: string) => `/planificar?grupo=${grupo}&fecha=${fecha}` as const;

// Guarda el plan del día de un grupo. Los ejercicios con id se actualizan (para no perder lo que ya
// han apuntado los alumnos), los nuevos se añaden y los que se han quitado se borran.
export async function guardarPlan(_prev: Respuesta, form: FormData): Promise<Respuesta> {
  await exigirRol("direccion", "preparador");
  const grupo = String(form.get("grupo") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  const titulo = String(form.get("titulo") ?? "").trim();
  const notas = String(form.get("notas") ?? "").trim() || null;
  if (!grupo || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Falta el grupo o la fecha." };
  if (!titulo) return { ok: false, mensaje: "Ponle un título a la sesión." };

  const ids = form.getAll("ej_id").map(String);
  const nombres = form.getAll("ej_nombre").map((v) => String(v).trim());
  const pautas = form.getAll("ej_pauta").map((v) => String(v).trim());
  const unidades = form.getAll("ej_unidad").map(String);
  const ejercicios = nombres
    .map((nombre, i) => ({ id: ids[i] || null, nombre, pauta: pautas[i] || null, unidad: esUnidadEjercicio(unidades[i]) ? unidades[i] : null, orden: i + 1 }))
    .filter((e) => e.nombre);
  if (ejercicios.length === 0) return { ok: false, mensaje: "Añade al menos un ejercicio." };

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("planes")
    .upsert({ grupo_id: grupo, fecha, titulo, notas }, { onConflict: "grupo_id,fecha" })
    .select("id")
    .single();
  if (error || !plan) return { ok: false, mensaje: "No se pudo guardar. ¿Llevas este grupo?" };

  const conservar = ejercicios.flatMap((e) => (e.id ? [e.id] : []));
  let borrar = supabase.from("plan_ejercicios").delete().eq("plan_id", plan.id);
  if (conservar.length) borrar = borrar.not("id", "in", `(${conservar.join(",")})`);
  await borrar;
  for (const e of ejercicios.filter((e) => e.id)) {
    await supabase.from("plan_ejercicios").update({ nombre: e.nombre, pauta: e.pauta, unidad: e.unidad, orden: e.orden }).eq("id", e.id!).eq("plan_id", plan.id);
  }
  const nuevos = ejercicios.filter((e) => !e.id).map(({ nombre, pauta, unidad, orden }) => ({ plan_id: plan.id, nombre, pauta, unidad, orden }));
  if (nuevos.length) await supabase.from("plan_ejercicios").insert(nuevos);

  revalidatePath("/planificar");
  revalidatePath("/mi");
  // Se vuelve a cargar con los ids nuevos, para que guardar otra vez no duplique ejercicios
  redirect(`${volver(grupo, fecha)}&guardado=1`);
}

// Copia el último plan del grupo anterior a esta fecha, para no escribirlo desde cero
export async function copiarUltimo(form: FormData) {
  await exigirRol("direccion", "preparador");
  const grupo = String(form.get("grupo") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from("planes")
    .select("titulo, notas, plan_ejercicios(nombre, pauta, unidad, orden)")
    .eq("grupo_id", grupo)
    .lt("fecha", fecha)
    .order("fecha", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (ultimo) {
    const { data: plan } = await supabase.from("planes").insert({ grupo_id: grupo, fecha, titulo: ultimo.titulo, notas: ultimo.notas }).select("id").single();
    if (plan && ultimo.plan_ejercicios.length) {
      await supabase.from("plan_ejercicios").insert(ultimo.plan_ejercicios.map((e) => ({ ...e, plan_id: plan.id })));
    }
  }
  revalidatePath("/planificar");
  redirect(volver(grupo, fecha));
}

export async function borrarPlan(form: FormData) {
  await exigirRol("direccion", "preparador");
  const grupo = String(form.get("grupo") ?? "");
  const fecha = String(form.get("fecha") ?? "");
  if (form.get("confirmo") !== "on") redirect(volver(grupo, fecha));
  const supabase = await createClient();
  await supabase.from("planes").delete().eq("grupo_id", grupo).eq("fecha", fecha);
  revalidatePath("/planificar");
  redirect(volver(grupo, fecha));
}
