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
  revalidatePath("/facturas");
}

// Pagada este mes: se guarda cómo (efectivo, banco o regalado) y el QR vuelve a dejar entrar
export async function marcarPagada(form: FormData) {
  await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const forma = String(form.get("forma") ?? "");
  if (!esFormaPago(forma)) return;
  const supabase = await createClient();
  // Importe: el del alumno si paga distinto, si no el precio general (IVA incluido). Regalada: 0.
  const [{ data: alumno }, { data: datos }] = await Promise.all([
    supabase.from("alumnos").select("cuota_importe").eq("id", id).maybeSingle(),
    supabase.from("datos_facturacion").select("precio_cuota").maybeSingle(),
  ]);
  const importe = forma === "regalado" ? 0 : (alumno?.cuota_importe ?? datos?.precio_cuota ?? null);
  const { data: pago } = await supabase
    .from("pagos")
    .upsert({ alumno_id: id, mes: mesActual(), forma, importe }, { onConflict: "alumno_id,mes" })
    .select("id")
    .single();
  await supabase.from("alumnos").update({ cuota_al_dia: true }).eq("id", id);
  // La factura sale sola; si faltan los datos fiscales o el precio, se podrá emitir luego desde Facturas
  if (pago && forma !== "regalado") await supabase.rpc("emitir_factura", { p_pago: pago.id });
  refrescar();
}

// Deshace un pago marcado por error
export async function marcarPendiente(form: FormData) {
  await exigirRol("direccion");
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("alumnos").update({ cuota_al_dia: false }).eq("id", id);
  // Si ya tenía factura, no se borra: se anula con una rectificativa
  const { data: pago } = await supabase.from("pagos").select("id, facturas(id, rectifica_id)").eq("alumno_id", id).eq("mes", mesActual()).maybeSingle();
  for (const f of pago?.facturas ?? []) {
    if (!f.rectifica_id) await supabase.rpc("rectificar_factura", { p_factura: f.id, p_motivo: "Cuota marcada como pendiente por error" });
  }
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
