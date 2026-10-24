import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { COMUN } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";
import { SelectorTema, type TemaAlumno } from "../SelectorTema";
import { Repaso, type TarjetaHoy } from "./Repaso";

const NUEVAS = 20;

export default async function RepasoDiario({ searchParams }: PageProps<"/teoria/repaso">) {
  await exigirRol("alumno");
  const sp = await searchParams;
  const comun = sp.tema === COMUN;
  const tema = typeof sp.tema === "string" && esUuid(sp.tema) ? sp.tema : null;
  const nuevas = sp.mas === "1" ? NUEVAS * 2 : NUEVAS;
  const supabase = await createClient();
  const [{ data, error }, { data: temas }] = await Promise.all([
    supabase.rpc("repaso_de_hoy", { p_nuevas: nuevas, p_tema: tema, ...(comun ? { p_comun: true } : {}) }),
    supabase.rpc("mis_temas"),
  ]);
  const tarjetas = ((data ?? []) as TarjetaHoy[]).map((t) => ({ ...t, facilidad: Number(t.facilidad), intervalo: Number(t.intervalo) }));
  const listaTemas = (temas ?? []) as TemaAlumno[];

  return (
    <>
      <div>
        <p className="sub"><Link href="/teoria">← Teoría</Link></p>
        <h1>Repaso diario</h1>
        <p className="sub">
          Lee la pregunta, piensa la respuesta y dale la vuelta. Luego di cómo te ha costado: lo que te cuesta vuelve pronto
          y lo que dominas, cada vez más tarde. Cada día entran {NUEVAS} preguntas nuevas.
        </p>
      </div>
      {error && <p className="aviso error">El repaso aún no está preparado. Avisa a la academia.</p>}
      {listaTemas.some((t) => t.tema_id) && (
        <form className="campos" action="/teoria/repaso">
          <label>
            Tema
            <SelectorTema temas={listaTemas} defaultValue={comun ? COMUN : (tema ?? "")} />
          </label>
          <button className="btn ghost">Cambiar</button>
        </form>
      )}
      <Repaso key={`${comun ? COMUN : tema}-${nuevas}`} tarjetas={tarjetas} masNuevas={sp.mas !== "1" ? `/teoria/repaso?${new URLSearchParams({ mas: "1", ...(tema ? { tema } : comun ? { tema: COMUN } : {}) })}` : null} />
    </>
  );
}
