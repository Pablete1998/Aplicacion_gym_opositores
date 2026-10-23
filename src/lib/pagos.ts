export const FORMAS_PAGO = { efectivo: "Efectivo", banco: "Banco", regalado: "Regalado" } as const;
export type FormaPago = keyof typeof FORMAS_PAGO;

export function esFormaPago(valor: string): valor is FormaPago {
  return Object.hasOwn(FORMAS_PAGO, valor);
}
