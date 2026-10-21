import { randomInt } from "node:crypto";

// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I)
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function passwordProvisional(longitud = 10): string {
  return Array.from({ length: longitud }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}
