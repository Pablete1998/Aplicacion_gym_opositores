import Link from "next/link";
import { notFound } from "next/navigation";
import { miAlumnoId, perfilActual } from "@/lib/datos";
import { ImagenPregunta } from "@/components/ImagenPregunta";
import { LETRAS } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { formatoNota, reloj, restaPorFallo, TIPOS, type TipoTest } from "@/lib/tests";
import { esUuid } from "@/lib/texto";
import { Test, type PreguntaTest } from "./Test";

export default async function Intento({ params }: PageProps<"/teoria/tests/[id]">) {
  const perfil = await perfilActual();
  const { id } = await params;
  if (!esUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: intento }, { data: preguntas }, yo] = await Promise.all([
    supabase.from("intentos").select("id, alumno_id, tipo, total, aciertos, fallos, blancos, nota, limite_segundos, empezado_en, terminado_en, alumnos(nombre, apellidos)").eq("id", id).maybeSingle(),
    supabase.rpc("preguntas_de_intento", { p_intento: id }),
    miAlumnoId(),
  ]);
  if (!intento || !preguntas) notFound();
  const lista = preguntas as PreguntaTest[];
  const tipo = intento.tipo as TipoTest;
  const esMio = intento.alumno_id === yo;

  if (!intento.terminado_en && esMio) {
    const limite = intento.limite_segundos ? new Date(intento.empezado_en).getTime() + intento.limite_segundos * 1000 : null;
    return <Test intentoId={id} tipo={tipo} limite={limite} preguntas={lista} />;
  }

  const alumno = Array.isArray(intento.alumnos) ? intento.alumnos[0] : intento.alumnos;
  const duracion = intento.terminado_en ? (new Date(intento.terminado_en).getTime() - new Date(intento.empezado_en).getTime()) / 1000 : null;
  const volver = perfil.rol === "alumno" ? "/teoria/tests" : `/alumnos/${intento.alumno_id}`;
  const resta = lista.length ? restaPorFallo(lista[0].opciones.length) : 0;

  return (
    <>
      <div>
        <p className="sub"><Link href={volver}>← {perfil.rol === "alumno" ? "Tests" : `${alumno?.nombre} ${alumno?.apellidos}`}</Link></p>
        <h1>{TIPOS[tipo]}{!intento.terminado_en && " (a medias)"}</h1>
        {!esMio && alumno && <p className="sub">{alumno.nombre} {alumno.apellidos}</p>}
      </div>

      {intento.terminado_en && (
        <div className="cifras">
          <div className="dato"><span className="v">{formatoNota(intento.nota)}</span> de nota</div>
          <div className="dato"><span className="v">{intento.aciertos}</span> aciertos</div>
          <div className="dato"><span className="v">{intento.fallos}</span> fallos</div>
          <div className="dato"><span className="v">{intento.blancos}</span> en blanco</div>
          {duracion !== null && <div className="dato"><span className="v">{reloj(duracion)}</span> de tiempo</div>}
        </div>
      )}
      {intento.terminado_en && (
        <p className="sub">
          Nota sobre 10. Cada fallo resta {resta === 0.5 ? "medio acierto" : resta === 1 ? "un acierto" : `un ${resta === 1 / 3 ? "tercio" : "cuarto"} de acierto`} y las preguntas en blanco no suman ni restan.
          {esMio && intento.fallos! + intento.blancos! > 0 && " Lo que fallaste o dejaste en blanco te espera en «Repasar fallos»."}
        </p>
      )}

      <section className="panel">
        <ol className="preguntas revision">
          {lista.map((p) => {
            const acertada = p.elegida !== null && p.elegida === p.correcta;
            return (
              <li key={p.pregunta_id}>
                <div className="row">
                  <strong>{p.enunciado}</strong>
                  <span className={`pill ${p.elegida === null ? "" : acertada ? "p-objetivo" : "p-no_apto"}`}>
                    {p.elegida === null ? "En blanco" : acertada ? "Acierto" : "Fallo"}
                  </span>
                </div>
                {p.imagen && <ImagenPregunta nombre={p.imagen} />}
                <ul>
                  {p.opciones.map((o, i) => (
                    <li key={i} className={i === p.correcta ? "correcta" : i === p.elegida ? "elegida-mal" : undefined}>
                      <b>{LETRAS[i]})</b> {o}
                      {i === p.elegida && <span className="sub"> ← tu respuesta</span>}
                    </li>
                  ))}
                </ul>
                {p.explicacion && <p className="sub">{p.explicacion}</p>}
                {p.tema && <p className="sub">{p.tema}</p>}
              </li>
            );
          })}
        </ol>
      </section>
      {esMio && (
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <Link className="btn" href="/teoria/tests">Hacer otro</Link>
        </div>
      )}
    </>
  );
}
