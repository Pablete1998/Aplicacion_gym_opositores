// Lógica pura de los informes: tendencia de una prueba y fechas por meses.

export type Tendencia = "mejora" | "estable" | "empeora";

export const ETIQUETA_TENDENCIA: Record<Tendencia, string> = {
  mejora: "Mejora",
  estable: "Estancado",
  empeora: "Empeora",
};

type Marca = { fecha: string; marca: number };

function restarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + "T12:00Z");
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

// Compara la última marca con la de hace unas semanas (o con la primera si no hay tanto historial).
// Cambios de menos del 1 % cuentan como estancado.
export function tendencia(serie: Marca[], mayorEsMejor: boolean, semanas = 4): Tendencia | null {
  if (serie.length < 2) return null;
  const ultima = serie[serie.length - 1];
  const anteriores = serie.slice(0, -1);
  const limite = restarDias(ultima.fecha, semanas * 7);
  const referencia = [...anteriores].reverse().find((s) => s.fecha <= limite) ?? anteriores[0];
  const cambio = mayorEsMejor ? ultima.marca - referencia.marca : referencia.marca - ultima.marca;
  const umbral = Math.abs(referencia.marca) * 0.01;
  if (cambio > umbral) return "mejora";
  if (cambio < -umbral) return "empeora";
  return "estable";
}

export function diasDesde(fecha: string, hoy = new Date()): number {
  return Math.floor((hoy.getTime() - new Date(fecha + "T12:00Z").getTime()) / 864e5);
}

// Meses en formato "2026-10"
export function mesDe(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

export function enMes(fecha: string, mes: string): boolean {
  return fecha.startsWith(mes + "-");
}

export function nombreMes(mes: string): string {
  return new Date(mes + "-15T12:00Z").toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function mejorDe(serie: Marca[], mayorEsMejor: boolean): number | null {
  if (!serie.length) return null;
  const valores = serie.map((s) => s.marca);
  return mayorEsMejor ? Math.max(...valores) : Math.min(...valores);
}
