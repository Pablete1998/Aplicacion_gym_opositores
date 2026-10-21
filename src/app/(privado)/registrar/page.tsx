import { exigirRol, uno } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { Formulario, type Opcion } from "./Formulario";

export default async function Registrar({ searchParams }: PageProps<"/registrar">) {
  await exigirRol("direccion", "preparador");
  const { alumno } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("alumnos")
    .select("id, nombre, apellidos, sexo, oposiciones(pruebas(id, nombre, unidad, orden, sexo))")
    .eq("activo", true)
    .order("apellidos");

  const alumnos: Opcion[] = (data ?? []).map((a) => ({
    id: a.id,
    nombre: `${a.apellidos}, ${a.nombre}`,
    pruebas: (uno(a.oposiciones)?.pruebas ?? [])
      .filter((p) => p.sexo === null || p.sexo === a.sexo)
      .sort((x, y) => x.orden - y.orden),
  }));

  return (
    <>
      <div>
        <h1>Registrar marca</h1>
        <p className="sub">Desde el móvil, en la pista o en la piscina.</p>
      </div>
      <section className="panel">
        {alumnos.length ? (
          <Formulario alumnos={alumnos} inicial={typeof alumno === "string" ? alumno : undefined} hoy={new Date().toISOString().slice(0, 10)} />
        ) : (
          <p className="sub">No tienes alumnos asignados.</p>
        )}
      </section>
    </>
  );
}
