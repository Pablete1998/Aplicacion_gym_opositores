"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

export type RespuestaAlumno = { error: string } | null;

function leerFormulario(form: FormData) {
  const texto = (campo: string) => String(form.get(campo) ?? "").trim();
  return {
    nombre: texto("nombre"),
    apellidos: texto("apellidos"),
    sexo: texto("sexo"),
    fecha_nacimiento: texto("fecha_nacimiento") || null,
    oposicion_id: texto("oposicion_id"),
    grupo_id: texto("grupo_id") || null,
    cuota_al_dia: form.get("cuota_al_dia") === "on",
    activo: form.get("activo") !== "off",
    nif: texto("nif").toUpperCase().replace(/[\s-]/g, "") || null,
    domicilio: texto("domicilio") || null,
    cuota_importe: texto("cuota_importe") ? Number(texto("cuota_importe").replace(",", ".")) : null,
  };
}

function validar(datos: ReturnType<typeof leerFormulario>): string | null {
  if (!datos.nombre || !datos.apellidos) return "Escribe nombre y apellidos.";
  if (datos.sexo !== "H" && datos.sexo !== "M") return "Elige el sexo (se usa para aplicar el baremo).";
  if (!datos.oposicion_id) return "Elige la oposición.";
  if (datos.cuota_importe !== null && !(datos.cuota_importe >= 0)) return "La cuota tiene que ser un importe en euros.";
  return null;
}

export async function crearAlumno(_prev: RespuestaAlumno, form: FormData): Promise<RespuestaAlumno> {
  await exigirRol("direccion");
  const datos = leerFormulario(form);
  const error = validar(datos);
  if (error) return { error };
  if (form.get("consentimiento") !== "on") return { error: "Hace falta el consentimiento del alumno para guardar sus datos (RGPD)." };

  const supabase = await createClient();
  const { data, error: fallo } = await supabase
    .from("alumnos")
    .insert({ ...datos, consentimiento_rgpd: new Date().toISOString() })
    .select("id")
    .single();
  if (fallo || !data) return { error: "No se pudo guardar el alumno. Inténtalo de nuevo." };
  revalidatePath("/alumnos");
  redirect(`/alumnos/${data.id}`);
}

export async function actualizarAlumno(id: string, _prev: RespuestaAlumno, form: FormData): Promise<RespuestaAlumno> {
  await exigirRol("direccion");
  const datos = leerFormulario(form);
  const error = validar(datos);
  if (error) return { error };

  const supabase = await createClient();
  const { error: fallo } = await supabase.from("alumnos").update(datos).eq("id", id);
  if (fallo) return { error: "No se pudieron guardar los cambios. Inténtalo de nuevo." };
  revalidatePath("/alumnos");
  revalidatePath(`/alumnos/${id}`);
  redirect(`/alumnos/${id}`);
}
