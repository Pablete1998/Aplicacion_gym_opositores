import { test } from "node:test";
import assert from "node:assert/strict";
import { esUnidadEjercicio, evolucionEjercicios, formatoEjercicio, hoyEnEspana } from "./sesiones.ts";

test("unidades de ejercicio", () => {
  assert.equal(esUnidadEjercicio("kg"), true);
  assert.equal(esUnidadEjercicio("toString"), false);
  assert.equal(esUnidadEjercicio(""), false);
});

test("hoy en España cambia a medianoche de Madrid", () => {
  assert.equal(hoyEnEspana(new Date("2026-10-23T22:30:00Z")), "2026-10-24");
  assert.equal(hoyEnEspana(new Date("2026-10-23T21:30:00Z")), "2026-10-23");
});

test("evolución agrupa por nombre y unidad, en orden de fecha", () => {
  const evo = evolucionEjercicios([
    { nombre: "Dominadas", unidad: "reps", valor: 12, fecha: "2026-10-20" },
    { nombre: "dominadas ", unidad: "reps", valor: 10, fecha: "2026-10-13" },
    { nombre: "Dominadas", unidad: "kg", valor: 5, fecha: "2026-10-20" },
    { nombre: "Estiramientos", unidad: null, valor: null, fecha: "2026-10-20" },
  ]);
  assert.equal(evo.length, 2);
  assert.deepEqual(evo[0].serie.map((s) => s.valor), [10, 12]);
});

test("formato de lo apuntado", () => {
  assert.equal(formatoEjercicio("seg", 225), "3:45");
  assert.equal(formatoEjercicio("seg", 12.5), "12,5 s");
  assert.equal(formatoEjercicio("kg", 60), "60 kg");
  assert.equal(formatoEjercicio(null, null), "Hecho");
});
