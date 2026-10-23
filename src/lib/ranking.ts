// Rankings de la academia: junta las mejores marcas por ejercicio y las clasifica por sexo.
// Con todas las oposiciones, las pruebas físicas con el mismo nombre y unidad (p. ej. «Dominadas» de
// Bombero y de Policía) cuentan como un solo ejercicio. Los test teóricos no se mezclan nunca.
import type { Unidad } from "./baremo.ts";
import { clasificar } from "./simulacro.ts";

export interface PruebaRanking {
  id: string;
  nombre: string;
  tipo: "fisica" | "teorica";
  unidad: Unidad;
  mayor_es_mejor: boolean;
  orden: number;
  oposicion: string;
}

export interface MarcaRanking {
  prueba_id: string;
  alumno_id: string;
  nombre: string;
  oposicion: string;
  grupo: string | null;
  sexo: "H" | "M";
  marca: number;
  fecha: string;
  soy_yo: boolean;
}

export interface Ejercicio {
  clave: string;
  nombre: string;
  unidad: Unidad;
  mayorEsMejor: boolean;
  tipo: "fisica" | "teorica";
  oposiciones: string[];
  mujeres: (MarcaRanking & { puesto: number })[];
  hombres: (MarcaRanking & { puesto: number })[];
}

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function claveEjercicio(p: PruebaRanking, juntar: boolean): string {
  return juntar && p.tipo === "fisica" ? `${normal(p.nombre)}|${p.unidad}|${p.mayor_es_mejor}` : p.id;
}

export function agruparRanking(pruebas: PruebaRanking[], marcas: MarcaRanking[], oposicion: string | null): Ejercicio[] {
  const juntar = oposicion === null;
  const elegidas = pruebas
    .filter((p) => juntar || p.oposicion === oposicion)
    .sort((a, b) => Number(a.tipo === "teorica") - Number(b.tipo === "teorica") || a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  const ejercicios = new Map<string, Ejercicio & { pruebas: Set<string> }>();
  for (const p of elegidas) {
    const clave = claveEjercicio(p, juntar);
    const e = ejercicios.get(clave);
    if (e) {
      e.pruebas.add(p.id);
      if (!e.oposiciones.includes(p.oposicion)) e.oposiciones.push(p.oposicion);
    } else {
      // Con todas las oposiciones, el test teórico lleva el nombre de la suya
      const nombre = juntar && p.tipo === "teorica" ? `${p.nombre} · ${p.oposicion}` : p.nombre;
      ejercicios.set(clave, { clave, nombre, unidad: p.unidad, mayorEsMejor: p.mayor_es_mejor, tipo: p.tipo, oposiciones: [p.oposicion], mujeres: [], hombres: [], pruebas: new Set([p.id]) });
    }
  }
  return [...ejercicios.values()]
    .map(({ pruebas: ids, ...e }) => {
      const delEjercicio = marcas.filter((m) => ids.has(m.prueba_id));
      return {
        ...e,
        oposiciones: e.oposiciones.sort((a, b) => a.localeCompare(b, "es")),
        mujeres: clasificar(delEjercicio.filter((m) => m.sexo === "M"), e.mayorEsMejor),
        hombres: clasificar(delEjercicio.filter((m) => m.sexo === "H"), e.mayorEsMejor),
      };
    })
    .filter((e) => e.mujeres.length || e.hombres.length);
}
