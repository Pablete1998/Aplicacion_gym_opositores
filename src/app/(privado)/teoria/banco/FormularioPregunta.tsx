"use client";

import { useActionState } from "react";
import { LETRAS } from "@/lib/preguntas";
import { borrarPregunta, guardarPregunta } from "./actions";

type Valores = Record<"id" | "oposicion_id" | "tema_id" | "enunciado" | "a" | "b" | "c" | "d" | "correcta" | "explicacion" | "activa", string>;

export function FormularioPregunta({ temas, inicial }: { temas: { id: string; nombre: string }[]; inicial: Valores }) {
  const [estado, accion, guardando] = useActionState(guardarPregunta, null);
  // Tras guardar, React vacía el formulario: se vuelve a montar con lo que toque (lo escrito si hubo error)
  const v = { ...inicial, ...(estado && !inicial.id ? { enunciado: "", a: "", b: "", c: "", d: "", correcta: "", explicacion: "" } : {}), ...estado?.valores };
  const nueva = !inicial.id;

  return (
    <>
      <form key={estado?.n ?? 0} action={accion} className="pregunta-form">
        <input type="hidden" name="id" value={inicial.id} />
        <input type="hidden" name="oposicion_id" value={inicial.oposicion_id} />
        <label>
          Tema
          <select name="tema_id" defaultValue={v.tema_id}>
            <option value="">Sin tema</option>
            {temas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </label>
        <label>
          Pregunta
          <textarea name="enunciado" rows={3} required maxLength={2000} defaultValue={v.enunciado} autoFocus={nueva} />
        </label>
        <fieldset className="opciones">
          <legend className="sub">Respuestas (marca la correcta; la D puede quedar vacía si el examen tiene tres)</legend>
          {(["a", "b", "c", "d"] as const).map((campo, i) => (
            <div key={campo} className="opcion">
              <input type="radio" name="correcta" value={i} defaultChecked={v.correcta === String(i)} aria-label={`La ${LETRAS[i]} es la correcta`} />
              <b>{LETRAS[i]}</b>
              <input name={campo} defaultValue={v[campo]} required={i < 2} maxLength={500} aria-label={`Respuesta ${LETRAS[i]}`} />
            </div>
          ))}
        </fieldset>
        <label>
          Explicación (opcional: por qué es esa, artículo de la ley…)
          <textarea name="explicacion" rows={2} maxLength={2000} defaultValue={v.explicacion} />
        </label>
        {!nueva && (
          <label className="casilla">
            <input type="checkbox" name="activa" defaultChecked={v.activa === "on"} />
            Activa (si la quitas, los alumnos dejan de verla pero no se borra)
          </label>
        )}
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="btn" disabled={guardando}>{nueva ? "Añadir pregunta" : "Guardar"}</button>
        </div>
        {estado && <p className={`aviso ${estado.ok ? "ok" : "error"}`}>{estado.mensaje}</p>}
      </form>
      {!nueva && (
        <form action={borrarPregunta}>
          <input type="hidden" name="id" value={inicial.id} />
          <input type="hidden" name="oposicion_id" value={inicial.oposicion_id} />
          <input type="hidden" name="tema_id" value={inicial.tema_id} />
          <button className="btn ghost">Borrar la pregunta</button>
        </form>
      )}
    </>
  );
}
