"use client";

import { useActionState, useState } from "react";
import { registrarMarca } from "./actions";

export interface Opcion {
  id: string;
  nombre: string;
  pruebas: { id: string; nombre: string; unidad: string }[];
}

export function Formulario({ alumnos, inicial, hoy }: { alumnos: Opcion[]; inicial?: string; hoy: string }) {
  const [estado, accion, enviando] = useActionState(registrarMarca, null);
  const [alumnoId, setAlumnoId] = useState(inicial && alumnos.some((a) => a.id === inicial) ? inicial : alumnos[0]?.id);
  const alumno = alumnos.find((a) => a.id === alumnoId);

  return (
    <form action={accion} className="campos">
      <label>
        Alumno
        <select id="alumno" name="alumno" value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
          {alumnos.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </label>
      <label>
        Prueba
        <select id="prueba" name="prueba" key={alumnoId}>
          {alumno?.pruebas.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.unidad})</option>)}
        </select>
      </label>
      <label>
        Fecha
        <input id="fecha" name="fecha" type="date" defaultValue={hoy} />
      </label>
      <label>
        Marca
        <input id="marca" name="marca" inputMode="decimal" placeholder="Ej. 11,4 · 8 · 3:45" required />
      </label>
      <button className="btn" disabled={enviando}>{enviando ? "Guardando…" : "Guardar marca"}</button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`} style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
    </form>
  );
}
