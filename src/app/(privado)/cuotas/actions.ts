"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

function refrescar() {
  revalidatePath("/cuotas");
  revalidatePath("/alumnos");
}

export async function cambiarCuota(form: FormData) {
  await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const alDia = form.get("al_dia") === "si";
  const supabase = await createClient();
  await supabase.from("alumnos").update({ cuota_al_dia: alDia }).eq("id", id);
  refrescar();
}

// Al empezar el mes: todos pendientes y se van marcando según pagan
export async function marcarTodasPendientes(form: FormData) {
  await exigirRol("direccion");
  if (form.get("confirmo") !== "on") return;
  const supabase = await createClient();
  await supabase.from("alumnos").update({ cuota_al_dia: false }).eq("activo", true);
  refrescar();
}
