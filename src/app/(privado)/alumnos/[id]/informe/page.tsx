import { notFound } from "next/navigation";
import { Informe } from "@/components/Informe";
import { cargarFicha, diasDeAsistencia, exigirRol } from "@/lib/datos";
import { mesDe } from "@/lib/informes";

// Informe de un mes para dar al alumno (o a su familia): se imprime o se guarda en PDF desde el navegador
export default async function InformeMensual({ params, searchParams }: PageProps<"/alumnos/[id]/informe">) {
  const perfil = await exigirRol("direccion", "preparador");
  const { id } = await params;
  const { mes: mesParam } = await searchParams;
  const mes = typeof mesParam === "string" && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesDe(new Date());
  const ficha = await cargarFicha(id);
  if (!ficha) notFound();
  // Los accesos solo los ve Dirección
  const dias = perfil.rol === "direccion" ? await diasDeAsistencia(id, mes) : null;

  return (
    <Informe
      ficha={ficha}
      mes={mes}
      dias={dias}
      ruta={`/alumnos/${id}/informe`}
      volver={{ href: `/alumnos/${id}`, texto: `Ficha de ${ficha.nombreCompleto}` }}
      conComentario
    />
  );
}
