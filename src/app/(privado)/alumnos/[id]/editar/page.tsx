import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { actualizarAlumno } from "../../actions";
import { cargarCatalogo } from "../../catalogo";
import { FormularioAlumno, type ValoresAlumno } from "../../FormularioAlumno";

export default async function EditarAlumno({ params }: PageProps<"/alumnos/[id]/editar">) {
  await exigirRol("direccion");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: alumno }, catalogo] = await Promise.all([
    supabase
      .from("alumnos")
      .select("nombre, apellidos, sexo, fecha_nacimiento, oposicion_id, grupo_id, cuota_al_dia, activo, nif, domicilio, cuota_importe")
      .eq("id", id)
      .maybeSingle(),
    cargarCatalogo(),
  ]);
  if (!alumno) notFound();

  return (
    <>
      <Link href={`/alumnos/${id}`} className="sub">← Ficha del alumno</Link>
      <div>
        <h1>Editar {alumno.nombre} {alumno.apellidos}</h1>
      </div>
      <section className="panel">
        <FormularioAlumno accion={actualizarAlumno.bind(null, id)} catalogo={catalogo} valores={alumno as ValoresAlumno} esAlta={false} />
      </section>
    </>
  );
}
