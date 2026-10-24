import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { enlaceBoe, idsBoe } from "@/lib/temario";
import { leerTema } from "@/lib/temario-archivos";
import { clave, esDeAlumno, nombreOposicion, oposicionDelAlumno, revisiones, vigente } from "../../datos";
import { AccionesTema } from "./AccionesTema";

const fecha = (f: string) => new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export default async function TemaTemario({ params }: PageProps<"/teoria/temario/[carpeta]/[tema]">) {
  const perfil = await exigirRol("direccion", "preparador", "alumno");
  const { carpeta, tema: n } = await params;
  const leido = await leerTema(carpeta, Number(n));
  if (!leido) notFound();
  const { tema, html } = leido;
  const alumno = perfil.rol === "alumno";
  const [revs, miOposicion] = await Promise.all([revisiones(), alumno ? oposicionDelAlumno() : null]);
  const revisado = vigente(tema, revs);
  if (alumno && !(revisado && esDeAlumno(tema, miOposicion))) notFound();
  const r = revs.get(clave(tema));

  // El tema del banco con el mismo número, para practicar con sus preguntas
  const supabase = await createClient();
  let consulta = supabase.from("temas").select("id").eq("numero", tema.tema);
  if (tema.oposicion === COMUN) consulta = consulta.is("oposicion_id", null);
  else {
    const { data: o } = await supabase.from("oposiciones").select("id").eq("nombre", tema.oposicion).maybeSingle();
    consulta = consulta.eq("oposicion_id", o?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  const { data: enBanco } = await consulta.limit(1).maybeSingle();

  return (
    <>
      <div>
        <p className="sub"><Link href={alumno ? "/teoria/temario" : `/teoria/temario?oposicion=${encodeURIComponent(tema.oposicion)}`}>← Temario</Link></p>
        <p className="sub">{nombreOposicion(tema.oposicion)}{tema.tema ? ` · Tema ${tema.tema}` : ""}</p>
        <h1>{tema.titulo}</h1>
      </div>

      {!alumno && (
        <section className="panel">
          <p className={`aviso ${revisado ? "ok" : "medias"}`}>
            {revisado
              ? `Revisado${r?.quien ? ` por ${r.quien}` : ""} el ${fecha(r!.revisado_en)}. Lo ven los alumnos.`
              : r
                ? "El tema ha cambiado desde que se revisó. Los alumnos no lo ven hasta que alguien lo vuelva a revisar."
                : "Pendiente de revisar. Léelo entero y compara con el BOE antes de darlo por bueno: los alumnos no lo ven hasta entonces."}
          </p>
          <AccionesTema carpeta={tema.carpeta} tema={tema.tema} revisado={revisado} preguntas={tema.preguntas} />
        </section>
      )}

      {alumno && enBanco && (
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <Link className="btn" href={`/teoria/tests?tema=${enBanco.id}`}>Practicar este tema</Link>
          <Link className="btn ghost" href={`/teoria/repaso?tema=${enBanco.id}`}>Repaso diario de este tema</Link>
        </div>
      )}

      <article className="panel apuntes" dangerouslySetInnerHTML={{ __html: html }} />

      <section className="panel">
        <h2>Fuentes</h2>
        <ul className="fuentes">
          {tema.convocatoria && (
            <li>Temario: convocatoria <a href={`https://www.boe.es/diario_boe/txt.php?id=${tema.convocatoria}`} target="_blank" rel="noreferrer">{tema.convocatoria}</a></li>
          )}
          {tema.fuentes.map((f) => {
            const id = idsBoe(f)[0];
            return <li key={f}>{id ? <><a href={enlaceBoe(id)} target="_blank" rel="noreferrer">{id}</a>{f.replace(id, "")}</> : f}</li>;
          })}
        </ul>
        <p className="sub">Texto actualizado el {fecha(tema.actualizado)}. Ante cualquier duda manda el BOE.</p>
      </section>
    </>
  );
}
