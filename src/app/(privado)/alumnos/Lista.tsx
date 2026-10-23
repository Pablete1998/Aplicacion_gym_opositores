"use client";

import Link from "next/link";
import { useState } from "react";
import type { AlumnoResumen } from "@/lib/datos";
import { normal } from "@/lib/texto";

const SIN_GRUPO = "sin";

export function Lista({ alumnos, conCuota, grupoInicial }: { alumnos: AlumnoResumen[]; conCuota: boolean; grupoInicial?: string }) {
  const [buscar, setBuscar] = useState("");
  const [oposicion, setOposicion] = useState("");
  const [grupo, setGrupo] = useState(grupoInicial === SIN_GRUPO ? SIN_GRUPO : "");
  const [soloPendientes, setSoloPendientes] = useState(false);

  const oposiciones = [...new Set(alumnos.map((a) => a.oposicion))].sort((a, b) => a.localeCompare(b, "es"));
  const grupos = [...new Set(alumnos.filter((a) => !oposicion || a.oposicion === oposicion).flatMap((a) => (a.grupo ? [a.grupo] : [])))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const texto = normal(buscar.trim());
  const visibles = alumnos.filter(
    (a) =>
      (!texto || normal(`${a.nombre} ${a.apellidos}`).includes(texto)) &&
      (!oposicion || a.oposicion === oposicion) &&
      (!grupo || (grupo === SIN_GRUPO ? !a.grupo : a.grupo === grupo)) &&
      (!soloPendientes || !a.cuota_al_dia),
  );
  const hayFiltro = Boolean(texto || oposicion || grupo || soloPendientes);

  return (
    <section className="panel">
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
              if (grupo !== SIN_GRUPO) setGrupo("");
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
            <option value={SIN_GRUPO}>Sin grupo</option>
          </select>
        </label>
        {conCuota && (
          <label className="casilla">
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} />
            Solo cuota pendiente
          </label>
        )}
      </div>
      <p className="sub">
        {hayFiltro ? `${visibles.length} de ${alumnos.length} alumnos` : `${alumnos.length} alumnos activos`}
        {hayFiltro && (
          <>
            {" · "}
            <button
              type="button"
              className="enlace"
              onClick={() => {
                setBuscar("");
                setOposicion("");
                setGrupo("");
                setSoloPendientes(false);
              }}
            >
              Quitar filtros
            </button>
          </>
        )}
      </p>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Oposición</th><th>Grupo</th>
              {conCuota && <th>Cuota</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/alumnos/${a.id}`}>{a.apellidos}, {a.nombre}</Link></td>
                <td><span className="pill p-op">{a.oposicion}</span></td>
                <td>{a.grupo ?? "Sin grupo"}</td>
                {conCuota && (
                  <td>{a.cuota_al_dia ? <span className="pill p-objetivo">Al día</span> : <span className="pill p-no_apto">Pendiente</span>}</td>
                )}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr><td colSpan={4}>{alumnos.length === 0 ? "No hay alumnos todavía." : "Ningún alumno coincide con los filtros."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
