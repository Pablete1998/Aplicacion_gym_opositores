// Clasificación de un simulacro: ordena por la mejor marca y empata a quien tenga la misma.

export function clasificar<T extends { marca: number }>(filas: T[], mayorEsMejor: boolean): (T & { puesto: number })[] {
  const ordenadas = [...filas].sort((a, b) => (mayorEsMejor ? b.marca - a.marca : a.marca - b.marca));
  let puesto = 0;
  return ordenadas.map((f, i) => {
    if (i === 0 || ordenadas[i - 1].marca !== f.marca) puesto = i + 1;
    return { ...f, puesto };
  });
}

// Si alguien hace varios intentos el mismo día, cuenta el mejor
export function mejorMarca(marcas: number[], mayorEsMejor: boolean): number | null {
  if (!marcas.length) return null;
  return mayorEsMejor ? Math.max(...marcas) : Math.min(...marcas);
}
