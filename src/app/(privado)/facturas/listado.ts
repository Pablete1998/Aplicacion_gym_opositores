import { numeroFactura, type FilaFactura } from "@/lib/facturas";
import { createClient } from "@/lib/supabase/server";

export type Factura = FilaFactura & { id: string; rectifica_id: string | null; rectificadaPor: string | null };

// Facturas emitidas en un periodo, en orden de serie y número, con a qué factura rectifica cada
// rectificativa y qué facturas ya están anuladas (aunque la rectificativa sea de otro mes)
export async function cargarFacturas(desde: string, hasta: string): Promise<Factura[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("facturas")
    .select("id, serie, numero, fecha, tipo, cliente_nombre, cliente_nif, concepto, base, iva_tipo, iva_cuota, total, forma_pago, rectifica_id")
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("serie")
    .order("numero");
  const filas = data ?? [];
  const ids = filas.map((f) => f.id);
  const originales = filas.flatMap((f) => (f.rectifica_id ? [f.rectifica_id] : []));
  const [{ data: rectificativas }, { data: rectificadas }] = await Promise.all([
    ids.length ? supabase.from("facturas").select("serie, numero, rectifica_id").in("rectifica_id", ids) : Promise.resolve({ data: [] }),
    originales.length ? supabase.from("facturas").select("id, serie, numero").in("id", originales) : Promise.resolve({ data: [] }),
  ]);
  const anuladaPor = new Map((rectificativas ?? []).map((r) => [r.rectifica_id, numeroFactura(r.serie, r.numero)]));
  const numeroDe = new Map((rectificadas ?? []).map((r) => [r.id, numeroFactura(r.serie, r.numero)]));
  return filas.map((f) => ({
    ...f,
    base: Number(f.base),
    iva_tipo: Number(f.iva_tipo),
    iva_cuota: Number(f.iva_cuota),
    total: Number(f.total),
    rectificada: f.rectifica_id ? (numeroDe.get(f.rectifica_id) ?? null) : null,
    rectificadaPor: anuladaPor.get(f.id) ?? null,
  }));
}
