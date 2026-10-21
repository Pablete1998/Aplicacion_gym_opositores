import { exigirRol } from "@/lib/datos";
import { Lector } from "./Lector";

export default async function Acceso() {
  await exigirRol("recepcion", "direccion");
  return (
    <>
      <div>
        <h1>Control de acceso</h1>
        <p className="sub">Cada lectura queda registrada. Se deniega la entrada si la cuota está pendiente o el alumno está de baja.</p>
      </div>
      <Lector />
    </>
  );
}
