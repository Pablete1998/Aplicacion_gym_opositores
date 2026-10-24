import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";

interface Rama {
  titulo: string;
  texto: string;
  href?: string; // sin enlace = aún no está
  dato?: string;
}

// Portada de la parte teórica: de aquí salen todas las ramas, las que ya funcionan y las que vienen
export default async function Teoria() {
  const perfil = await exigirRol("direccion", "preparador", "alumno");
  const supabase = await createClient();
  let ramas: Rama[];

  if (perfil.rol === "alumno") {
    const [{ data }, { data: hoy }] = await Promise.all([
      supabase.rpc("mis_temas"),
      supabase.rpc("repaso_de_hoy", { p_nuevas: 20, p_tema: null }),
    ]);
    const paraHoy = (hoy ?? []).length;
    const temas = (data ?? []) as { en_banco: number; pendientes: number }[];
    const enBanco = temas.reduce((a, t) => a + Number(t.en_banco), 0);
    const pendientes = temas.reduce((a, t) => a + Number(t.pendientes), 0);
    ramas = [
      {
        titulo: "Tests y simulacros",
        texto: "Practica por temas, haz simulacros con tiempo como en el examen y repasa lo que fallaste.",
        href: "/teoria/tests",
        dato: enBanco ? `${enBanco} preguntas${pendientes ? ` · ${pendientes} por repasar` : ""}` : undefined,
      },
      {
        titulo: "Repaso diario",
        texto: "Tarjetas que vuelven justo antes de que se te olviden, como en Anki. Un rato cada día.",
        href: "/teoria/repaso",
        dato: paraHoy ? `${paraHoy} para hoy` : "Al día",
      },
      { titulo: "Psicotécnicos", texto: "Series, razonamiento y aptitudes con tiempo." },
      { titulo: "Ortografía", texto: "Las reglas y palabras que más caen." },
      { titulo: "Plan de estudio", texto: "Qué te toca cada día hasta el examen." },
      { titulo: "Temario y BOE", texto: "Los temas de tu oposición y avisos cuando cambie una ley." },
    ];
  } else {
    const { count } = await supabase.from("preguntas").select("id", { count: "exact", head: true });
    ramas = [
      {
        titulo: "Banco de preguntas",
        texto: "Las preguntas tipo test de cada oposición por temas. Escríbelas una a una o pégalas desde Excel.",
        href: "/teoria/banco",
        dato: count ? `${count} preguntas` : undefined,
      },
      {
        titulo: "Resultados de los alumnos",
        texto: "Los tests de cada alumno, con su nota, están en su ficha. El repaso diario tipo Anki lo hacen con las preguntas del banco.",
        href: "/alumnos",
      },
      { titulo: "Psicotécnicos y ortografía", texto: "Bancos propios para estas pruebas." },
      { titulo: "Plan de estudio y nota estimada", texto: "Qué toca cada día y cómo va cada alumno frente al examen." },
      { titulo: "Avisos del BOE", texto: "Aviso cuando salga una convocatoria o cambie una ley del temario." },
    ];
  }

  return (
    <>
      <div>
        <h1>Teoría</h1>
        <p className="sub">Todo lo que no es pista: tests, repaso y temario.</p>
      </div>
      <div className="ramas">
        {ramas.map((r) =>
          r.href ? (
            <Link key={r.titulo} href={r.href} className="panel rama">
              <h2>{r.titulo}</h2>
              <p className="sub">{r.texto}</p>
              {r.dato && <span className="pill">{r.dato}</span>}
            </Link>
          ) : (
            <div key={r.titulo} className="panel rama pronto">
              <h2>{r.titulo}</h2>
              <p className="sub">{r.texto}</p>
              <span className="pill">Pronto</span>
            </div>
          ),
        )}
      </div>
    </>
  );
}
