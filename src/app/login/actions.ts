"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function entrar(_prev: string | null, form: FormData): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "Correo o contraseña incorrectos.";
  redirect("/");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
