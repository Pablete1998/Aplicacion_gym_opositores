import Link from "next/link";
import { exigirRol, listarAlumnos, llevaGrupos } from "@/lib/datos";
import { Lista } from "./Lista";

export default async function Alumnos({ searchParams }: PageProps<"/alumnos">) {
  const perfil = await exigirRol("direccion", "preparador");
  // Un director que también lleva grupos puede filtrar sus alumnos
  const conGrupos = perfil.rol === "direccion" && (await llevaGrupos(perfil.id));
  const { mios, grupo } = await searchParams;
  const soloMios = conGrupos && mios === "1";
  const alumnos = await listarAlumnos(soloMios ? perfil.id : undefined);
  return (
    <>
      <div className="row">
        <div>
          <h1>{perfil.rol === "preparador" ? "Mis alumnos" : "Alumnos"}</h1>
          <p className="sub">Pulsa un alumno para ver su ficha y evolución.</p>
          {conGrupos && (
            <p className="sub">
              {soloMios ? <Link href="/alumnos">Ver todos los alumnos</Link> : <Link href="/alumnos?mios=1">Ver solo mis grupos</Link>}
            </p>
          )}
        </div>
        {perfil.rol === "direccion" && <Link href="/alumnos/nuevo" className="btn">Dar de alta alumno</Link>}
      </div>
      <Lista alumnos={alumnos} conCuota={perfil.rol === "direccion"} grupoInicial={typeof grupo === "string" ? grupo : undefined} />
    </>
  );
}
