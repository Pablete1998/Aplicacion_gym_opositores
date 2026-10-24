import { test } from "node:test";
import assert from "node:assert/strict";
import { formatoNota, reloj, restaPorFallo } from "./tests.ts";

test("reloj", () => {
  assert.equal(reloj(305), "5:05");
  assert.equal(reloj(3725), "1:02:05");
  assert.equal(reloj(-3), "0:00");
});

test("nota con coma y dos decimales", () => {
  assert.equal(formatoNota(7.5), "7,50");
  assert.equal(formatoNota("6.25"), "6,25");
  assert.equal(formatoNota(null), "—");
});

test("cada fallo resta 1/(respuestas − 1)", () => {
  assert.equal(restaPorFallo(4), 1 / 3);
  assert.equal(restaPorFallo(3), 1 / 2);
  assert.equal(restaPorFallo(2), 1);
});
