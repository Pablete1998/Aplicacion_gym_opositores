"use client";

import { useActionState, useState } from "react";
import { MENSAJES_TOQUE } from "@/lib/toques";
import { darToque } from "./actions";

// Botón "Dar un toque" a un compañero: se abre la lista de mensajes y se manda con un toque
export function Toque({ para, nombre }: { para: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState(darToque, null);

  if (estado?.ok) return <span className="pill p-objetivo">{estado.mensaje}</span>;
  if (!abierto) {
    return <button type="button" className="btn ghost" onClick={() => setAbierto(true)}>Dar un toque</button>;
  }
  return (
    <form action={accion} className="toque">
      <input type="hidden" name="para" value={para} />
      <span className="sub">¿Qué le dices a {nombre}?</span>
      {Object.entries(MENSAJES_TOQUE).map(([clave, texto]) => (
        <button key={clave} name="mensaje" value={clave} className="btn ghost" disabled={enviando}>{texto}</button>
      ))}
      <button type="button" className="sub enlace" onClick={() => setAbierto(false)}>Cancelar</button>
      {estado && !estado.ok && <span className="aviso error">{estado.mensaje}</span>}
    </form>
  );
}
