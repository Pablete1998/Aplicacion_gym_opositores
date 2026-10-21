"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export default function Login() {
  const [error, accion, enviando] = useActionState(entrar, null);
  return (
    <main className="wrap">
      <section className="panel login">
        <h1>Academia Opositores</h1>
        <p className="sub">Entra con el correo que te dio la academia.</p>
        <form action={accion} style={{ display: "grid", gap: 12 }}>
          <label>
            Correo
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Contraseña
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </label>
          {error && <p className="aviso error">{error}</p>}
          <button className="btn" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
