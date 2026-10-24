export type TipoTest = "practica" | "simulacro" | "fallos";

export const TIPOS: Record<TipoTest, string> = {
  practica: "Práctica",
  simulacro: "Simulacro",
  fallos: "Repaso de fallos",
};

// 3725 s → «1:02:05»; 305 s → «5:05»
export function reloj(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const dos = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${dos(m)}:${dos(s % 60)}` : `${m}:${dos(s % 60)}`;
}

// 7.5 → «7,50»
export const formatoNota = (nota: number | string | null) =>
  nota === null ? "—" : Number(nota).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Lo que resta cada fallo según las respuestas posibles (la fórmula de los exámenes oficiales)
export const restaPorFallo = (opciones: number) => 1 / Math.max(opciones - 1, 1);
