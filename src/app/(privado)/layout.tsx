import Link from "next/link";
import { perfilActual, type Rol } from "@/lib/datos";
import { salir } from "@/app/login/actions";

// Todo depende de la sesión del usuario: se renderiza en el servidor en cada petición
export const instant = false;

const MENU: Record<Rol, [string, string][]> = {
  direccion: [["/alumnos", "Alumnos"], ["/registrar", "Registrar marca"], ["/acceso", "Acceso"]],
  preparador: [["/alumnos", "Mis alumnos"], ["/registrar", "Registrar marca"]],
  alumno: [["/mi", "Mi evolución"]],
  recepcion: [["/acceso", "Acceso"]],
};

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActual();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="logo">
            <i />
            Academia Opositores
          </Link>
          <nav className="nav">
            {MENU[perfil.rol].map(([href, texto]) => (
              <Link key={href} href={href}>
                {texto}
              </Link>
            ))}
          </nav>
          <div className="usuario">
            <span>{perfil.nombre}</span>
            <form action={salir}>
              <button className="btn ghost">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
