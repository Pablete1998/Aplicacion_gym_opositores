"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useRef, ViewTransition } from "react";
import type { Rol } from "@/lib/datos";

type Icono = keyof typeof ICONOS;
type Entrada = [href: string, texto: string, icono: Icono];

// Trazos de 24×24 para la barra del móvil
const ICONOS = {
  inicio: "M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5",
  alumnos: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6",
  registrar: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2.5 2.5M10 2h4",
  simulacros: "M5 21V4M5 4h11l-2 4 2 4H5",
  informes: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  acceso: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20v.01M17 20h4v-3",
  cuotas: "M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10h9M4 14h9",
  oposiciones: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5A2.5 2.5 0 0 0 6.5 24H20",
  personal: "M15 7a4 4 0 1 1-5.6 3.7L3 17v4h4v-2h2v-2h2l1.3-1.3A4 4 0 0 1 15 7ZM16.5 8.5v.01",
  mi: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM4 22a8 8 0 0 1 16 0",
  planificar: "M4 5h16v16H4zM4 10h16M9 3v4M15 3v4M8 14h3M8 17h6",
  facturas: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8M9 9h2",
  rankings: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3",
  teoria: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6",
  mas: "M5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM19 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
} as const;

// Las primeras entradas van en la barra del móvil; si no caben, el resto queda en «Más»
const MENU: Record<Rol, Entrada[]> = {
  direccion: [
    ["/panel", "Inicio", "inicio"],
    ["/alumnos", "Alumnos", "alumnos"],
    ["/registrar", "Registrar", "registrar"],
    ["/acceso", "Acceso", "acceso"],
    ["/planificar", "Planificar", "planificar"],
    ["/simulacro", "Simulacros", "simulacros"],
    ["/informes", "Informes", "informes"],
    ["/rankings", "Rankings", "rankings"],
    ["/teoria", "Teoría", "teoria"],
    ["/cuotas", "Cuotas", "cuotas"],
    ["/facturas", "Facturas", "facturas"],
    ["/oposiciones", "Oposiciones", "oposiciones"],
    ["/personal", "Personal", "personal"],
  ],
  preparador: [
    ["/panel", "Inicio", "inicio"],
    ["/alumnos", "Mis alumnos", "alumnos"],
    ["/registrar", "Registrar", "registrar"],
    ["/planificar", "Planificar", "planificar"],
    ["/simulacro", "Simulacros", "simulacros"],
    ["/informes", "Informes", "informes"],
    ["/rankings", "Rankings", "rankings"],
    ["/teoria", "Teoría", "teoria"],
  ],
  alumno: [
    ["/mi/sesion", "Sesión de hoy", "registrar"],
    ["/teoria", "Teoría", "teoria"],
    ["/mi", "Mi evolución", "mi"],
    ["/rankings", "Rankings", "rankings"],
  ],
  recepcion: [["/acceso", "Acceso", "acceso"]],
};
const EN_BARRA = 5;

// Mientras carga la sección pulsada, una barra de fuego arriba del todo
function Cargando() {
  const { pending } = useLinkStatus();
  return pending ? <span className="cargando" aria-hidden="true" /> : null;
}

// La pastilla de la sección activa se desliza de una entrada a otra del menú
function Pastilla({ activa }: { activa: boolean }) {
  return activa ? (
    <ViewTransition name="menu-activo" share="pastilla" default="none">
      <span className="pastilla" aria-hidden="true" />
    </ViewTransition>
  ) : null;
}

function Icono({ nombre }: { nombre: Icono }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

export function Menu({ rol }: { rol: Rol }) {
  const ruta = usePathname();
  const mas = useRef<HTMLDetailsElement>(null);
  const entradas = MENU[rol];
  // La entrada más concreta que coincide con la ruta (en /mi/sesion, «Sesión de hoy» y no «Mi evolución»)
  const coincide = (href: string) => ruta === href || ruta.startsWith(`${href}/`);
  const actual = [...entradas.map(([href]) => href), "/cuenta"].filter(coincide).sort((a, b) => b.length - a.length)[0];
  const activa = (href: string) => href === actual;
  const sobran = entradas.length > EN_BARRA;
  const enBarra = sobran ? entradas.slice(0, EN_BARRA - 1) : entradas;
  const enMas = sobran ? entradas.slice(EN_BARRA - 1) : [];
  const cerrar = () => mas.current?.removeAttribute("open");

  return (
    <>
      <nav className="nav" aria-label="Menú">
        {entradas.map(([href, texto]) => (
          <Link key={href} href={href} aria-current={activa(href) ? "page" : undefined}>
            <Pastilla activa={activa(href)} />
            <span>{texto}</span>
            <Cargando />
          </Link>
        ))}
      </nav>

      {entradas.length > 1 && (
        <nav className="barra-movil" aria-label="Menú">
          {enBarra.map(([href, texto, icono]) => (
            <Link key={href} href={href} aria-current={activa(href) ? "page" : undefined}>
              <Icono nombre={icono} />
              {texto}
              <Cargando />
            </Link>
          ))}
          {sobran && (
            <details ref={mas} className="mas">
              <summary aria-current={enMas.some(([href]) => activa(href)) ? "page" : undefined}>
                <Icono nombre="mas" />
                Más
              </summary>
              <div className="mas-hoja">
                {enMas.map(([href, texto, icono]) => (
                  <Link key={href} href={href} onClick={cerrar} aria-current={activa(href) ? "page" : undefined}>
                    <Icono nombre={icono} />
                    {texto}
                    <Cargando />
                  </Link>
                ))}
                <Link href="/cuenta" onClick={cerrar} aria-current={activa("/cuenta") ? "page" : undefined}>
                  <Icono nombre="mi" />
                  Mi cuenta
                </Link>
              </div>
            </details>
          )}
        </nav>
      )}
    </>
  );
}
