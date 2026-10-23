import Link from "next/link";
import { perfilActual } from "@/lib/datos";
import { salir } from "@/app/login/actions";
import { Logo } from "@/components/Logo";
import { Menu } from "@/components/Menu";

// Todo depende de la sesión del usuario: se renderiza en el servidor en cada petición
export const instant = false;

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActual();
  return (
    <>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="logo">
            <Logo />
            Fer&apos;s Team
          </Link>
          <Menu rol={perfil.rol} />
          <div className="usuario">
            <Link href="/cuenta">{perfil.nombre}</Link>
            <form action={salir}>
              <button className="btn ghost">Salir</button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap">
        {perfil.cambiar_password && (
          <p className="aviso error">
            Estás usando una contraseña provisional. <Link href="/cuenta">Cámbiala ahora</Link>.
          </p>
        )}
        {children}
      </main>
    </>
  );
}
