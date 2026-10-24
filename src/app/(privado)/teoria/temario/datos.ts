import "server-only";
import { COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import type { TemaArchivo } from "@/lib/temario-archivos";

export interface Revision {
  version: string;
  revisado_en: string;
  quien: string | null;
}

export async function revisiones(): Promise<Map<string, Revision>> {
  const supabase = await createClient();
  const { data } = await supabase.from("temario_revisiones").select("carpeta, tema, version, revisado_en, perfiles(nombre)");
  return new Map(
    (data ?? []).map((r) => {
      const p = Array.isArray(r.perfiles) ? r.perfiles[0] : r.perfiles;
      return [`${r.carpeta}/${r.tema}`, { version: r.version, revisado_en: r.revisado_en, quien: p?.nombre ?? null }];
    }),
  );
}

export const clave = (t: Pick<TemaArchivo, "carpeta" | "tema">) => `${t.carpeta}/${t.tema}`;

// Revisado en la versión que hay ahora en el repositorio
export const vigente = (t: TemaArchivo, r: Map<string, Revision>) => r.get(clave(t))?.version === t.actualizado;

// La oposición del alumno (para enseñarle solo su temario y el común)
export async function oposicionDelAlumno(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mi_alumno");
  if (!data) return null;
  const { data: a } = await supabase.from("alumnos").select("oposiciones(nombre)").eq("id", data).maybeSingle();
  const o = Array.isArray(a?.oposiciones) ? a.oposiciones[0] : a?.oposiciones;
  return o?.nombre ?? null;
}

export const esDeAlumno = (t: TemaArchivo, oposicion: string | null) => t.oposicion === COMUN || t.oposicion === oposicion;
export const nombreOposicion = (o: string) => (o === COMUN ? "Común a todas" : o);
