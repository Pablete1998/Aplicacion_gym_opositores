import { test } from "node:test";
import assert from "node:assert/strict";
import { cabeceraTema, idsBoe, leerCabecera } from "./temario.ts";

const ejemplo = `---
oposicion: Policía Nacional
tema: 2
titulo: "La Constitución Española (I)"
convocatoria: BOE-A-2026-15055
fuentes:
  - BOE-A-1978-31229 Constitución Española (última modificación: 17/02/2024)
  - BOE-A-1981-10325 LO 3/1981 del Defensor del Pueblo
actualizado: 2026-10-24
---
# Resumen

Texto.
`;

test("lee la cabecera y el cuerpo", () => {
  const { datos, cuerpo } = leerCabecera(ejemplo);
  assert.equal(datos.oposicion, "Policía Nacional");
  assert.equal(datos.titulo, "La Constitución Española (I)");
  assert.deepEqual((datos.fuentes as string[]).length, 2);
  assert.ok(cuerpo.startsWith("# Resumen"));
  const c = cabeceraTema(datos)!;
  assert.equal(c.tema, 2);
  assert.equal(c.convocatoria, "BOE-A-2026-15055");
  assert.equal(c.actualizado, "2026-10-24");
});

test("sin cabecera válida no hay tema", () => {
  assert.equal(cabeceraTema(leerCabecera("# Solo texto").datos), null);
  assert.equal(cabeceraTema({ oposicion: "X", tema: "dos", titulo: "T", actualizado: "2026-10-24" }), null);
});

test("identificadores del BOE", () => {
  assert.deepEqual(idsBoe("Ver BOE-A-1978-31229 y BOE-A-2015-7730."), ["BOE-A-1978-31229", "BOE-A-2015-7730"]);
});
