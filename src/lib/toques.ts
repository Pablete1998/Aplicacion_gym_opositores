// Mensajes que un alumno puede mandar a un compañero. La base de datos solo acepta estas claves.
export const MENSAJES_TOQUE = {
  espabila: "¡Espabila, chaval! 💪",
  vamos: "¡Vamos, que tú puedes! 🔥",
  te_echamos_de_menos: "Te echamos de menos en el entreno 👀",
  a_por_todas: "Hoy toca darlo todo 🏋️",
  crack: "¡Vaya marca, crack! 👏",
} as const;

export type ClaveToque = keyof typeof MENSAJES_TOQUE;

export function esClaveToque(clave: string): clave is ClaveToque {
  return Object.hasOwn(MENSAJES_TOQUE, clave);
}
