"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Animación al cambiar de página: la página vieja arde de abajo arriba (una llamarada la barre)
// y la nueva cae de un martillazo: un martillo baja, golpea, salta una onda de choque y todo
// tiembla. Cambiar filtros o guardar no anima (la ruta no cambia).
export function Transicion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return (
    <>
      <ViewTransition key={ruta} enter="martillazo" exit="arder" default="none">
        <div className="pagina">{children}</div>
      </ViewTransition>
      {/* Solo se ven mientras dura la transición (CSS :active-view-transition) */}
      <div key={`llamas-${ruta}`} className="llamarada" aria-hidden="true" />
      <div key={`golpe-${ruta}`} className="golpe" aria-hidden="true">
        <span className="onda" />
        <svg className="martillo" viewBox="0 0 120 120">
          <rect x="54" y="38" width="12" height="78" rx="4" fill="#8a4b1f" stroke="#2a1405" strokeWidth="3" />
          <rect x="54" y="92" width="12" height="20" rx="3" fill="#ff4d1a" />
          <path d="M18 14h70l14 8v20l-14 8H18a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Z" fill="#cfd3d8" stroke="#1b1d20" strokeWidth="3" />
          <path d="M18 18h66v8H18z" fill="#fff" opacity=".55" />
        </svg>
      </div>
    </>
  );
}
