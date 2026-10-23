"use client";

import { useActionState, useState } from "react";
import { normal } from "@/lib/texto";
import { registrarMarca } from "./actions";

export interface Opcion {
  id: string;
  nombre: string;
  oposicion: string;
  grupo: string | null;
  pruebas: { id: string; nombre: string; unidad: string }[];
}

export function Formulario({ alumnos, inicial, hoy }: { alumnos: Opcion[]; inicial?: string; hoy: string }) {
  const [estado, accion, enviando] = useActionState(registrarMarca, null);
  const [alumnoId, setAlumnoId] = useState(inicial && alumnos.some((a) => a.id === inicial) ? inicial : alumnos[0]?.id);
  const [oposicion, setOposicion] = useState("");
  const [grupo, setGrupo] = useState("");
  const [buscar, setBuscar] = useState("");

  // Filtros para encontrar al alumno rápido cuando hay muchos
  const oposiciones = [...new Set(alumnos.map((a) => a.oposicion))].sort((a, b) => a.localeCompare(b, "es"));
  const grupos = [...new Set(alumnos.filter((a) => !oposicion || a.oposicion === oposicion).flatMap((a) => (a.grupo ? [a.grupo] : [])))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const texto = normal(buscar.trim());
  const visibles = alumnos.filter(
    (a) => (!oposicion || a.oposicion === oposicion) && (!grupo || a.grupo === grupo) && (!texto || normal(a.nombre).includes(texto)),
  );
  // Si el elegido queda fuera de los filtros, se coge el primero que se ve
  const alumno = visibles.find((a) => a.id === alumnoId) ?? visibles[0];

  return (
    <form action={accion} className="campos">
      <div className="filtros" style={{ gridColumn: "1 / -1" }}>
        <label>
          Buscar alumno
          <input type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre o apellidos" />
        </label>
        <label>
          Oposición
          <select
            value={oposicion}
            onChange={(e) => {
              setOposicion(e.target.value);
              setGrupo("");
            }}
          >
            <option value="">Todas</option>
            {oposiciones.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label>
          Grupo
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="">Todos</option>
            {grupos.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
      </div>
      <label>
        Alumno {visibles.length < alumnos.length && `(${visibles.length})`}
        <select id="alumno" name="alumno" value={alumno?.id ?? ""} onChange={(e) => setAlumnoId(e.target.value)} disabled={!alumno}>
          {visibles.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          {!alumno && <option value="">Nadie coincide con los filtros</option>}
        </select>
      </label>
      <label>
        Prueba
        <select id="prueba" name="prueba" key={alumno?.id}>
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
      <button className="btn" disabled={enviando || !alumno}>{enviando ? "Guardando…" : "Guardar marca"}</button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`} style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
    </form>
  );
}
