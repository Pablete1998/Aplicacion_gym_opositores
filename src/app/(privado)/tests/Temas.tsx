"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { borrarTema, guardarTema, type Respuesta } from "./actions";

export function Tema({ id, numero, nombre, etiqueta, preguntas, href }: { id: string; numero: number | null; nombre: string; etiqueta: string; preguntas: number; href: string }) {
  const [editando, setEditando] = useState(false);
  const [estado, accion, guardando] = useActionState(async (prev: Respuesta, form: FormData) => {
    const r = await guardarTema(prev, form);
    if (r?.ok) setEditando(false);
    return r;
  }, null);
  if (!editando) {
    return (
      <div className="row tema">
        <Link href={href}>{etiqueta}</Link>
        <span className="row">
          <span className="sub">{preguntas}</span>
          <button type="button" className="btn ghost" onClick={() => setEditando(true)}>Cambiar</button>
        </span>
      </div>
    );
  }
  return (
    <div className="tema">
      <form action={accion} className="campos">
        <input type="hidden" name="id" value={id} />
        <label>
          Número
          <input name="numero" type="number" min={0} max={999} defaultValue={numero ?? ""} />
        </label>
        <label style={{ gridColumn: "span 2" }}>
          Nombre
          <input name="nombre" defaultValue={nombre} required maxLength={200} />
        </label>
        <button className="btn" disabled={guardando}>Guardar</button>
        {estado && !estado.ok && <p className="aviso error" style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
      </form>
      <form action={borrarTema} className="row" style={{ justifyContent: "flex-start" }}>
        <input type="hidden" name="id" value={id} />
        <button className="btn ghost">Borrar el tema</button>
        <span className="sub">Sus {preguntas} preguntas se quedan en el banco, sin tema.</span>
        <button type="button" className="btn ghost" onClick={() => setEditando(false)}>Cancelar</button>
      </form>
    </div>
  );
}

export function NuevoTema({ oposicionId }: { oposicionId: string }) {
  const [estado, accion, guardando] = useActionState(guardarTema, null);
  return (
    <form action={accion} className="campos">
      <input type="hidden" name="oposicion_id" value={oposicionId} />
      <label>
        Número
        <input name="numero" type="number" min={0} max={999} placeholder="Opcional" />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        Tema nuevo
        <input name="nombre" required maxLength={200} placeholder="Ej. La Constitución Española de 1978" />
      </label>
      <button className="btn" disabled={guardando}>Añadir tema</button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`} style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
    </form>
  );
}
