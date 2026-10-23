import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptoLegible, csvFacturas, numeroFactura, rangoPeriodo } from "./facturas.ts";

test("número de factura con ceros", () => {
  assert.equal(numeroFactura("A2026", 7), "A2026-0007");
});

test("CSV para el gestor", () => {
  const csv = csvFacturas([
    { serie: "A2026", numero: 1, fecha: "2026-10-23", tipo: "completa", cliente_nombre: "Laura Martín", cliente_nif: "12345678Z", concepto: "Cuota; octubre", base: 74.38, iva_tipo: 21, iva_cuota: 15.62, total: 90, forma_pago: "efectivo" },
    { serie: "RA2026", numero: 1, fecha: "2026-10-24", tipo: "completa", cliente_nombre: "Laura Martín", cliente_nif: "12345678Z", concepto: "Cuota", base: -74.38, iva_tipo: 21, iva_cuota: -15.62, total: -90, forma_pago: "efectivo", rectificada: "A2026-0001" },
  ]);
  assert.ok(csv.startsWith("﻿Número;Fecha"));
  const lineas = csv.trim().split("\r\n");
  assert.equal(lineas[1], 'A2026-0001;23/10/2026;Completa;Laura Martín;12345678Z;"Cuota; octubre";74,38;21,00;15,62;90,00;efectivo;');
  assert.match(lineas[2], /^RA2026-0001;24\/10\/2026;Rectificativa;.*;-90,00;efectivo;A2026-0001$/);
});

test("periodos de mes y de trimestre", () => {
  assert.deepEqual(rangoPeriodo("2026-10"), { desde: "2026-10-01", hasta: "2026-11-01", nombre: "octubre de 2026" });
  assert.deepEqual(rangoPeriodo("2026-12")?.hasta, "2027-01-01");
  assert.deepEqual(rangoPeriodo("2026-T4"), { desde: "2026-10-01", hasta: "2027-01-01", nombre: "4.º trimestre de 2026" });
  assert.equal(rangoPeriodo("2026-T1")?.hasta, "2026-04-01");
  assert.equal(rangoPeriodo("2026-13"), null);
  assert.equal(rangoPeriodo("cualquiera"), null);
});

test("concepto con el nombre del mes", () => {
  assert.equal(conceptoLegible("Cuota mensual · 2026-10"), "Cuota mensual · octubre de 2026");
  assert.equal(conceptoLegible("Cuota sin mes"), "Cuota sin mes");
});
