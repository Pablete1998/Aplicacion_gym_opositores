import { test } from "node:test";
import assert from "node:assert/strict";
import { cuandoVuelve, programar, TARJETA_NUEVA } from "./repaso.ts";

const ahora = new Date("2026-10-24T10:00:00Z");
const vuelve = (t: { toca_en: Date }) => cuandoVuelve(ahora, t.toca_en);

test("tarjeta nueva: pasos de 1 y 10 minutos y luego 1 día", () => {
  assert.equal(vuelve(programar(TARJETA_NUEVA, 1, ahora)), "1 min");
  const paso1 = programar(TARJETA_NUEVA, 3, ahora);
  assert.equal(vuelve(paso1), "10 min");
  assert.equal(paso1.paso, 1);
  const aprendida = programar(paso1, 3, ahora);
  assert.equal(aprendida.estado, "repaso");
  assert.equal(vuelve(aprendida), "1 d");
  assert.equal(vuelve(programar(TARJETA_NUEVA, 4, ahora)), "4 d");
});

test("en repaso el intervalo crece con la facilidad", () => {
  const t = { ...TARJETA_NUEVA, estado: "repaso" as const, intervalo: 10 };
  assert.equal(programar(t, 2, ahora).intervalo, 12);
  assert.equal(programar(t, 3, ahora).intervalo, 25);
  const facil = programar(t, 4, ahora);
  assert.equal(facil.intervalo, 33);
  assert.equal(facil.facilidad, 2.65);
  assert.equal(programar({ ...t, intervalo: 300 }, 4, ahora).intervalo, 365);
});

test("si se olvida, vuelve a aprendizaje con la mitad del intervalo", () => {
  const t = { ...TARJETA_NUEVA, estado: "repaso" as const, intervalo: 20 };
  const olvidada = programar(t, 1, ahora);
  assert.equal(olvidada.estado, "aprendiendo");
  assert.equal(olvidada.lapsos, 1);
  assert.equal(olvidada.facilidad, 2.3);
  assert.equal(vuelve(olvidada), "10 min");
  assert.equal(vuelve(programar(olvidada, 3, ahora)), "10 d");
});

test("textos de cuándo vuelve", () => {
  const en = (ms: number) => cuandoVuelve(ahora, new Date(ahora.getTime() + ms));
  assert.equal(en(5 * 3600_000), "5 h");
  assert.equal(en(45 * 86_400_000), "2 meses");
  assert.equal(en(400 * 86_400_000), "1 año");
});
