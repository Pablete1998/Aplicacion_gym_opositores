"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

const volver = (form: FormData, extra: string) => {
  const periodo = String(form.get("periodo") ?? "");
  return `/facturas?${periodo ? `periodo=${encodeURIComponent(periodo)}&` : ""}${extra}`;
};

// Datos de la academia que salen en las facturas
export async function guardarDatos(form: FormData) {
  await exigirRol("direccion");
  const texto = (campo: string) => String(form.get(campo) ?? "").trim();
  const numero = (campo: string) => (texto(campo) ? Number(texto(campo).replace(",", ".")) : null);
  const datos = {
    razon_social: texto("razon_social"),
    nif: texto("nif").toUpperCase().replace(/[\s-]/g, ""),
    domicilio: texto("domicilio"),
    codigo_postal: texto("codigo_postal"),
    localidad: texto("localidad"),
    provincia: texto("provincia"),
    email: texto("email") || null,
    serie: texto("serie").toUpperCase() || "A",
    iva: numero("iva") ?? 21,
    exencion: texto("exencion") || null,
    precio_cuota: numero("precio_cuota"),
    concepto: texto("concepto") || "Cuota mensual de preparación de oposiciones",
  };
  if (!/^[A-Z0-9]{1,5}$/.test(datos.serie)) redirect(volver(form, "error=" + encodeURIComponent("La serie son de 1 a 5 letras o números, sin espacios.") + "#datos"));
  if (!(datos.iva >= 0 && datos.iva <= 30)) redirect(volver(form, "error=" + encodeURIComponent("El IVA tiene que estar entre 0 y 30 %.") + "#datos"));
  if (datos.precio_cuota !== null && !(datos.precio_cuota >= 0)) redirect(volver(form, "error=" + encodeURIComponent("El precio de la cuota tiene que ser un importe en euros.") + "#datos"));
  if (datos.iva === 0 && !datos.exencion) redirect(volver(form, "error=" + encodeURIComponent("Con IVA 0 % la factura tiene que decir por qué está exenta (pregúntale al gestor el artículo).") + "#datos"));

  const supabase = await createClient();
  const { error } = await supabase.from("datos_facturacion").update(datos).eq("id", 1);
  if (error) redirect(volver(form, "error=" + encodeURIComponent("No se pudieron guardar los datos.") + "#datos"));
  revalidatePath("/facturas");
  revalidatePath("/cuotas");
  redirect(volver(form, "guardado=1#datos"));
}

// Emite la factura de una cuota cobrada que se quedó sin ella (p. ej. porque faltaban los datos)
export async function emitir(form: FormData) {
  await exigirRol("direccion");
  const supabase = await createClient();
  const { error } = await supabase.rpc("emitir_factura", { p_pago: String(form.get("pago") ?? "") });
  revalidatePath("/facturas");
  revalidatePath("/cuotas");
  redirect(volver(form, error ? "error=" + encodeURIComponent(error.message) : "emitida=1"));
}

// Anula una factura con una rectificativa (las facturas no se borran nunca) y, si se pide, emite
// otra con los datos de ahora: así se corrige, por ejemplo, una factura a la que le faltaba el NIF
export async function rectificar(form: FormData) {
  await exigirRol("direccion");
  if (form.get("confirmo") !== "on") return;
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("rectificar_factura", { p_factura: id, p_motivo: String(form.get("motivo") ?? "") });
  let fallo = error?.message;
  if (!fallo && form.get("reemitir") === "on") {
    const { data: original } = await supabase.from("facturas").select("pago_id").eq("id", id).maybeSingle();
    if (original?.pago_id) fallo = (await supabase.rpc("emitir_factura", { p_pago: original.pago_id })).error?.message;
  }
  revalidatePath("/facturas");
  revalidatePath("/cuotas");
  redirect(volver(form, fallo ? "error=" + encodeURIComponent(fallo) : "rectificada=1"));
}
