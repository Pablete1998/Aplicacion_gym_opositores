"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

// El alumno se pone (o se quita) su mote, que sale junto a su nombre en los rankings
export async function ponerMote(form: FormData) {
  await exigirRol("alumno");
  const supabase = await createClient();
  const { error } = await supabase.rpc("poner_mote", { p_mote: String(form.get("mote") ?? "") });
  revalidatePath("/rankings");
  revalidatePath("/mi");
  redirect(error ? `/rankings?mote=error#mote` : "/rankings?mote=ok#mote");
}
