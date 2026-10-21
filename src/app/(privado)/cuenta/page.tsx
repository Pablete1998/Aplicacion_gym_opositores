import { perfilActual, ROLES } from "@/lib/datos";
import { FormularioPassword } from "./Formulario";

export default async function Cuenta() {
  const perfil = await perfilActual();
  return (
    <>
      <div>
        <h1>Mi cuenta</h1>
        <p className="sub">{perfil.nombre} · {ROLES[perfil.rol]}</p>
      </div>
      <section className="panel">
        <h2>Cambiar contraseña</h2>
        <FormularioPassword />
      </section>
    </>
  );
}
