import Link from "next/link";
import { exigirRol } from "@/lib/datos";
import { crearAlumno } from "../actions";
import { cargarCatalogo } from "../catalogo";
import { FormularioAlumno } from "../FormularioAlumno";

export default async function NuevoAlumno() {
  await exigirRol("direccion");
  const catalogo = await cargarCatalogo();
  return (
    <>
      <Link href="/alumnos" className="sub">← Alumnos</Link>
      <div>
        <h1>Dar de alta alumno</h1>
        <p className="sub">El sexo y la fecha de nacimiento sirven para aplicar el baremo que le corresponde.</p>
      </div>
      <section className="panel">
        <FormularioAlumno accion={crearAlumno} catalogo={catalogo} esAlta />
      </section>
    </>
  );
}
