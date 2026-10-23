// Utilidades de facturas (sin dependencias, para poder probarlas)

export function numeroFactura(serie: string, numero: number): string {
  return `${serie}-${String(numero).padStart(4, "0")}`;
}

const EUROS = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
export function euros(valor: number): string {
  return EUROS.format(valor);
}

// El concepto se guarda con el mes de la cuota al final ("… · 2026-10"); en papel, con su nombre
export function conceptoLegible(concepto: string): string {
  return concepto.replace(/ · (\d{4})-(0[1-9]|1[0-2])$/, (_, anio: string, mes: string) => {
    const nombre = new Date(`${anio}-${mes}-15T12:00Z`).toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
    return ` · ${nombre} de ${anio}`;
  });
}

export interface FilaFactura {
  serie: string;
  numero: number;
  fecha: string;
  tipo: string;
  cliente_nombre: string;
  cliente_nif: string | null;
  concepto: string;
  base: number;
  iva_tipo: number;
  iva_cuota: number;
  total: number;
  forma_pago: string;
  rectificada?: string | null;
}

// CSV para el gestor: separador «;» y coma decimal, como lo abre Excel en español. Con BOM para las tildes.
export function csvFacturas(filas: FilaFactura[]): string {
  const num = (v: number) => v.toFixed(2).replace(".", ",");
  const celda = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const cabecera = ["Número", "Fecha", "Tipo", "Cliente", "NIF", "Concepto", "Base imponible", "IVA %", "Cuota IVA", "Total", "Forma de pago", "Rectifica a"];
  const lineas = filas.map((f) =>
    [
      numeroFactura(f.serie, f.numero),
      f.fecha.split("-").reverse().join("/"),
      f.serie.startsWith("R") ? "Rectificativa" : f.tipo === "completa" ? "Completa" : "Simplificada",
      f.cliente_nombre,
      f.cliente_nif ?? "",
      conceptoLegible(f.concepto),
      num(f.base),
      num(f.iva_tipo),
      num(f.iva_cuota),
      num(f.total),
      f.forma_pago,
      f.rectificada ?? "",
    ]
      .map(String)
      .map(celda)
      .join(";"),
  );
  return "﻿" + [cabecera.join(";"), ...lineas].join("\r\n") + "\r\n";
}

// Periodo de un listado: un mes ("2026-10") o un trimestre ("2026-T4", el del modelo 303 del IVA).
// Devuelve las fechas desde (incluida) y hasta (excluida), o null si el texto no es un periodo.
export function rangoPeriodo(periodo: string): { desde: string; hasta: string; nombre: string } | null {
  const mes = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodo);
  const trimestre = /^(\d{4})-T([1-4])$/.exec(periodo);
  if (!mes && !trimestre) return null;
  const anio = Number((mes ?? trimestre)![1]);
  const primero = mes ? Number(mes[2]) : (Number(trimestre![2]) - 1) * 3 + 1;
  const meses = mes ? 1 : 3;
  const fecha = (a: number, m: number) => `${a + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, "0")}-01`;
  const nombre = mes
    ? new Date(`${periodo}-15T12:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" })
    : `${trimestre![2]}.º trimestre de ${anio}`;
  return { desde: fecha(anio, primero), hasta: fecha(anio, primero + meses), nombre };
}
