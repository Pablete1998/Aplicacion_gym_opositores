"use client";

import { useActionState } from "react";
import { cambiarPassword } from "./actions";

export function FormularioPassword() {
  const [error, enviar, guardando] = useActionState(cambiarPassword, null);
  return (
    <form action={enviar} className="campos">
      <label>
        Nueva contraseña
        <input id="nueva" name="nueva" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label>
        Repítela
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <button className="btn" disabled={guardando}>{guardando ? "Guardando…" : "Cambiar contraseña"}</button>
      {error && <p className="aviso error" style={{ gridColumn: "1 / -1" }}>{error}</p>}
    </form>
  );
}
