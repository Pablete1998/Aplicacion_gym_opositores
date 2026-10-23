// Lógica pura de baremos: formato de marcas y estado frente al mínimo y al objetivo.

export type Unidad = "segundos" | "repeticiones" | "centimetros" | "metros" | "nota";
export type Estado = "objetivo" | "apto" | "no_apto";

export interface Baremo {
  unidad: Unidad;
  mayorEsMejor: boolean;
  minima: number;
  objetivo: number | null;
  // Marca necesaria para cada punto, de 1 a 10, en oposiciones que puntúan (Policía Nacional)
  puntos?: number[] | null;
}

export function formatoMarca(unidad: Unidad, valor: number): string {
  switch (unidad) {
    case "segundos": {
      if (valor < 60) return `${valor.toFixed(1).replace(".", ",")} s`;
      const min = Math.floor(valor / 60);
      const seg = Math.round(valor - min * 60);
      return `${min}:${String(seg).padStart(2, "0")}`;
    }
    case "repeticiones":
      return `${valor} rep`;
    case "centimetros":
      return `${valor} cm`;
    case "metros":
      return `${valor} m`;
    case "nota":
      return valor.toFixed(1).replace(".", ",");
  }
}

// Acepta "11,4", "11.4", "8" o "3:45" (minutos:segundos)
export function leerMarca(texto: string): number | null {
  const t = texto.trim().replace(",", ".");
  if (!t) return null;
  if (t.includes(":")) {
    const partes = t.split(":").map(Number);
    if (partes.length !== 2 || partes.some((n) => !Number.isFinite(n) || n < 0) || partes[1] >= 60) return null;
    return partes[0] * 60 + partes[1];
  }
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const mejorOIgual = (b: Baremo, valor: number, referencia: number) =>
  b.mayorEsMejor ? valor >= referencia : valor <= referencia;

export function estadoMarca(b: Baremo, valor: number): Estado {
  if (b.objetivo !== null && mejorOIgual(b, valor, b.objetivo)) return "objetivo";
  return mejorOIgual(b, valor, b.minima) ? "apto" : "no_apto";
}

// Puntos (0 a 10) que da la marca según la tabla del baremo; null si la oposición no puntúa
export function puntosMarca(b: Baremo, valor: number): number | null {
  if (!b.puntos?.length) return null;
  let p = 0;
  b.puntos.forEach((referencia, i) => {
    if (mejorOIgual(b, valor, referencia)) p = i + 1;
  });
  return p;
}

// Siguiente escalón de una marca: el siguiente punto (oposiciones que puntúan), el apto o el objetivo.
// "falta" es la distancia en la unidad de la prueba; null si ya no hay nada por encima.
export function siguienteMeta(b: Baremo, valor: number): { meta: string; falta: number } | null {
  const distancia = (referencia: number) => Math.round(Math.abs(referencia - valor) * 10) / 10;
  if (b.puntos?.length) {
    const p = puntosMarca(b, valor) ?? 0;
    if (p >= b.puntos.length) return null;
    return { meta: p === 0 ? "el primer punto" : `los ${p + 1} puntos`, falta: distancia(b.puntos[p]) };
  }
  const estado = estadoMarca(b, valor);
  if (estado === "no_apto") return { meta: "el apto", falta: distancia(b.minima) };
  if (estado === "apto" && b.objetivo !== null) return { meta: "el objetivo", falta: distancia(b.objetivo) };
  return null;
}

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  objetivo: "Objetivo",
  apto: "Apto",
  no_apto: "No apto",
};

// 0 = muy por debajo, 0.5 = en el mínimo, 1 = en el objetivo o mejor
export function progreso(b: Baremo, valor: number): number {
  const objetivo = b.objetivo ?? b.minima;
  const rango = Math.abs(objetivo - b.minima) || Math.abs(b.minima) || 1;
  const s = (b.mayorEsMejor ? valor - b.minima : b.minima - valor) / rango;
  return Math.max(0, Math.min(1, 0.5 + s * 0.5));
}

export interface BaremoFila {
  sexo: "H" | "M" | null;
  edad_min: number;
  edad_max: number;
  marca_minima: number;
  marca_objetivo: number | null;
  puntos?: number[] | null;
}

// Elige el baremo más específico para el alumno: primero el de su sexo, luego el común
export function baremoAplicable(filas: BaremoFila[], sexo: "H" | "M", edad: number | null): BaremoFila | null {
  const porEdad = filas.filter((f) => edad === null || (edad >= f.edad_min && edad <= f.edad_max));
  return porEdad.find((f) => f.sexo === sexo) ?? porEdad.find((f) => f.sexo === null) ?? null;
}

export function edadEn(fechaNacimiento: string | null, hoy = new Date()): number | null {
  if (!fechaNacimiento) return null;
  const n = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
}
