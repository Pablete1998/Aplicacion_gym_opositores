import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { marked } from "marked";
import { leerImportacion, type FilaImportada } from "./preguntas";
import { cabeceraTema, leerCabecera, type CabeceraTema } from "./temario";

const RAIZ = path.join(process.cwd(), "contenido", "temario");

export interface TemaArchivo extends CabeceraTema {
  carpeta: string;
  preguntas: number;
}

const archivo = (carpeta: string, tema: number, ext: string) => path.join(RAIZ, carpeta, `${String(tema).padStart(2, "0")}${ext}`);
const leer = (ruta: string) => readFile(ruta, "utf8").catch(() => null);

async function preguntasDe(carpeta: string, tema: number): Promise<FilaImportada[]> {
  const tsv = await leer(archivo(carpeta, tema, ".preguntas.tsv"));
  return tsv ? leerImportacion(tsv).filas : [];
}

// Todos los temas escritos, de todas las oposiciones, ordenados por carpeta y número
export const listarTemario = cache(async (): Promise<TemaArchivo[]> => {
  const carpetas = await readdir(RAIZ, { withFileTypes: true }).catch(() => []);
  const temas: TemaArchivo[] = [];
  for (const c of carpetas.filter((d) => d.isDirectory())) {
    for (const nombre of (await readdir(path.join(RAIZ, c.name))).filter((n) => /^\d{2}\.md$/.test(n))) {
      const texto = await leer(path.join(RAIZ, c.name, nombre));
      const cabecera = texto ? cabeceraTema(leerCabecera(texto).datos) : null;
      if (cabecera) temas.push({ ...cabecera, carpeta: c.name, preguntas: (await preguntasDe(c.name, cabecera.tema)).length });
    }
  }
  return temas.sort((a, b) => a.carpeta.localeCompare(b.carpeta) || a.tema - b.tema);
});

export async function leerTema(carpeta: string, tema: number): Promise<{ tema: TemaArchivo; html: string; preguntas: FilaImportada[] } | null> {
  if (!/^[a-z0-9-]+$/.test(carpeta) || !Number.isInteger(tema) || tema < 0 || tema > 99) return null;
  const texto = await leer(archivo(carpeta, tema, ".md"));
  if (!texto) return null;
  const { datos, cuerpo } = leerCabecera(texto);
  const cabecera = cabeceraTema(datos);
  if (!cabecera) return null;
  const preguntas = await preguntasDe(carpeta, tema);
  // El contenido sale del propio repositorio, revisado en cada PR: se puede pintar como HTML
  const html = await marked.parse(cuerpo, { gfm: true });
  return { tema: { ...cabecera, carpeta, preguntas: preguntas.length }, html, preguntas };
}
