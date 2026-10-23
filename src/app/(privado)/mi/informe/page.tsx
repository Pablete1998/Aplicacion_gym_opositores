import { Informe } from "@/components/Informe";
import { cargarFicha, diasDeAsistencia, exigirRol, miAlumnoId } from "@/lib/datos";
import { mesActual } from "@/lib/informes";

export default async function MiInforme({ searchParams }: PageProps<"/mi/informe">) {
  await exigirRol("alumno");
  const { mes: mesParam } = await searchParams;
  const mes = typeof mesParam === "string" && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesActual();
  const id = await miAlumnoId();
  const ficha = id ? await cargarFicha(id) : null;
  if (!id || !ficha) return <p className="sub">Tu usuario aún no está vinculado a una ficha de alumno. Avisa en recepción.</p>;

  return (
    <Informe
      ficha={ficha}
      mes={mes}
      dias={await diasDeAsistencia(id, mes)}
      ruta="/mi/informe"
      volver={{ href: "/mi", texto: "Mi evolución" }}
      conComentario={false}
    />
  );
}
