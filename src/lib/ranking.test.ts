import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparRanking, type MarcaRanking, type PruebaRanking } from "./ranking.ts";

const pruebas: PruebaRanking[] = [
  { id: "d-bom", nombre: "Dominadas", tipo: "fisica", unidad: "repeticiones", mayor_es_mejor: true, orden: 2, oposicion: "Bombero" },
  { id: "d-pol", nombre: "Dominadas", tipo: "fisica", unidad: "repeticiones", mayor_es_mejor: true, orden: 3, oposicion: "Policía Nacional" },
  { id: "c-pol", nombre: "Carrera 1000 m", tipo: "fisica", unidad: "segundos", mayor_es_mejor: false, orden: 4, oposicion: "Policía Nacional" },
  { id: "t-bom", nombre: "Test de conocimientos", tipo: "teorica", unidad: "nota", mayor_es_mejor: true, orden: 1, oposicion: "Bombero" },
  { id: "t-pol", nombre: "Test de conocimientos", tipo: "teorica", unidad: "nota", mayor_es_mejor: true, orden: 5, oposicion: "Policía Nacional" },
];
const m = (prueba_id: string, alumno_id: string, sexo: "H" | "M", marca: number): MarcaRanking => ({
  prueba_id, alumno_id, nombre: alumno_id, oposicion: "", grupo: null, sexo, marca, fecha: "2026-10-01", soy_yo: false,
});
const marcas = [m("d-bom", "ana", "M", 8), m("d-pol", "luis", "H", 12), m("d-bom", "pepe", "H", 15), m("c-pol", "luis", "H", 200), m("c-pol", "eva", "M", 230), m("c-pol", "rosa", "M", 230), m("t-bom", "pepe", "H", 7)];

test("con todas las oposiciones junta las físicas iguales y separa los test", () => {
  const ej = agruparRanking(pruebas, marcas, null);
  assert.deepEqual(ej.map((e) => e.nombre), ["Dominadas", "Carrera 1000 m", "Test de conocimientos · Bombero"]);
  const dominadas = ej[0];
  assert.deepEqual(dominadas.oposiciones, ["Bombero", "Policía Nacional"]);
  assert.deepEqual(dominadas.hombres.map((h) => [h.alumno_id, h.puesto]), [["pepe", 1], ["luis", 2]]);
  assert.deepEqual(dominadas.mujeres.map((h) => h.alumno_id), ["ana"]);
});

test("por oposición, solo sus pruebas; en tiempo gana el menor y los empates comparten puesto", () => {
  const ej = agruparRanking(pruebas, marcas, "Policía Nacional");
  assert.deepEqual(ej.map((e) => e.nombre), ["Dominadas", "Carrera 1000 m"]);
  assert.deepEqual(ej[0].hombres.map((h) => h.alumno_id), ["luis"]);
  assert.deepEqual(ej[1].mujeres.map((x) => x.puesto), [1, 1]);
});
