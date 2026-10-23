"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/datos";
import { mesActual } from "@/lib/informes";
import { createClient } from "@/lib/supabase/server";
import { esFormaPago } from "@/lib/pagos";

function refrescar() {
  revalidatePath("/cuotas");
  revalidatePath("/alumnos");
  revalidatePath("/panel");
}

// Pagada este mes: se guarda cómo (efectivo, banco o regalado) y el QR vuelve a dejar entrar
export async function marcarPagada(form: FormData) {
  await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const forma = String(form.get("forma") ?? "");
  if (!esFormaPago(forma)) return;
  const supabase = await createClient();
  await supabase.from("pagos").upsert({ alumno_id: id, mes: mesActual(), forma }, { onConflict: "alumno_id,mes" });
  await supabase.from("alumnos").update({ cuota_al_dia: true }).eq("id", id);
  refrescar();
}

// Deshace un pago marcado por error
export async function marcarPendiente(form: FormData) {
  await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("alumnos").update({ cuota_al_dia: false }).eq("id", id);
  await supabase.from("pagos").delete().eq("alumno_id", id).eq("mes", mesActual());
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
