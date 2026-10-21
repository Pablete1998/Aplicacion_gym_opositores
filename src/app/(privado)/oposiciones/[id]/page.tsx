import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { Baremo, DatosOposicion, type FilaBaremo } from "../Formularios";

const SEXO = { H: "Hombres", M: "Mujeres" } as const;

// Marca tal y como se escribe en el formulario: 9:25 para tiempos largos, coma decimal
function editable(unidad: string, valor: number | null): string {
  if (valor === null) return "";
  if (unidad === "segundos" && valor >= 60) {
    const min = Math.floor(valor / 60);
    return `${min}:${String(+(valor - min * 60).toFixed(1)).padStart(2, "0")}`;
  }
  return String(valor).replace(".", ",");
}

const UNIDAD: Record<string, string> = {
  segundos: "segundos; menos es mejor",
  repeticiones: "repeticiones",
  centimetros: "centímetros",
  metros: "metros",
  nota: "nota de 0 a 10",
};

export default async function Oposicion({ params }: PageProps<"/oposiciones/[id]">) {
  await exigirRol("direccion");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: o }, { data: pruebas }] = await Promise.all([
    supabase.from("oposiciones").select("id, nombre, cuerpo, fecha_examen, baremo_fuente").eq("id", id).maybeSingle(),
    supabase
      .from("pruebas")
      .select("id, nombre, tipo, unidad, mayor_es_mejor, sexo, orden, baremos(id, sexo, edad_min, edad_max, marca_minima, marca_objetivo, puntos)")
      .eq("oposicion_id", id)
      .order("orden"),
  ]);
  if (!o) notFound();

  return (
    <>
      <div>
        <p className="sub"><Link href="/oposiciones">Oposiciones</Link></p>
        <h1>{o.nombre}</h1>
        {o.cuerpo && <p className="sub">{o.cuerpo}</p>}
      </div>

      <section className="panel">
        <h2>Convocatoria</h2>
        <DatosOposicion id={o.id} fecha={o.fecha_examen} fuente={o.baremo_fuente} />
      </section>

      {(pruebas ?? []).map((p) => {
        const filas = [...(p.baremos ?? [])].sort((a, b) => (a.sexo ?? "").localeCompare(b.sexo ?? "") || a.edad_min - b.edad_min);
        const conPuntos = filas.some((f) => f.puntos);
        const unidad = p.unidad === "segundos" && p.mayor_es_mejor ? "segundos; más es mejor" : UNIDAD[p.unidad];
        return (
          <section key={p.id} className="panel">
            <div>
              <h2>{p.nombre}</h2>
              <p className="sub">
                {p.tipo === "teorica" ? "Teórica" : "Física"} · {unidad}
                {p.sexo && ` · solo ${SEXO[p.sexo as "H" | "M"].toLowerCase()}`}
              </p>
            </div>
            {filas.map((f) => {
              const fila: FilaBaremo = {
                id: f.id,
                sexo: f.sexo,
                edad_min: f.edad_min,
                edad_max: f.edad_max,
                minima: editable(p.unidad, Number(f.marca_minima)),
                objetivo: editable(p.unidad, f.marca_objetivo === null ? null : Number(f.marca_objetivo)),
                puntos: (f.puntos as number[] | null)?.map((v) => editable(p.unidad, Number(v))).join("; ") ?? "",
              };
              return <Baremo key={f.id} fila={fila} pruebaId={p.id} oposicionId={o.id} conPuntos={conPuntos} />;
            })}
            <details>
              <summary>Añadir otra fila (otro sexo o tramo de edad)</summary>
              <Baremo
                fila={{ id: null, sexo: (p.sexo as "H" | "M" | null) ?? null, edad_min: 0, edad_max: 120, minima: "", objetivo: "", puntos: "" }}
                pruebaId={p.id}
                oposicionId={o.id}
                conPuntos={conPuntos}
              />
            </details>
          </section>
        );
      })}
    </>
  );
}
