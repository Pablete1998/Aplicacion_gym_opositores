// Repetición espaciada al estilo de Anki (algoritmo SM-2 simplificado).
// Una tarjeta nueva pasa por dos pasos cortos de aprendizaje (1 y 10 minutos) y luego se repasa
// a intervalos de días que crecen con su «facilidad». Si se olvida, vuelve a aprendizaje.

export type Nota = 1 | 2 | 3 | 4; // Otra vez · Difícil · Bien · Fácil

export const NOTAS: { nota: Nota; texto: string }[] = [
  { nota: 1, texto: "Otra vez" },
  { nota: 2, texto: "Difícil" },
  { nota: 3, texto: "Bien" },
  { nota: 4, texto: "Fácil" },
];

export interface EstadoTarjeta {
  estado: "aprendiendo" | "repaso";
  paso: number;
  facilidad: number;
  intervalo: number; // días
  repeticiones: number;
  lapsos: number;
}

export const TARJETA_NUEVA: EstadoTarjeta = { estado: "aprendiendo", paso: 0, facilidad: 2.5, intervalo: 0, repeticiones: 0, lapsos: 0 };

const MINUTO = 60_000;
const DIA = 86_400_000;
const MAX_DIAS = 365;
const redondea = (n: number) => Math.round(n * 100) / 100;

export function programar(t: EstadoTarjeta, nota: Nota, ahora = new Date()): EstadoTarjeta & { toca_en: Date } {
  const sig = { ...t, repeticiones: t.repeticiones + 1 };
  const en = (ms: number) => ({ ...sig, toca_en: new Date(ahora.getTime() + ms) });
  const enDias = (dias: number) => {
    const d = Math.min(MAX_DIAS, Math.max(1, Math.round(dias)));
    return { ...sig, estado: "repaso" as const, paso: 0, intervalo: d, toca_en: new Date(ahora.getTime() + d * DIA) };
  };

  if (t.estado === "aprendiendo") {
    if (nota === 1) return { ...en(MINUTO), paso: 0 };
    if (nota === 2) return en(6 * MINUTO);
    if (nota === 3) return t.paso === 0 ? { ...en(10 * MINUTO), paso: 1 } : enDias(Math.max(1, t.intervalo));
    return enDias(Math.max(4, t.intervalo));
  }

  // En repaso
  if (nota === 1) {
    // Olvidada: vuelve a aprender y, al recuperarla, el intervalo será la mitad
    return { ...sig, estado: "aprendiendo", paso: 1, lapsos: t.lapsos + 1, facilidad: redondea(Math.max(1.3, t.facilidad - 0.2)), intervalo: Math.max(1, Math.round(t.intervalo / 2)), toca_en: new Date(ahora.getTime() + 10 * MINUTO) };
  }
  if (nota === 2) return { ...enDias(Math.max(t.intervalo * 1.2, t.intervalo + 1)), facilidad: redondea(Math.max(1.3, t.facilidad - 0.15)) };
  if (nota === 3) return enDias(Math.max(t.intervalo * t.facilidad, t.intervalo + 1));
  return { ...enDias(Math.max(t.intervalo * t.facilidad * 1.3, t.intervalo + 2)), facilidad: redondea(Math.min(5, t.facilidad + 0.15)) };
}

// Texto corto para el botón: «1 min», «10 min», «3 d», «2 meses»
export function cuandoVuelve(desde: Date, toca: Date): string {
  const ms = toca.getTime() - desde.getTime();
  if (ms < 60 * MINUTO) return `${Math.max(1, Math.round(ms / MINUTO))} min`;
  if (ms < DIA) return `${Math.round(ms / (60 * MINUTO))} h`;
  const dias = Math.round(ms / DIA);
  if (dias < 31) return `${dias} d`;
  const meses = Math.round(dias / 30);
  return meses < 12 ? `${meses} ${meses === 1 ? "mes" : "meses"}` : "1 año";
}
