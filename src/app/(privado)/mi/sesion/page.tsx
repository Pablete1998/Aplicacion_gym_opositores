import Link from "next/link";
import { Sesiones } from "@/components/Sesiones";
import { exigirRol, miAlumnoId } from "@/lib/datos";
import { formatoEjercicio, hoyEnEspana, SENSACIONES } from "@/lib/sesiones";
import { createClient } from "@/lib/supabase/server";
import { Apuntar, Empezar } from "../Sesion";

export default async function SesionDeHoy({ searchParams }: PageProps<"/mi/sesion">) {
  await exigirRol("alumno");
  const { terminada } = await searchParams;
  const id = await miAlumnoId();
  if (!id) return <p className="sub">Tu usuario aún no está vinculado a una ficha de alumno. Avisa en recepción.</p>;
  const supabase = await createClient();
  const [{ data: alumno }, { data: plan }] = await Promise.all([
    supabase.from("alumnos").select("cuota_al_dia, grupo_id").eq("id", id).single(),
    // El alumno solo ve los planes de su grupo (RLS)
    supabase
      .from("planes")
      .select("id, titulo, notas, plan_ejercicios(id, nombre, pauta, unidad, orden)")
      .eq("fecha", hoyEnEspana())
      .maybeSingle(),
  ]);
  const { data: sesion } = plan
    ? await supabase.from("sesiones").select("id, terminada_en, sensacion, sesion_marcas(ejercicio_id, valor, hecho, resultado_id)").eq("plan_id", plan.id).eq("alumno_id", id).maybeSingle()
    : { data: null };
  const ejercicios = [...(plan?.plan_ejercicios ?? [])].sort((a, b) => a.orden - b.orden);
  const apuntado = new Map((sesion?.sesion_marcas ?? []).map((m) => [m.ejercicio_id, m]));

  return (
    <>
      <div>
        <Link href="/mi" className="sub">← Mi evolución</Link>
        <h1>Sesión de hoy</h1>
      </div>

      {terminada && <p className="aviso ok">¡Sesión terminada! Buen trabajo 💪</p>}

      <section className="panel sesion-hoy">
        {!alumno?.grupo_id ? (
          <p className="sub">Aún no tienes grupo. Cuando te asignen uno verás aquí la sesión del día.</p>
        ) : !plan ? (
          <p className="sub">Hoy tu grupo no tiene sesión planificada.</p>
        ) : (
          <>
            <h2>{plan.titulo}</h2>
            {plan.notas && <p className="sub">{plan.notas}</p>}
            {!sesion ? (
              <>
                <ol className="ejercicios-hoy">
                  {ejercicios.map((e) => (
                    <li key={e.id}><div><strong>{e.nombre}</strong>{e.pauta && <div className="sub">{e.pauta}</div>}</div></li>
                  ))}
                </ol>
                <Empezar plan={plan.id} bloqueo={alumno.cuota_al_dia ? null : "Tienes la cuota pendiente. Pásate por recepción y podrás empezar la sesión."} />
              </>
            ) : sesion.terminada_en ? (
              <p>Ya la has terminado{sesion.sensacion ? ` · ${SENSACIONES[sesion.sensacion]}` : ""}. Mañana más.</p>
            ) : (
              <Apuntar
                sesion={sesion.id}
                ejercicios={ejercicios.map((e) => {
                  const m = apuntado.get(e.id);
                  return { id: e.id, nombre: e.nombre, pauta: e.pauta, unidad: e.unidad, valor: m?.valor == null ? "" : e.unidad === "seg" && Number(m.valor) >= 60 ? formatoEjercicio("seg", Number(m.valor)) : String(m.valor).replace(".", ","), hecho: Boolean(m), oficial: Boolean(m?.resultado_id) };
                })}
              />
            )}
          </>
        )}
      </section>

      <Sesiones alumnoId={id} titulo="Tus sesiones" />
    </>
  );
}
