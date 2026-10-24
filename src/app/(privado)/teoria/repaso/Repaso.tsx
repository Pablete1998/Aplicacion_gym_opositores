"use client";

import Link from "next/link";
import { useState } from "react";
import { LETRAS } from "@/lib/preguntas";
import { cuandoVuelve, NOTAS, programar, type EstadoTarjeta, type Nota } from "@/lib/repaso";
import { valorar } from "./actions";

export interface TarjetaHoy extends EstadoTarjeta {
  pregunta_id: string;
  tema: string | null;
  enunciado: string;
  opciones: string[];
  correcta: number;
  explicacion: string | null;
  nueva: boolean;
  toca_en: string;
}

export function Repaso({ tarjetas, masNuevas }: { tarjetas: TarjetaHoy[]; masNuevas: string | null }) {
  const [cola, setCola] = useState(tarjetas);
  const [girada, setGirada] = useState(false);
  const [elegida, setElegida] = useState<number | null>(null);
  const [hechas, setHechas] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Para los textos de los botones basta con la hora a la que se abrió la página
  const [ahora] = useState(() => new Date());

  const t = cola[0];
  const nuevas = cola.filter((c) => c.nueva).length;
  const aprendiendo = cola.filter((c) => !c.nueva && c.estado === "aprendiendo").length;
  const repaso = cola.length - nuevas - aprendiendo;

  if (!t) {
    return (
      <section className="panel">
        <h2>{hechas ? "¡Hecho por hoy!" : "Nada que repasar ahora"}</h2>
        <p className="sub">
          {hechas ? `Has repasado ${hechas} ${hechas === 1 ? "tarjeta" : "tarjetas"}. ` : ""}
          Mañana tendrás las que tocan y {masNuevas ? "nuevas preguntas." : "más preguntas nuevas."}
        </p>
        {masNuevas && <p><Link className="btn ghost" href={masNuevas}>Estudiar más nuevas hoy</Link></p>}
      </section>
    );
  }

  async function puntuar(nota: Nota) {
    setGuardando(true);
    setError(null);
    const r = await valorar(t.pregunta_id, nota);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    setCola((c) => [...c.slice(1), ...(r.hoy ? [{ ...t, ...r.tarjeta, nueva: false, toca_en: r.toca_en }] : [])]);
    setHechas((h) => h + 1);
    setGirada(false);
    setElegida(null);
  }

  return (
    <div className="test">
      <p className="cuenta-repaso">
        <span className="nuevas">{nuevas} nuevas</span> · <span className="aprendiendo">{aprendiendo} aprendiendo</span> · <span className="repasar">{repaso} para repasar</span>
      </p>
      <section className="panel tarjeta">
        {t.tema && <p className="sub">{t.tema}</p>}
        <p className="enunciado">{t.enunciado}</p>
        <div className="opciones-test">
          {t.opciones.map((o, i) => {
            const clase = !girada ? (i === elegida ? "elegida" : "") : i === t.correcta ? "bien" : i === elegida ? "mal" : "";
            return (
              <button key={i} type="button" className={`opcion-test ${clase}`} disabled={girada} onClick={() => { setElegida(i); setGirada(true); }}>
                <b>{LETRAS[i]}</b>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
        {!girada ? (
          <button type="button" className="btn" onClick={() => setGirada(true)}>Ver la respuesta</button>
        ) : (
          <>
            <p className="aviso ok">
              La buena es la {LETRAS[t.correcta]}.{t.explicacion && <> {t.explicacion}</>}
            </p>
            <p className="sub">¿Cómo te ha costado?</p>
            <div className="notas-repaso">
              {NOTAS.map(({ nota, texto }) => (
                <button key={nota} type="button" className={`nota-${nota}`} onClick={() => puntuar(nota)} disabled={guardando}>
                  <span>{texto}</span>
                  <small>{cuandoVuelve(ahora, programar(t, nota, ahora).toca_en)}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="aviso error">{error}</p>}
      </section>
    </div>
  );
}
