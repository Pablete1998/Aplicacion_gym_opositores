import Link from "next/link";
import { notFound } from "next/navigation";
import { Ficha } from "@/components/Ficha";
import { cargarFicha, exigirRol } from "@/lib/datos";

export default async function FichaAlumno({ params, searchParams }: PageProps<"/alumnos/[id]">) {
  await exigirRol("direccion", "preparador");
  const { id } = await params;
  const { prueba } = await searchParams;
  const ficha = await cargarFicha(id);
  if (!ficha) notFound();
  return (
    <>
      <div className="row">
        <Link href="/alumnos" className="sub">← Alumnos</Link>
        <Link href={`/registrar?alumno=${id}`} className="btn">Registrar marca</Link>
      </div>
      <Ficha ficha={ficha} pruebaId={typeof prueba === "string" ? prueba : undefined} base={`/alumnos/${id}`} />
    </>
  );
}
