import { redirect } from "next/navigation";
import { INICIO, perfilActual } from "@/lib/datos";

// Todo depende de la sesión del usuario: se renderiza en el servidor en cada petición
export const instant = false;

export default async function Inicio() {
  const perfil = await perfilActual();
  redirect(INICIO[perfil.rol]);
}
