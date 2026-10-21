import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { baremoAplicable, edadEn, type Baremo, type BaremoFila, type Unidad } from "@/lib/baremo";

export type Rol = "direccion" | "preparador" | "alumno" | "recepcion";

export interface Perfil {
  id: string;
  nombre: string;
  rol: Rol;
  cambiar_password: boolean;
}

// Sin tipos generados de la base de datos, las relaciones a uno llegan tipadas como lista.
// Cuando haya proyecto de Supabase, sustituir por `supabase gen types`.
export function uno<T>(x: T | T[] | null | undefined): T | null {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
}

export const ROLES: Record<Rol, string> = {
  direccion: "Dirección",
  preparador: "Preparador",
  alumno: "Alumno",
  recepcion: "Recepción",
};

export const INICIO: Record<Rol, string> = {
  direccion: "/alumnos",
  preparador: "/alumnos",
  alumno: "/mi",
  recepcion: "/acceso",
};

export async function perfilActual(): Promise<Perfil> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login");
  // select("*") para no romper el acceso si aún no se ha aplicado la migración 0002
  const { data } = await supabase.from("perfiles").select("*").eq("id", auth.claims.sub).single();
  if (!data) redirect("/login");
  return { id: data.id, nombre: data.nombre, rol: data.rol, cambiar_password: data.cambiar_password === true };
}

// Corta el paso a quien no tenga uno de los roles indicados
export async function exigirRol(...roles: Rol[]): Promise<Perfil> {
  const perfil = await perfilActual();
  if (!roles.includes(perfil.rol)) redirect(INICIO[perfil.rol]);
  return perfil;
}

export interface AlumnoResumen {
  id: string;
  nombre: string;
  apellidos: string;
  cuota_al_dia: boolean;
  oposicion: string;
  grupo: string | null;
}

export async function listarAlumnos(): Promise<AlumnoResumen[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alumnos")
    .select("id, nombre, apellidos, cuota_al_dia, oposiciones(nombre), grupos(nombre)")
    .eq("activo", true)
    .order("apellidos");
  if (error) throw error;
  return (data ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    apellidos: a.apellidos,
    cuota_al_dia: a.cuota_al_dia,
    oposicion: uno(a.oposiciones)?.nombre ?? "",
    grupo: uno(a.grupos)?.nombre ?? null,
  }));
}

export interface PruebaFicha {
  id: string;
  nombre: string;
  tipo: "fisica" | "teorica";
  unidad: Unidad;
  baremo: Baremo | null;
  serie: { fecha: string; marca: number }[];
}

export interface Ficha {
  id: string;
  nombreCompleto: string;
  oposicion: { id: string; nombre: string; fecha_examen: string | null; baremo_fuente: string | null };
  grupo: string | null;
  cuota_al_dia: boolean;
  codigo_acceso: string;
  tieneAcceso: boolean;
  diasHastaExamen: number | null;
  pruebas: PruebaFicha[];
}

export async function cargarFicha(alumnoId: string): Promise<Ficha | null> {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("alumnos")
    .select("id, nombre, apellidos, sexo, fecha_nacimiento, cuota_al_dia, codigo_acceso, perfil_id, oposiciones(id, nombre, fecha_examen, baremo_fuente), grupos(nombre)")
    .eq("id", alumnoId)
    .maybeSingle();
  if (!a) return null;
  const alumno = a;
  const oposicion = uno(a.oposiciones)!;

  const [{ data: pruebas }, { data: resultados }] = await Promise.all([
    supabase
      .from("pruebas")
      .select("id, nombre, tipo, unidad, mayor_es_mejor, sexo, baremos(sexo, edad_min, edad_max, marca_minima, marca_objetivo, puntos)")
      .eq("oposicion_id", oposicion.id)
      // Pruebas comunes y las del sexo del alumno (dominadas en hombres, suspensión en mujeres)
      .or(`sexo.is.null,sexo.eq.${alumno.sexo}`)
      .order("orden"),
    supabase.from("resultados").select("prueba_id, fecha, marca").eq("alumno_id", alumnoId).order("fecha"),
  ]);

  const edad = edadEn(alumno.fecha_nacimiento);
  return {
    id: alumno.id,
    nombreCompleto: `${alumno.nombre} ${alumno.apellidos}`,
    oposicion,
    grupo: uno(alumno.grupos)?.nombre ?? null,
    cuota_al_dia: alumno.cuota_al_dia,
    codigo_acceso: alumno.codigo_acceso,
    tieneAcceso: Boolean(alumno.perfil_id),
    diasHastaExamen: oposicion.fecha_examen
      ? Math.round((new Date(oposicion.fecha_examen).getTime() - Date.now()) / 864e5)
      : null,
    pruebas: (pruebas ?? []).map((p) => {
      const fila = baremoAplicable(p.baremos as BaremoFila[], alumno.sexo, edad);
      return {
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        unidad: p.unidad,
        baremo: fila
          ? {
              unidad: p.unidad as Unidad,
              mayorEsMejor: p.mayor_es_mejor,
              minima: Number(fila.marca_minima),
              objetivo: fila.marca_objetivo === null ? null : Number(fila.marca_objetivo),
              puntos: fila.puntos?.map(Number) ?? null,
            }
          : null,
        serie: (resultados ?? []).filter((r) => r.prueba_id === p.id).map((r) => ({ fecha: r.fecha, marca: Number(r.marca) })),
      };
    }),
  };
}

export async function miAlumnoId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("mi_alumno");
  return (data as string | null) ?? null;
}
