"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { esUnidadEjercicio, UNIDAD_DE_PRUEBA } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";

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
  if (!esUuid(grupo) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: "Falta el grupo o la fecha." };
  if (!titulo) return { ok: false, mensaje: "Ponle un título a la sesión." };

  const ids = form.getAll("ej_id").map((v) => (esUuid(String(v)) ? String(v) : ""));
  const nombres = form.getAll("ej_nombre").map((v) => String(v).trim());
  const pautas = form.getAll("ej_pauta").map((v) => String(v).trim());
  const unidades = form.getAll("ej_unidad").map(String);
  const pruebasElegidas = form.getAll("ej_prueba").map((v) => (esUuid(String(v)) ? String(v) : ""));
  const supabase = await createClient();
  // La unidad de un ejercicio que es prueba oficial es la de la prueba, diga lo que diga el formulario
  const { data: pruebas } = pruebasElegidas.some(Boolean)
    ? await supabase.from("pruebas").select("id, unidad").in("id", pruebasElegidas.filter(Boolean))
    : { data: [] };
  const unidadPrueba = new Map((pruebas ?? []).map((p) => [p.id, UNIDAD_DE_PRUEBA[p.unidad] ?? null]));
  const ejercicios = nombres
    .map((nombre, i) => {
      const prueba_id = unidadPrueba.has(pruebasElegidas[i]) ? pruebasElegidas[i] : null;
      const unidad = prueba_id ? unidadPrueba.get(prueba_id)! : esUnidadEjercicio(unidades[i]) ? unidades[i] : null;
      return { id: ids[i] || null, nombre, pauta: pautas[i] || null, unidad, prueba_id, orden: i + 1 };
    })
    .filter((e) => e.nombre);
  if (ejercicios.length === 0) return { ok: false, mensaje: "Añade al menos un ejercicio." };

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
    await supabase.from("plan_ejercicios").update({ nombre: e.nombre, pauta: e.pauta, unidad: e.unidad, prueba_id: e.prueba_id, orden: e.orden }).eq("id", e.id!).eq("plan_id", plan.id);
  }
  const nuevos = ejercicios.filter((e) => !e.id).map(({ nombre, pauta, unidad, prueba_id, orden }) => ({ plan_id: plan.id, nombre, pauta, unidad, prueba_id, orden }));
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
  if (!esUuid(grupo) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) redirect("/planificar");
  const supabase = await createClient();
  const { data: ultimo } = await supabase
    .from("planes")
    .select("titulo, notas, plan_ejercicios(nombre, pauta, unidad, prueba_id, orden)")
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
  if (!esUuid(grupo) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) redirect("/planificar");
  if (form.get("confirmo") !== "on") redirect(volver(grupo, fecha));
  const supabase = await createClient();
  await supabase.from("planes").delete().eq("grupo_id", grupo).eq("fecha", fecha);
  revalidatePath("/planificar");
  redirect(volver(grupo, fecha));
}

// El preparador, como testigo, convierte la marca de sesión en marca oficial
export async function validarMarca(form: FormData) {
  await exigirRol("direccion", "preparador");
  const supabase = await createClient();
  const marca = String(form.get("marca") ?? "");
  if (esUuid(marca)) await supabase.rpc("validar_marca", { p_marca: marca });
  revalidatePath("/planificar");
}

export async function anularValidacion(form: FormData) {
  await exigirRol("direccion", "preparador");
  const supabase = await createClient();
  const marca = String(form.get("marca") ?? "");
  if (esUuid(marca)) await supabase.rpc("anular_validacion", { p_marca: marca });
  revalidatePath("/planificar");
}
