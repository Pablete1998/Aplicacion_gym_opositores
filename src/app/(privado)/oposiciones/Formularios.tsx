"use client";

import { useActionState } from "react";
import { borrarBaremo, guardarBaremo, guardarOposicion } from "./actions";

export interface FilaBaremo {
  id: string | null;
  sexo: "H" | "M" | null;
  edad_min: number;
  edad_max: number;
  minima: string;
  objetivo: string;
  puntos: string;
}

export function DatosOposicion({ id, fecha, fuente }: { id: string; fecha: string | null; fuente: string | null }) {
  const [estado, accion, guardando] = useActionState(guardarOposicion, null);
  return (
    <form action={accion} className="campos">
      <input type="hidden" name="id" value={id} />
      <label>
        Fecha prevista del examen
        <input name="fecha_examen" type="date" defaultValue={fecha ?? ""} />
      </label>
      <label style={{ gridColumn: "span 2" }}>
        Fuente del baremo (BOE de la convocatoria)
        <input name="baremo_fuente" defaultValue={fuente ?? ""} placeholder="Ej. BOE-A-2026-9982, apéndice II" />
      </label>
      <button className="btn" disabled={guardando}>Guardar</button>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`} style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
    </form>
  );
}

export function Baremo({ fila, pruebaId, oposicionId, conPuntos }: { fila: FilaBaremo; pruebaId: string; oposicionId: string; conPuntos: boolean }) {
  const [estado, accion, guardando] = useActionState(guardarBaremo, null);
  return (
    <div className="baremo">
      <form action={accion} className="campos">
        <input type="hidden" name="id" value={fila.id ?? ""} />
        <input type="hidden" name="prueba_id" value={pruebaId} />
        <input type="hidden" name="oposicion_id" value={oposicionId} />
        <label>
          Sexo
          <select name="sexo" defaultValue={fila.sexo ?? ""}>
            <option value="">Ambos</option>
            <option value="H">Hombres</option>
            <option value="M">Mujeres</option>
          </select>
        </label>
        <label>
          Edad desde
          <input name="edad_min" type="number" min={0} max={120} defaultValue={fila.edad_min} />
        </label>
        <label>
          Edad hasta
          <input name="edad_max" type="number" min={0} max={120} defaultValue={fila.edad_max} />
        </label>
        <label>
          Marca mínima
          <input name="minima" inputMode="decimal" defaultValue={fila.minima} placeholder="Ej. 14,4 · 16 · 9:25" required />
        </label>
        <label>
          Objetivo de la academia
          <input name="objetivo" inputMode="decimal" defaultValue={fila.objetivo} placeholder="Opcional" />
        </label>
        {(conPuntos || fila.puntos) && (
          <label style={{ gridColumn: "1 / -1" }}>
            Tabla de puntos: marca para 1, 2, … 10 puntos, separadas por punto y coma
            <input name="puntos" defaultValue={fila.puntos} placeholder="11,6; 11,4; 11,2; 10,9; 10,5; 10,1; 9,7; 9,3; 8,8; 8,2" />
          </label>
        )}
        <button className="btn" disabled={guardando}>{fila.id ? "Guardar" : "Añadir"}</button>
        {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`} style={{ gridColumn: "1 / -1" }}>{estado.mensaje}</p>}
      </form>
      {fila.id && (
        <form action={borrarBaremo}>
          <input type="hidden" name="id" value={fila.id} />
          <input type="hidden" name="oposicion_id" value={oposicionId} />
          <button className="btn ghost">Borrar esta fila</button>
        </form>
      )}
    </div>
  );
}
