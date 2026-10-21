"use server";

import { redirect } from "next/navigation";
import { INICIO, perfilActual } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export async function cambiarPassword(_prev: string | null, form: FormData): Promise<string | null> {
  const perfil = await perfilActual();
  const nueva = String(form.get("nueva") ?? "");
  if (nueva.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (nueva !== String(form.get("repetir") ?? "")) return "Las dos contraseñas no coinciden.";

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return error.code === "same_password" ? "Elige una contraseña distinta de la provisional." : "No se pudo cambiar la contraseña.";
  await supabase.rpc("password_cambiada");
  redirect(INICIO[perfil.rol]);
}
