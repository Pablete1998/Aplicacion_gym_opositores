// Qué apunta el alumno en cada ejercicio del plan; sin unidad, solo marca que lo ha hecho
export const UNIDADES_EJERCICIO = { seg: "segundos", reps: "repeticiones", kg: "kg", m: "metros", cm: "centímetros", min: "minutos" } as const;
export type UnidadEjercicio = keyof typeof UNIDADES_EJERCICIO;

export function esUnidadEjercicio(valor: string): valor is UnidadEjercicio {
  return Object.hasOwn(UNIDADES_EJERCICIO, valor);
}

// Cómo se ha sentido el alumno al terminar la sesión
export const SENSACIONES: Record<number, string> = { 1: "😫 Muy dura", 2: "😓 Dura", 3: "😐 Normal", 4: "🙂 Bien", 5: "💪 Genial" };

// Fecha de hoy en España ("2026-10-23"), aunque el servidor vaya en UTC
export function hoyEnEspana(ahora = new Date()): string {
  return ahora.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

export interface PruebaOficial { id: string; nombre: string; unidad: string }

export interface EjercicioHecho { nombre: string; unidad: string | null; valor: number | null; fecha: string }

// Evolución de cada ejercicio con unidad a lo largo de las sesiones: mismo nombre y unidad = mismo ejercicio
export function evolucionEjercicios(hechos: EjercicioHecho[]): { nombre: string; unidad: string; serie: { fecha: string; valor: number }[] }[] {
  const grupos = new Map<string, { nombre: string; unidad: string; serie: { fecha: string; valor: number }[] }>();
  for (const h of [...hechos].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (!h.unidad || h.valor === null) continue;
    const clave = `${h.nombre.trim().toLowerCase()}|${h.unidad}`;
    const g = grupos.get(clave) ?? { nombre: h.nombre.trim(), unidad: h.unidad, serie: [] };
    g.serie.push({ fecha: h.fecha, valor: h.valor });
    grupos.set(clave, g);
  }
  return [...grupos.values()].filter((g) => g.serie.length > 0);
}

const ABREVIATURA: Record<UnidadEjercicio, string> = { seg: "s", reps: "rep", kg: "kg", m: "m", cm: "cm", min: "min" };

// Si el ejercicio es una prueba oficial, el alumno apunta en la unidad de la prueba
export const UNIDAD_DE_PRUEBA: Record<string, UnidadEjercicio> = { segundos: "seg", repeticiones: "reps", metros: "m", centimetros: "cm" };

export function formatoEjercicio(unidad: string | null, valor: number | null): string {
  if (valor === null || !unidad || !esUnidadEjercicio(unidad)) return "Hecho";
  if (unidad === "seg" && valor >= 60) {
    const min = Math.floor(valor / 60);
    return `${min}:${String(Math.round(valor - min * 60)).padStart(2, "0")}`;
  }
  return `${String(valor).replace(".", ",")} ${ABREVIATURA[unidad]}`;
}
