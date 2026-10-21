import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordProvisional } from "./password.ts";

test("contraseña provisional legible y distinta cada vez", () => {
  const a = passwordProvisional();
  assert.equal(a.length, 10);
  assert.match(a, /^[a-km-zA-HJ-NP-Z2-9]+$/);
  assert.notEqual(a, passwordProvisional());
});
