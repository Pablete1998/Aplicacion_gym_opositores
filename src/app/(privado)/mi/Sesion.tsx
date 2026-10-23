"use client";

import { useActionState, useState } from "react";
import { SENSACIONES, UNIDADES_EJERCICIO, type UnidadEjercicio } from "@/lib/sesiones";
import { empezarSesion, guardarSesion } from "./actions";

export function Empezar({ plan, bloqueo }: { plan: string; bloqueo: string | null }) {
  const [estado, accion, enviando] = useActionState(empezarSesion, null);
  if (bloqueo) return <p className="aviso error">{bloqueo}</p>;
  return (
    <form action={accion} className="empezar">
      <input type="hidden" name="plan" value={plan} />
      <button className="btn" disabled={enviando}>{enviando ? "Empezando…" : "Empezar sesión"}</button>
      {estado && !estado.ok && <p className="aviso error">{estado.mensaje}</p>}
    </form>
  );
}

// oficial: el preparador ya la ha validado como testigo y no se puede cambiar
export interface EjercicioSesion { id: string; nombre: string; pauta: string | null; unidad: string | null; valor: string; hecho: boolean; oficial: boolean }

export function Apuntar({ sesion, ejercicios }: { sesion: string; ejercicios: EjercicioSesion[] }) {
  const [estado, accion, enviando] = useActionState(guardarSesion, null);
  const [terminando, setTerminando] = useState(false);
  return (
    <form action={accion} className="apuntar">
      <input type="hidden" name="sesion" value={sesion} />
      <ol className="ejercicios-hoy">
        {ejercicios.map((e) => (
          <li key={e.id}>
            <input type="hidden" name="ejercicio" value={e.id} />
            <div>
              <strong>{e.nombre}</strong>
              {e.pauta && <div className="sub">{e.pauta}</div>}
            </div>
            {e.oficial ? (
              <span className="con-unidad"><span className="num">{e.valor} {e.unidad}</span> <span className="pill p-objetivo">✓ Validada</span></span>
            ) : e.unidad ? (
              <label>
                <span className="visually-hidden">{e.nombre} en {UNIDADES_EJERCICIO[e.unidad as UnidadEjercicio] ?? e.unidad}</span>
                <span className="con-unidad">
                  <input name={`v_${e.id}`} defaultValue={e.valor} inputMode="decimal" placeholder="—" />
                  <span>{e.unidad === "seg" ? "s / m:ss" : e.unidad}</span>
                </span>
              </label>
            ) : (
              <label className="casilla">
                <input type="checkbox" name={`h_${e.id}`} defaultChecked={e.hecho} /> Hecho
              </label>
            )}
          </li>
        ))}
      </ol>
      {terminando && (
        <fieldset className="sensacion">
          <legend>¿Cómo te has sentido?</legend>
          {Object.entries(SENSACIONES).map(([valor, texto]) => (
            <label key={valor}>
              <input type="radio" name="sensacion" value={valor} required /> {texto}
            </label>
          ))}
          <label>
            Nota para tu preparador (opcional)
            <input name="notas" placeholder="Ej. Me molesta la rodilla" />
          </label>
        </fieldset>
      )}
      <div className="row" style={{ justifyContent: "flex-start" }}>
        {terminando ? (
          <>
            <button className="btn" name="terminar" value="si" disabled={enviando}>{enviando ? "Guardando…" : "Terminar sesión"}</button>
            <button type="button" className="btn ghost" onClick={() => setTerminando(false)}>Aún no</button>
          </>
        ) : (
          <>
            <button className="btn ghost" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</button>
            <button type="button" className="btn" onClick={() => setTerminando(true)}>He terminado</button>
          </>
        )}
      </div>
      {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
    </form>
  );
}
