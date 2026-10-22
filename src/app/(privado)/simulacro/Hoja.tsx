"use client";

import { useActionState, useState } from "react";
import { ETIQUETA_ESTADO, estadoMarca, leerMarca, puntosMarca, type Baremo } from "@/lib/baremo";
import { guardarSimulacro } from "./actions";

export interface Pendiente {
  id: string;
  nombre: string;
  baremo: Baremo | null;
}

// Una fila por alumno que aún no tiene marca ese día; enseña al momento si llega al baremo
export function Hoja({ grupo, prueba, fecha, alumnos }: { grupo: string; prueba: string; fecha: string; alumnos: Pendiente[] }) {
  const [estado, accion, guardando] = useActionState(guardarSimulacro, null);
  const [marcas, setMarcas] = useState<Record<string, string>>({});
  const apuntadas = alumnos.filter((a) => marcas[a.id]?.trim()).length;

  return (
    <form action={accion} className="hoja">
      <input type="hidden" name="grupo" value={grupo} />
      <input type="hidden" name="prueba" value={prueba} />
      <input type="hidden" name="fecha" value={fecha} />
      <div className="tbl">
        <table>
          <thead>
            <tr><th>Alumno</th><th>Marca</th><th>Baremo</th></tr>
          </thead>
          <tbody>
            {alumnos.map((a) => {
              const valor = leerMarca(marcas[a.id] ?? "");
              const est = valor !== null && a.baremo ? estadoMarca(a.baremo, valor) : null;
              const puntos = valor !== null && a.baremo ? puntosMarca(a.baremo, valor) : null;
              return (
                <tr key={a.id}>
                  <td><label htmlFor={`m_${a.id}`} className="nombre">{a.nombre}</label></td>
                  <td>
                    <input
                      id={`m_${a.id}`}
                      name={`m_${a.id}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="—"
                      value={marcas[a.id] ?? ""}
                      onChange={(e) => setMarcas({ ...marcas, [a.id]: e.target.value })}
                    />
                  </td>
                  <td>
                    {est && <span className={`pill p-${est}`}>{ETIQUETA_ESTADO[est]}{puntos !== null && ` · ${puntos} p`}</span>}
                    {marcas[a.id]?.trim() && valor === null && <span className="pill p-no_apto">¿Marca?</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="row">
        <span className="sub">Deja vacío a quien no se presente. {apuntadas} de {alumnos.length} apuntadas.</span>
        <button className="btn" disabled={guardando || !apuntadas}>{guardando ? "Guardando…" : "Guardar marcas"}</button>
      </div>
      {estado && !estado.ok && <p className="aviso error">{estado.mensaje}</p>}
    </form>
  );
}
