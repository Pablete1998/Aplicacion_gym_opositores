"use client";

import { useState, useTransition } from "react";
import { cargarPreguntas, marcarRevisado, quitarRevision, type Respuesta } from "../../actions";

export function AccionesTema({ carpeta, tema, revisado, preguntas }: { carpeta: string; tema: number; revisado: boolean; preguntas: number }) {
  const [estado, setEstado] = useState<Respuesta>(null);
  const [ocupado, empezar] = useTransition();
  const hacer = (accion: () => Promise<Respuesta>) => empezar(async () => setEstado(await accion()));
  return (
    <>
      <div className="row" style={{ justifyContent: "flex-start" }}>
        {revisado ? (
          <button type="button" className="btn ghost" disabled={ocupado} onClick={() => hacer(() => quitarRevision(carpeta, tema))}>Retirar a los alumnos</button>
        ) : (
          <button type="button" className="btn" disabled={ocupado} onClick={() => hacer(() => marcarRevisado(carpeta, tema))}>Lo he revisado: publicarlo</button>
        )}
        {preguntas > 0 && (
          <button type="button" className="btn ghost" disabled={ocupado} onClick={() => hacer(() => cargarPreguntas(carpeta, tema))}>
            Pasar sus {preguntas} preguntas al banco
          </button>
        )}
      </div>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
    </>
  );
}
