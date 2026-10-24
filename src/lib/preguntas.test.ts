import { test } from "node:test";
import assert from "node:assert/strict";
import { etiquetaTema, leerCorrecta, leerImportacion, numeroTema, partirTabla } from "./preguntas.ts";

test("respuesta correcta en letra, número o con texto", () => {
  assert.equal(leerCorrecta("b", 4), 1);
  assert.equal(leerCorrecta("3", 4), 2);
  assert.equal(leerCorrecta("C) El Rey", 4), 2);
  assert.equal(leerCorrecta("D", 3), null);
  assert.equal(leerCorrecta("Bien", 4), null);
  assert.equal(leerCorrecta("", 4), null);
});

test("número del tema", () => {
  assert.equal(numeroTema("Tema 3. La Constitución"), 3);
  assert.equal(numeroTema("12 - Derecho penal"), 12);
  assert.equal(numeroTema("T5 Igualdad"), 5);
  assert.equal(numeroTema("Constitución"), null);
});

test("pegado desde Excel con tabuladores y celdas con salto de línea", () => {
  const t = 'Tema\tPregunta\tA\n1\t"Dos\nlíneas"\tsí\n';
  assert.deepEqual(partirTabla(t), [["Tema", "Pregunta", "A"], ["1", "Dos\nlíneas", "sí"], [""]]);
});

test("CSV de Excel en español con punto y coma y comillas", () => {
  assert.deepEqual(partirTabla('a;"b; c";"d ""e"""'), [["a", "b; c", 'd "e"']]);
});

test("importación: salta títulos, admite 3 respuestas y explica los errores", () => {
  const texto = [
    "Tema\tPregunta\tA\tB\tC\tD\tCorrecta\tExplicación",
    "Tema 1. Constitución\t¿En qué año se aprobó?\t1976\t1978\t1981\t\tB\tArt. final",
    "Tema 1. Constitución\t\t1\t2\t\t\tA",
    "Tema 2\t¿Cuántos artículos?\t169\t\t\t\tA",
    "Tema 2\t¿Capital?\tMadrid\tSevilla\tToledo\t\tD",
    "Tema 2\t¿Hueco?\tUno\t\tTres\t\tA",
  ].join("\n");
  const { filas, errores } = leerImportacion(texto);
  assert.equal(filas.length, 1);
  assert.deepEqual(filas[0], {
    linea: 2,
    tema: "Tema 1. Constitución",
    enunciado: "¿En qué año se aprobó?",
    opciones: ["1976", "1978", "1981"],
    correcta: 1,
    explicacion: "Art. final",
  });
  assert.deepEqual(errores.map((e) => e.linea), [3, 4, 5, 6]);
});

test("etiqueta del tema sin repetir el número", () => {
  assert.equal(etiquetaTema(3, "La Constitución"), "3. La Constitución");
  assert.equal(etiquetaTema(3, "Tema 3. La Constitución"), "Tema 3. La Constitución");
  assert.equal(etiquetaTema(null, "Psicotécnicos"), "Psicotécnicos");
});
