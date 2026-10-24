"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagenPregunta } from "@/components/ImagenPregunta";
import { LETRAS } from "@/lib/preguntas";
import { reloj, TIPOS, type TipoTest } from "@/lib/tests";
import { responder, terminarTest } from "../actions";

export interface PreguntaTest {
  pregunta_id: string;
  orden: number;
  tema: string | null;
  enunciado: string;
  opciones: string[];
  imagen?: string | null; // sin la migración 0014 no llega
  elegida: number | null;
  correcta: number | null;
  explicacion: string | null;
}

type Correccion = { correcta: number; explicacion: string | null };

// Una pregunta por pantalla. En práctica y repaso se corrige al responder; en el simulacro
// se puede cambiar la respuesta hasta terminar o hasta que se acabe el tiempo.
export function Test({ intentoId, tipo, limite, preguntas }: { intentoId: string; tipo: TipoTest; limite: number | null; preguntas: PreguntaTest[] }) {
  const simulacro = tipo === "simulacro";
  const [elegidas, setElegidas] = useState<Record<string, number | null>>(() => Object.fromEntries(preguntas.map((p) => [p.pregunta_id, p.elegida])));
  const [correcciones, setCorrecciones] = useState<Record<string, Correccion>>(() =>
    Object.fromEntries(preguntas.filter((p) => p.correcta !== null).map((p) => [p.pregunta_id, { correcta: p.correcta!, explicacion: p.explicacion }])),
  );
  const [actual, setActual] = useState(() => Math.max(0, preguntas.findIndex((p) => p.elegida === null)));
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [terminando, empezarTerminar] = useTransition();
  const cerrado = useRef(false);

  const p = preguntas[actual];
  const elegida = elegidas[p.pregunta_id];
  const correccion = correcciones[p.pregunta_id];
  const respondidas = Object.values(elegidas).filter((e) => e !== null).length;
  const quedan = limite === null ? null : (limite - ahora) / 1000;

  const terminar = () => {
    if (cerrado.current) return;
    cerrado.current = true;
    empezarTerminar(() => terminarTest(intentoId));
  };

  useEffect(() => {
    if (limite === null) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [limite]);

  // Se acabó el tiempo: se entrega solo
  useEffect(() => {
    if (quedan !== null && quedan <= 0) terminar();
  });

  async function elegir(opcion: number) {
    if (terminando || (!simulacro && correccion)) return;
    const nueva = simulacro && elegida === opcion ? null : opcion;
    setElegidas((e) => ({ ...e, [p.pregunta_id]: nueva }));
    setError(null);
    const r = await responder(intentoId, p.pregunta_id, nueva);
    if (!r.ok) {
      setError(r.mensaje);
      if (!simulacro) setElegidas((e) => ({ ...e, [p.pregunta_id]: null }));
      return;
    }
    if (r.correcta !== null) setCorrecciones((c) => ({ ...c, [p.pregunta_id]: { correcta: r.correcta!, explicacion: r.explicacion } }));
  }

  const ir = (i: number) => { setActual(Math.min(preguntas.length - 1, Math.max(0, i))); setConfirmar(false); };

  // Teclado: A-D o 1-4 para responder, flechas o Intro para moverse
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      const k = e.key.toUpperCase();
      const i = "ABCD".indexOf(k) >= 0 ? "ABCD".indexOf(k) : "1234".indexOf(k);
      if (i >= 0 && i < p.opciones.length) elegir(i);
      else if (e.key === "ArrowRight" || (e.key === "Enter" && (simulacro || correccion))) ir(actual + 1);
      else if (e.key === "ArrowLeft") ir(actual - 1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const clase = (i: number) => {
    if (!correccion) return i === elegida ? "opcion-test elegida" : "opcion-test";
    if (i === correccion.correcta) return "opcion-test bien";
    return i === elegida ? "opcion-test mal" : "opcion-test";
  };
  const ultima = actual === preguntas.length - 1;

  return (
    <div className="test">
      <div className="row">
        <div>
          <p className="sub">{TIPOS[tipo]}{p.tema && ` · ${p.tema}`}</p>
          <h1>Pregunta {actual + 1} de {preguntas.length}</h1>
        </div>
        {quedan !== null && <span className={`reloj ${quedan < 300 ? "poco" : ""}`} role="timer">{reloj(quedan)}</span>}
      </div>

      <section className="panel">
        <p className="enunciado">{p.enunciado}</p>
        {p.imagen && <ImagenPregunta nombre={p.imagen} />}
        <div className="opciones-test">
          {p.opciones.map((o, i) => (
            <button key={i} type="button" className={clase(i)} onClick={() => elegir(i)} aria-pressed={i === elegida} disabled={terminando}>
              <b>{LETRAS[i]}</b>
              <span>{o}</span>
            </button>
          ))}
        </div>
        {correccion && (
          <p className={`aviso ${elegida === correccion.correcta ? "ok" : "error"}`}>
            {elegida === correccion.correcta ? "¡Correcta!" : `Fallo. La buena es la ${LETRAS[correccion.correcta]}.`}
            {correccion.explicacion && <> {correccion.explicacion}</>}
          </p>
        )}
        {simulacro && elegida !== null && <p className="sub">Pulsa otra vez tu respuesta para dejarla en blanco.</p>}
        {error && <p className="aviso error">{error}</p>}
      </section>

      <div className="row">
        <button type="button" className="btn ghost" onClick={() => ir(actual - 1)} disabled={actual === 0}>Anterior</button>
        {!ultima && (simulacro || correccion) && <button type="button" className="btn" onClick={() => ir(actual + 1)}>Siguiente</button>}
        {!ultima && !simulacro && !correccion && <button type="button" className="btn ghost" onClick={() => ir(actual + 1)}>Saltar</button>}
      </div>

      {simulacro && (
        <nav className="mapa" aria-label="Preguntas">
          {preguntas.map((q, i) => (
            <button key={q.pregunta_id} type="button" onClick={() => ir(i)} aria-current={i === actual} className={elegidas[q.pregunta_id] !== null ? "hecha" : undefined}>
              {i + 1}
            </button>
          ))}
        </nav>
      )}

      <section className="panel">
        <p className="sub">{respondidas} de {preguntas.length} respondidas.</p>
        {confirmar || respondidas === preguntas.length ? (
          <div className="row" style={{ justifyContent: "flex-start" }}>
            {respondidas < preguntas.length && <span>Te quedan {preguntas.length - respondidas} sin responder. ¿Terminar ya?</span>}
            <button type="button" className="btn" onClick={terminar} disabled={terminando}>{terminando ? "Corrigiendo…" : "Terminar y ver la nota"}</button>
            {confirmar && <button type="button" className="btn ghost" onClick={() => setConfirmar(false)}>Seguir</button>}
          </div>
        ) : (
          <div className="row" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="btn ghost" onClick={() => setConfirmar(true)}>Terminar</button>
            <span className="sub">Puedes salir y seguir luego desde Teoría: tus respuestas se guardan.</span>
          </div>
        )}
      </section>
    </div>
  );
}
