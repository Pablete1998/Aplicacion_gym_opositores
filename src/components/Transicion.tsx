"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Animación al cambiar de página. Al cambiar la ruta, la página vieja sale y la nueva entra:
// desde el menú, hacia el lado de la sección elegida («ir-adelante» o «ir-atras»); desde
// cualquier otro enlace, subiendo. Cambiar filtros o guardar no anima (la ruta no cambia).
const ANIMACION = { "ir-adelante": "ir-adelante", "ir-atras": "ir-atras" };

export function Transicion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return (
    <ViewTransition
      key={ruta}
      enter={{ ...ANIMACION, default: "entrar" }}
      exit={{ ...ANIMACION, default: "salir" }}
      default="none"
    >
      <div className="pagina">{children}</div>
    </ViewTransition>
  );
}
