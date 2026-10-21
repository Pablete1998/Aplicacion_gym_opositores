"use server";

import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAcceso = { permitido: boolean; nombre: string | null; motivo: string | null } | null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function comprobarAcceso(_prev: ResultadoAcceso, form: FormData): Promise<ResultadoAcceso> {
  await exigirRol("recepcion", "direccion");
  const codigo = String(form.get("codigo") ?? "").trim();
  if (!UUID.test(codigo)) return { permitido: false, nombre: null, motivo: "Código no válido" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_acceso", { p_codigo: codigo });
  if (error || !data?.[0]) return { permitido: false, nombre: null, motivo: "No se pudo comprobar el código" };
  return data[0] as ResultadoAcceso;
}
