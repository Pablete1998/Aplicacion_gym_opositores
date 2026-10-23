"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Animación al cambiar de página: la página vieja arde de abajo arriba (una llamarada la barre)
// y la nueva cae de un martillazo. Cambiar filtros o guardar no anima (la ruta no cambia).
export function Transicion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return (
    <>
      <ViewTransition key={ruta} enter="martillazo" exit="arder" default="none">
        <div className="pagina">{children}</div>
      </ViewTransition>
      {/* Solo se ve mientras dura la transición (CSS :active-view-transition) */}
      <div key={`llamas-${ruta}`} className="llamarada" aria-hidden="true" />
    </>
  );
}
