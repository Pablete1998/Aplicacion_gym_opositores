import { test } from "node:test";
import assert from "node:assert/strict";
import { baremoAplicable, edadEn, estadoMarca, formatoMarca, leerMarca, progreso, type Baremo } from "./baremo.ts";

const circuito: Baremo = { unidad: "segundos", mayorEsMejor: false, minima: 12, objetivo: 10.6 };
const dominadas: Baremo = { unidad: "repeticiones", mayorEsMejor: true, minima: 5, objetivo: 13 };

test("formato de marcas", () => {
  assert.equal(formatoMarca("segundos", 11.4), "11,4 s");
  assert.equal(formatoMarca("segundos", 225), "3:45");
  assert.equal(formatoMarca("repeticiones", 8), "8 rep");
  assert.equal(formatoMarca("nota", 7.25), "7,3");
});

test("lectura de marcas escritas a mano", () => {
  assert.equal(leerMarca("11,4"), 11.4);
  assert.equal(leerMarca("3:45"), 225);
  assert.equal(leerMarca(" 8 "), 8);
  assert.equal(leerMarca("3:75"), null);
  assert.equal(leerMarca("abc"), null);
  assert.equal(leerMarca(""), null);
});

test("estado en pruebas donde menos es mejor", () => {
  assert.equal(estadoMarca(circuito, 12.5), "no_apto");
  assert.equal(estadoMarca(circuito, 12), "apto");
  assert.equal(estadoMarca(circuito, 10.6), "objetivo");
});

test("estado en pruebas donde más es mejor", () => {
  assert.equal(estadoMarca(dominadas, 4), "no_apto");
  assert.equal(estadoMarca(dominadas, 9), "apto");
  assert.equal(estadoMarca(dominadas, 14), "objetivo");
  assert.equal(estadoMarca({ ...dominadas, objetivo: null }, 40), "apto");
});

test("progreso va de 0 a 1 con el mínimo en 0,5", () => {
  assert.equal(progreso(dominadas, 5), 0.5);
  assert.equal(progreso(dominadas, 13), 1);
  assert.equal(progreso(dominadas, 0), 0.1875);
  assert.equal(progreso(circuito, 20), 0);
});

test("baremo aplicable por sexo y edad", () => {
  const filas = [
    { sexo: null, edad_min: 0, edad_max: 120, marca_minima: 5, marca_objetivo: 13 },
    { sexo: "M" as const, edad_min: 18, edad_max: 30, marca_minima: 3, marca_objetivo: 8 },
  ];
  assert.equal(baremoAplicable(filas, "M", 25)?.marca_minima, 3);
  assert.equal(baremoAplicable(filas, "M", 35)?.marca_minima, 5);
  assert.equal(baremoAplicable(filas, "H", 25)?.marca_minima, 5);
  assert.equal(baremoAplicable([], "H", 25), null);
});

test("edad cumplida", () => {
  assert.equal(edadEn("2000-10-22", new Date("2026-10-21")), 25);
  assert.equal(edadEn("2000-10-21", new Date("2026-10-21")), 26);
  assert.equal(edadEn(null), null);
});
