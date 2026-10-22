import { test } from "node:test";
import assert from "node:assert/strict";
import { clasificar, mejorMarca } from "./simulacro.ts";

test("clasificación por tiempo: gana el menor", () => {
  const c = clasificar([{ n: "a", marca: 10.2 }, { n: "b", marca: 9.8 }, { n: "c", marca: 11 }], false);
  assert.deepEqual(c.map((f) => [f.n, f.puesto]), [["b", 1], ["a", 2], ["c", 3]]);
});

test("clasificación por repeticiones con empates", () => {
  const c = clasificar([{ n: "a", marca: 8 }, { n: "b", marca: 12 }, { n: "c", marca: 8 }, { n: "d", marca: 5 }], true);
  assert.deepEqual(c.map((f) => [f.n, f.puesto]), [["b", 1], ["a", 2], ["c", 2], ["d", 4]]);
});

test("mejor marca del día", () => {
  assert.equal(mejorMarca([10.4, 9.9, 10.1], false), 9.9);
  assert.equal(mejorMarca([7, 9, 8], true), 9);
  assert.equal(mejorMarca([], true), null);
});
