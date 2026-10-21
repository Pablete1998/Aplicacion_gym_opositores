"use client";

import { useActionState } from "react";
import { comprobarAcceso } from "./actions";

// Los lectores QR USB o Bluetooth escriben el código y pulsan Intro, así que basta un campo con foco
export function Lector() {
  const [resultado, accion, comprobando] = useActionState(comprobarAcceso, null);
  return (
    <div className="grid2">
      <div
        className="resultado"
        style={{
          background: resultado ? (resultado.permitido ? "var(--ok-soft)" : "var(--bad-soft)") : "var(--bg)",
          color: resultado ? (resultado.permitido ? "var(--ok)" : "var(--bad)") : "var(--muted)",
          border: resultado ? 0 : "1px dashed var(--line)",
        }}
        aria-live="polite"
      >
        <div className="grande">{comprobando ? "Comprobando…" : resultado ? (resultado.permitido ? "Adelante" : "Acceso denegado") : "Esperando QR"}</div>
        {resultado?.nombre && <strong>{resultado.nombre}</strong>}
        {resultado?.motivo && <span>{resultado.motivo}</span>}
      </div>
      <form action={accion} className="panel">
        <label>
          Código del alumno
          <input id="codigo" name="codigo" autoFocus autoComplete="off" placeholder="Escanea el QR o pega el código" required />
        </label>
        <button className="btn" disabled={comprobando}>Comprobar</button>
      </form>
    </div>
  );
}
