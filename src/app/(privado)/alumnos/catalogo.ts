import { createClient } from "@/lib/supabase/server";
import type { Catalogo } from "./FormularioAlumno";

export async function cargarCatalogo(): Promise<Catalogo> {
  const supabase = await createClient();
  const [{ data: oposiciones }, { data: grupos }] = await Promise.all([
    supabase.from("oposiciones").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("grupos").select("id, nombre, oposicion_id").order("nombre"),
  ]);
  return { oposiciones: oposiciones ?? [], grupos: grupos ?? [] };
}
