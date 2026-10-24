"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { LETRAS, leerImportacion } from "@/lib/preguntas";
import { importarPreguntas, type Respuesta } from "../actions";

const VISTA = 20;

// Excel guarda los CSV en UTF-8 o en el formato antiguo de Windows, según la versión
async function leerArchivo(archivo: File): Promise<string> {
  const datos = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(datos);
  } catch {
    return new TextDecoder("windows-1252").decode(datos);
  }
}

export function Importador({ oposicionId, oposicion }: { oposicionId: string; oposicion: string }) {
  const [contenido, setContenido] = useState("");
  const [estado, setEstado] = useState<Respuesta>(null);
  const [importando, empezar] = useTransition();
  const { filas, errores } = useMemo(() => leerImportacion(contenido), [contenido]);

  const importar = () =>
    empezar(async () => {
      const r = await importarPreguntas(oposicionId, contenido);
      setEstado(r);
      if (r?.ok) setContenido("");
    });

  return (
    <div className="importar">
      <label>
        Pega aquí las filas copiadas de Excel
        <textarea
          rows={8}
          value={contenido}
          onChange={(e) => { setContenido(e.target.value); setEstado(null); }}
          placeholder={"Tema 1. La Constitución\t¿En qué año se aprobó la Constitución?\t1976\t1978\t1982\t\tB"}
        />
      </label>
      <label>
        O sube un archivo CSV
        <input
          type="file"
          accept=".csv,.tsv,.txt,text/csv,text/plain"
          onChange={async (e) => {
            const archivo = e.target.files?.[0];
            if (archivo) { setContenido(await leerArchivo(archivo)); setEstado(null); }
            e.target.value = "";
          }}
        />
      </label>

      {contenido.trim() && (
        <>
          <p className="sub">
            {filas.length} {filas.length === 1 ? "pregunta lista" : "preguntas listas"} para {oposicion}
            {errores.length > 0 && `, ${errores.length} con errores que no se importarán`}.
          </p>
          {errores.length > 0 && (
            <ul className="aviso error">
              {errores.slice(0, 10).map((e) => <li key={e.linea}>Fila {e.linea}: {e.motivo}</li>)}
              {errores.length > 10 && <li>Y {errores.length - 10} más.</li>}
            </ul>
          )}
          {filas.length > 0 && (
            <div className="tbl">
              <table>
                <thead><tr><th>Fila</th><th>Tema</th><th>Pregunta</th><th>Correcta</th></tr></thead>
                <tbody>
                  {filas.slice(0, VISTA).map((f) => (
                    <tr key={f.linea}>
                      <td>{f.linea}</td>
                      <td>{f.tema || <span className="sub">Sin tema</span>}</td>
                      <td>{f.enunciado}</td>
                      <td>{LETRAS[f.correcta]}) {f.opciones[f.correcta]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filas.length > VISTA && <p className="sub">Y {filas.length - VISTA} más.</p>}
            </div>
          )}
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn" disabled={!filas.length || importando} onClick={importar}>
              {importando ? "Importando…" : `Importar ${filas.length} ${filas.length === 1 ? "pregunta" : "preguntas"}`}
            </button>
          </div>
        </>
      )}
      {estado && (
        <p className={`aviso ${estado.ok ? "ok" : "error"}`}>
          {estado.mensaje} {estado.ok && <Link href={`/tests?oposicion=${oposicionId}`}>Ver el banco</Link>}
        </p>
      )}
    </div>
  );
}
