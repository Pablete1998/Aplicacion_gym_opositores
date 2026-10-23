import Link from "next/link";
import { notFound } from "next/navigation";
import { Ficha } from "@/components/Ficha";
import { cargarFicha, exigirRol } from "@/lib/datos";
import { hayClaveAdmin } from "@/lib/supabase/admin";
import { AccesoAlumno } from "../../personal/Formularios";

export default async function FichaAlumno({ params, searchParams }: PageProps<"/alumnos/[id]">) {
  const perfil = await exigirRol("direccion", "preparador");
  const { id } = await params;
  const { prueba } = await searchParams;
  const ficha = await cargarFicha(id);
  if (!ficha) notFound();
  return (
    <>
      <div className="row">
        <Link href="/alumnos" className="sub">← Alumnos</Link>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          {perfil.rol === "direccion" && <Link href={`/alumnos/${id}/editar`} className="btn ghost">Editar</Link>}
          <Link href={`/alumnos/${id}/informe`} className="btn ghost">Informe mensual</Link>
          <Link href={`/registrar?alumno=${id}`} className="btn">Registrar marca</Link>
        </div>
      </div>
      {perfil.rol === "direccion" && !ficha.tieneAcceso && hayClaveAdmin() && (
        <section className="panel">
          <h2>Dar acceso a la app</h2>
          <p className="sub">Con su acceso verá su evolución y su QR de entrada desde el móvil.</p>
          <AccesoAlumno alumnoId={ficha.id} nombre={ficha.nombreCompleto} />
        </section>
      )}
      <Ficha ficha={ficha} pruebaId={typeof prueba === "string" ? prueba : undefined} base={`/alumnos/${id}`} />
    </>
  );
}
