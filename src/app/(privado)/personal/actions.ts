"use server";

import { revalidatePath } from "next/cache";
import { exigirRol, ROLES, type Rol } from "@/lib/datos";
import { passwordProvisional } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Credenciales = { ok: true; email: string; password: string } | { ok: false; error: string } | null;

const esRol = (r: string): r is Rol => r in ROLES;

async function marcarCambioPassword(id: string) {
  const supabase = await createClient();
  // Si la migración 0002 no está aplicada, la columna no existe: el acceso funciona igual
  await supabase.from("perfiles").update({ cambiar_password: true }).eq("id", id);
}

export async function crearAcceso(_prev: Credenciales, form: FormData): Promise<Credenciales> {
  await exigirRol("direccion");
  const nombre = String(form.get("nombre") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const rol = String(form.get("rol") ?? "");
  const alumnoId = String(form.get("alumno_id") ?? "");
  if (!nombre || !email.includes("@")) return { ok: false, error: "Escribe el nombre y un correo válido." };
  if (!esRol(rol)) return { ok: false, error: "Elige un rol." };
  if (rol === "alumno" && !alumnoId) return { ok: false, error: "Elige qué ficha de alumno corresponde a esta persona." };

  const password = passwordProvisional();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } });
  if (error || !data.user) {
    return { ok: false, error: error?.code === "email_exists" ? "Ya existe un acceso con ese correo." : "No se pudo crear el acceso." };
  }

  const supabase = await createClient();
  const { error: fallo } = await supabase.from("perfiles").update({ nombre, rol }).eq("id", data.user.id);
  if (fallo) return { ok: false, error: "Se creó el acceso pero no se pudo asignar el rol. Cámbialo en la lista." };
  await marcarCambioPassword(data.user.id);
  if (rol === "alumno") await supabase.from("alumnos").update({ perfil_id: data.user.id }).eq("id", alumnoId);

  revalidatePath("/personal");
  return { ok: true, email, password };
}

export async function restablecerPassword(id: string): Promise<Credenciales> {
  await exigirRol("direccion");
  const password = passwordProvisional();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(id, { password });
  if (error || !data.user) return { ok: false, error: "No se pudo restablecer la contraseña." };
  await marcarCambioPassword(id);
  return { ok: true, email: data.user.email ?? "", password };
}

export async function cambiarRol(form: FormData) {
  const yo = await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const rol = String(form.get("rol") ?? "");
  if (id === yo.id || !esRol(rol)) return;
  const supabase = await createClient();
  await supabase.from("perfiles").update({ rol }).eq("id", id);
  revalidatePath("/personal");
}

export async function cambiarAcceso(form: FormData) {
  const yo = await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  if (id === yo.id) return;
  const activar = form.get("activar") === "si";
  const admin = createAdminClient();
  // Un bloqueo de 100 años equivale a quitar el acceso sin borrar el historial
  await admin.auth.admin.updateUserById(id, { ban_duration: activar ? "none" : "876000h" });
  revalidatePath("/personal");
}

export async function asignarPreparador(form: FormData) {
  await exigirRol("direccion");
  const grupoId = String(form.get("grupo_id") ?? "");
  const preparadorId = String(form.get("preparador_id") ?? "") || null;
  const supabase = await createClient();
  await supabase.from("grupos").update({ preparador_id: preparadorId }).eq("id", grupoId);
  revalidatePath("/personal");
}
