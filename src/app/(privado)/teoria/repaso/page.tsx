import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { etiquetaTema } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";
import { esUuid } from "@/lib/texto";
import { Repaso, type TarjetaHoy } from "./Repaso";

const NUEVAS = 20;

export default async function RepasoDiario({ searchParams }: PageProps<"/teoria/repaso">) {
  await exigirRol("alumno");
  const sp = await searchParams;
  const tema = typeof sp.tema === "string" && esUuid(sp.tema) ? sp.tema : null;
  const nuevas = sp.mas === "1" ? NUEVAS * 2 : NUEVAS;
  const supabase = await createClient();
  const [{ data, error }, { data: temas }] = await Promise.all([
    supabase.rpc("repaso_de_hoy", { p_nuevas: nuevas, p_tema: tema }),
    supabase.rpc("mis_temas"),
  ]);
  const tarjetas = ((data ?? []) as TarjetaHoy[]).map((t) => ({ ...t, facilidad: Number(t.facilidad), intervalo: Number(t.intervalo) }));
  const conTema = ((temas ?? []) as { tema_id: string | null; numero: number | null; tema: string | null }[]).filter((t) => t.tema_id);

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
      {conTema.length > 0 && (
        <form className="campos" action="/teoria/repaso">
          <label>
            Tema
            <select name="tema" defaultValue={tema ?? ""}>
              <option value="">Todos los temas</option>
              {conTema.map((t) => <option key={t.tema_id} value={t.tema_id!}>{etiquetaTema(t.numero, t.tema!)}</option>)}
            </select>
          </label>
          <button className="btn ghost">Cambiar</button>
        </form>
      )}
      <Repaso key={`${tema}-${nuevas}`} tarjetas={tarjetas} masNuevas={sp.mas !== "1" ? `/teoria/repaso?${new URLSearchParams({ mas: "1", ...(tema ? { tema } : {}) })}` : null} />
    </>
  );
}
