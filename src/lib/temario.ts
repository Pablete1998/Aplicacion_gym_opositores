// Temario: un archivo Markdown por tema en contenido/temario/<carpeta>/<NN>.md, con una cabecera
// entre «---» (oposición, número, título, convocatoria, fuentes del BOE y fecha de actualización),
// y opcionalmente <NN>.preguntas.tsv con las preguntas en el mismo formato que el pegado desde Excel.

export interface CabeceraTema {
  oposicion: string; // nombre exacto de la oposición en la app, o «comun»
  tema: number;
  titulo: string;
  convocatoria: string | null; // BOE de la convocatoria cuyo temario sigue
  fuentes: string[]; // normas consolidadas del BOE usadas, con su fecha de última modificación
  actualizado: string; // AAAA-MM-DD: si cambia, hay que volver a revisarlo
}

// Cabecera sencilla: «clave: valor» y listas con «- elemento» debajo de «clave:»
export function leerCabecera(texto: string): { datos: Record<string, string | string[]>; cuerpo: string } {
  const m = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { datos: {}, cuerpo: texto };
  const datos: Record<string, string | string[]> = {};
  let lista: string | null = null;
  for (const linea of m[1].split("\n")) {
    const elemento = linea.match(/^\s+-\s+(.*)$/);
    if (elemento && lista) {
      (datos[lista] as string[]).push(elemento[1].trim());
      continue;
    }
    const par = linea.match(/^([a-zñ_]+):\s*(.*)$/i);
    if (!par) continue;
    const [, clave, valor] = par;
    if (valor.trim() === "") {
      datos[clave] = [];
      lista = clave;
    } else {
      datos[clave] = valor.trim().replace(/^"(.*)"$/, "$1");
      lista = null;
    }
  }
  return { datos, cuerpo: m[2] };
}

export function cabeceraTema(datos: Record<string, string | string[]>): CabeceraTema | null {
  const txt = (k: string) => (typeof datos[k] === "string" ? (datos[k] as string) : "");
  const tema = Number(txt("tema"));
  if (!txt("oposicion") || !Number.isInteger(tema) || !txt("titulo") || !/^\d{4}-\d{2}-\d{2}$/.test(txt("actualizado"))) return null;
  return {
    oposicion: txt("oposicion"),
    tema,
    titulo: txt("titulo"),
    convocatoria: txt("convocatoria") || null,
    fuentes: Array.isArray(datos.fuentes) ? datos.fuentes : txt("fuentes") ? [txt("fuentes")] : [],
    actualizado: txt("actualizado"),
  };
}

// «BOE-A-1978-31229» → enlace al texto consolidado
export const enlaceBoe = (id: string) => `https://www.boe.es/buscar/act.php?id=${id}`;
export const idsBoe = (texto: string) => texto.match(/BOE-[A-Z]-\d{4}-\d+/g) ?? [];
