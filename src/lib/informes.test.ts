import { test } from "node:test";
import assert from "node:assert/strict";
import { diasDesde, enMes, mejorDe, mesAnterior, mesSiguiente, nombreMes, tendencia } from "./informes.ts";

test("tendencia en tiempos: bajar es mejorar", () => {
  const serie = [
    { fecha: "2026-08-01", marca: 11.5 },
    { fecha: "2026-09-20", marca: 11.0 },
    { fecha: "2026-10-20", marca: 10.6 },
  ];
  assert.equal(tendencia(serie, false), "mejora");
  assert.equal(tendencia(serie, true), "empeora");
});

test("tendencia: compara con la marca de hace unas semanas", () => {
  const serie = [
    { fecha: "2026-09-01", marca: 8 },
    { fecha: "2026-10-15", marca: 12 },
    { fecha: "2026-10-20", marca: 8 },
  ];
  // Hace 4 semanas desde el 20/10 la referencia es la del 1/9 (8 → 8)
  assert.equal(tendencia(serie, true), "estable");
});

test("tendencia sin historial suficiente", () => {
  assert.equal(tendencia([{ fecha: "2026-10-20", marca: 8 }], true), null);
});

test("fechas por meses", () => {
  assert.equal(mesAnterior("2026-01"), "2025-12");
  assert.equal(mesAnterior("2026-10"), "2026-09");
  assert.equal(mesSiguiente("2026-12"), "2027-01");
  assert.equal(mesSiguiente("2026-09"), "2026-10");
  assert.ok(enMes("2026-10-03", "2026-10"));
  assert.ok(!enMes("2026-11-03", "2026-10"));
  assert.equal(nombreMes("2026-10"), "octubre de 2026");
  assert.equal(diasDesde("2026-10-01", new Date("2026-10-22T12:00Z")), 21);
});

test("mejor marca", () => {
  assert.equal(mejorDe([{ fecha: "a", marca: 10.2 }, { fecha: "b", marca: 9.9 }], false), 9.9);
  assert.equal(mejorDe([], true), null);
});
