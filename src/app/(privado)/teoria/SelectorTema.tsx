import { COMUN, etiquetaTema } from "@/lib/preguntas";

export interface TemaAlumno {
  tema_id: string | null;
  numero: number | null;
  tema: string | null;
  comun?: boolean; // sin la migración 0014 no llega
  en_banco: number;
  vistas: number;
  dominadas: number;
  pendientes: number;
}

// Los temas de la oposición del alumno y, aparte, los del banco común (psicotécnicos, ortografía…)
export function SelectorTema({ temas, defaultValue = "", contar = false }: { temas: TemaAlumno[]; defaultValue?: string; contar?: boolean }) {
  const propios = temas.filter((t) => t.tema_id && !t.comun);
  const comunes = temas.filter((t) => t.comun);
  const opcion = (t: TemaAlumno) => (
    <option key={t.tema_id} value={t.tema_id!}>
      {etiquetaTema(t.numero, t.tema!)}{contar && ` (${t.en_banco})`}
    </option>
  );
  return (
    <select name="tema" defaultValue={defaultValue}>
      <option value="">Todo mi temario</option>
      {propios.length > 0 && <optgroup label="Mi oposición">{propios.map(opcion)}</optgroup>}
      {comunes.length > 0 && (
        <optgroup label="Psicotécnicos, ortografía…">
          <option value={COMUN}>Todo lo común</option>
          {comunes.filter((t) => t.tema_id).map(opcion)}
        </optgroup>
      )}
    </select>
  );
}
