"use client";

import Link from "next/link";
import { useState } from "react";
import type { AlumnoResumen } from "@/lib/datos";
import { FORMAS_PAGO, type FormaPago } from "@/lib/pagos";
import { normal } from "@/lib/texto";
import { marcarPagada, marcarPendiente } from "./actions";

export type FilaCuota = AlumnoResumen & { forma: FormaPago | null; factura: { id: string; numero: string } | null };
type Estado = "" | "pendiente" | "pagada";

export function Tabla({ filas }: { filas: FilaCuota[] }) {
  const [buscar, setBuscar] = useState("");
  const [oposicion, setOposicion] = useState("");
  const [grupo, setGrupo] = useState("");
  const [estado, setEstado] = useState<Estado>("");

  const oposiciones = [...new Set(filas.map((a) => a.oposicion))].sort((a, b) => a.localeCompare(b, "es"));
  const grupos = [...new Set(filas.filter((a) => !oposicion || a.oposicion === oposicion).flatMap((a) => (a.grupo ? [a.grupo] : [])))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const texto = normal(buscar.trim());
  const visibles = filas.filter(
    (a) =>
      (!texto || normal(`${a.nombre} ${a.apellidos}`).includes(texto)) &&
      (!oposicion || a.oposicion === oposicion) &&
      (!grupo || a.grupo === grupo) &&
      (!estado || (estado === "pendiente" ? !a.cuota_al_dia : a.cuota_al_dia)),
  );

  return (
    <>
      <div className="filtros">
        <label>
          Buscar
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
        <label>
          Cuota
          <select value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
            <option value="">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="pagada">Pagadas</option>
          </select>
        </label>
      </div>
      {visibles.length < filas.length && <p className="sub">{visibles.length} de {filas.length} alumnos</p>}
      <div className="tbl">
        <table>
          <thead><tr><th>Alumno</th><th>Grupo</th><th>Cuota</th><th></th></tr></thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/alumnos/${a.id}`}>{a.apellidos}, {a.nombre}</Link></td>
                <td>{a.grupo ?? "Sin grupo"}</td>
                <td>
                  {a.cuota_al_dia ? (
                    <>
                      <span className="pill p-objetivo">{a.forma ? `Pagada · ${FORMAS_PAGO[a.forma]}` : "Al día"}</span>
                      {a.factura && <> <Link href={`/facturas/${a.factura.id}`} className="sub">Factura {a.factura.numero}</Link></>}
                    </>
                  ) : (
                    <span className="pill p-no_apto">Pendiente</span>
                  )}
                </td>
                <td>
                  {a.cuota_al_dia ? (
                    <form action={marcarPendiente}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="btn ghost">Marcar pendiente</button>
                    </form>
                  ) : (
                    <form action={marcarPagada} className="pagar">
                      <input type="hidden" name="id" value={a.id} />
                      <span className="sub">Pagada:</span>
                      {Object.entries(FORMAS_PAGO).map(([valor, nombre]) => (
                        <button key={valor} name="forma" value={valor} className="btn ghost">{nombre}</button>
                      ))}
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={4}>{filas.length === 0 ? "No hay alumnos todavía." : "Ningún alumno coincide con los filtros."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
