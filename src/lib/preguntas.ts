import { normal } from "./texto.ts";

export const LETRAS = ["A", "B", "C", "D"] as const;

// Columnas de la plantilla de Excel, en este orden
export const COLUMNAS = ["Tema", "Pregunta", "A", "B", "C", "D", "Correcta", "Explicación"] as const;

export interface FilaImportada {
  linea: number;
  tema: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string | null;
}

export interface ErrorImportacion {
  linea: number;
  motivo: string;
}

// «B», «b», «2» o «B) …» → 1. Null si no señala una de las respuestas que hay.
export function leerCorrecta(valor: string, opciones: number): number | null {
  const v = valor.trim().toUpperCase();
  const letra = LETRAS.indexOf(v.charAt(0) as (typeof LETRAS)[number]);
  const i = /^\d+$/.test(v) ? Number(v) - 1 : v.length === 1 || /^[A-D][).:\s-]/.test(v) ? letra : -1;
  return i >= 0 && i < opciones ? i : null;
}

// «Tema 3. La Constitución», «3 - La Constitución» o «T3 Constitución» → 3
export function numeroTema(nombre: string): number | null {
  const m = nombre.trim().match(/^(?:tema\s*|t\.?\s*)?(\d{1,3})(?!\d)/i);
  return m ? Number(m[1]) : null;
}

// Lo que se copia de Excel llega separado por tabuladores; un CSV de Excel en español, por punto y coma.
// Las celdas con saltos de línea o separadores vienen entre comillas, con las comillas dobladas.
export function partirTabla(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const primera = limpio.split("\n", 1)[0];
  const sep = primera.includes("\t") ? "\t" : primera.includes(";") ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"' && celda === "") comillas = true;
    else if (c === sep) { fila.push(celda); celda = ""; }
    else if (c === "\n") { fila.push(celda); filas.push(fila); fila = []; celda = ""; }
    else celda += c;
  }
  fila.push(celda);
  filas.push(fila);
  return filas.map((f) => f.map((c) => c.trim()));
}

export function leerImportacion(texto: string): { filas: FilaImportada[]; errores: ErrorImportacion[] } {
  const tabla = partirTabla(texto);
  const filas: FilaImportada[] = [];
  const errores: ErrorImportacion[] = [];
  tabla.forEach((celdas, i) => {
    const linea = i + 1;
    if (celdas.every((c) => c === "")) return;
    // La fila de títulos de la plantilla se salta
    if (i === 0 && normal(celdas[1] ?? "").startsWith("pregunta")) return;
    const [tema = "", enunciado = "", a = "", b = "", c = "", d = "", correcta = "", explicacion = ""] = celdas;
    const opciones = [a, b, c, d];
    // Las respuestas van seguidas: con 3 respuestas, la D queda vacía
    const ultima = opciones.findLastIndex((o) => o !== "");
    const usadas = opciones.slice(0, ultima + 1);
    if (!enunciado) return errores.push({ linea, motivo: "Falta la pregunta." });
    if (enunciado.length > 2000) return errores.push({ linea, motivo: "La pregunta es demasiado larga." });
    if (usadas.length < 2) return errores.push({ linea, motivo: "Necesita al menos las respuestas A y B." });
    if (usadas.some((o) => o === "")) return errores.push({ linea, motivo: "Hay una respuesta vacía entre otras dos." });
    const i_correcta = leerCorrecta(correcta, usadas.length);
    if (i_correcta === null) return errores.push({ linea, motivo: `La correcta debe ser ${LETRAS.slice(0, usadas.length).join(", ")}.` });
    filas.push({
      linea,
      tema: tema.slice(0, 200),
      enunciado,
      opciones: usadas,
      correcta: i_correcta,
      explicacion: explicacion.slice(0, 2000) || null,
    });
  });
  return { filas, errores };
}

// «3. La Constitución», salvo que el nombre ya lleve el número («Tema 3…», «3 - …»)
export const etiquetaTema = (numero: number | null, nombre: string) =>
  numero !== null && numeroTema(nombre) === null ? `${numero}. ${nombre}` : nombre;

// El banco común (psicotécnicos, ortografía…) no tiene oposición: en enlaces y formularios va como «comun»
export const COMUN = "comun";
export const NOMBRE_COMUN = "Común a todas (psicotécnicos, ortografía…)";
export const idOposicion = (valor: string) => (valor === COMUN ? null : valor);

// Imágenes de las preguntas: nombre en el almacén y dirección desde la que la app las sirve
export const esNombreImagen = (nombre: string) => /^[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(nombre);
export const urlImagen = (nombre: string) => `/teoria/imagen/${nombre}`;
