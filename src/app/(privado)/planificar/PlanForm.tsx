"use client";

import { useActionState, useState } from "react";
import { UNIDADES_EJERCICIO } from "@/lib/sesiones";
import { guardarPlan } from "./actions";

export interface EjercicioPlan { id: string | null; nombre: string; pauta: string; unidad: string }

let siguiente = 0;
const vacio = (): EjercicioPlan & { clave: string } => ({ id: null, nombre: "", pauta: "", unidad: "", clave: `n${siguiente++}` });

export function PlanForm({ grupo, fecha, titulo, notas, ejercicios }: { grupo: string; fecha: string; titulo: string; notas: string; ejercicios: EjercicioPlan[] }) {
  const [estado, accion, enviando] = useActionState(guardarPlan, null);
  const [filas, setFilas] = useState(() => (ejercicios.length ? ejercicios.map((e) => ({ ...e, clave: e.id ?? `n${siguiente++}` })) : [vacio()]));

  const mover = (i: number, paso: number) =>
    setFilas((f) => {
      const copia = [...f];
      const [fila] = copia.splice(i, 1);
      copia.splice(Math.max(0, Math.min(copia.length, i + paso)), 0, fila);
      return copia;
    });

  return (
    <form action={accion} className="plan">
      <input type="hidden" name="grupo" value={grupo} />
      <input type="hidden" name="fecha" value={fecha} />
      <div className="campos">
        <label>
          Título de la sesión
          <input name="titulo" defaultValue={titulo} placeholder="Ej. Fuerza y series de 400" required />
        </label>
        <label>
          Notas para el grupo (opcional)
          <input name="notas" defaultValue={notas} placeholder="Ej. Traed bañador" />
        </label>
      </div>
      <ol className="ejercicios">
        {filas.map((e, i) => (
          <li key={e.clave}>
            <input type="hidden" name="ej_id" value={e.id ?? ""} />
            <label>
              Ejercicio
              <input name="ej_nombre" defaultValue={e.nombre} placeholder="Ej. Dominadas" />
            </label>
            <label>
              Pauta
              <input name="ej_pauta" defaultValue={e.pauta} placeholder="Ej. 4 series al máximo" />
            </label>
            <label>
              El alumno apunta
              <select name="ej_unidad" defaultValue={e.unidad}>
                <option value="">Solo si lo ha hecho</option>
                {Object.entries(UNIDADES_EJERCICIO).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </label>
            <div className="acciones-fila">
              <button type="button" className="btn ghost" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button type="button" className="btn ghost" onClick={() => mover(i, 1)} disabled={i === filas.length - 1} aria-label="Bajar">↓</button>
              <button type="button" className="btn ghost" onClick={() => setFilas((f) => f.filter((x) => x.clave !== e.clave))} disabled={filas.length === 1}>Quitar</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="row" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn ghost" onClick={() => setFilas((f) => [...f, vacio()])}>+ Añadir ejercicio</button>
        <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar plan"}</button>
      </div>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
    </form>
  );
}
