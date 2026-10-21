"use client";

import { useActionState } from "react";
import { entrar } from "./actions";
import { Logo } from "@/components/Logo";

export default function Login() {
  const [error, accion, enviando] = useActionState(entrar, null);
  return (
    <main className="wrap">
      <section className="panel login">
        <Logo conNombre className="logo-grande" />
        <h1 className="visually-hidden">Fer&apos;s Team</h1>
        <p className="lema">Sin excusas</p>
        <p className="sub" style={{ textAlign: "center" }}>Entra con el correo que te dio la academia.</p>
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
