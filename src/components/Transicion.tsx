"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

// Grietas del cristal: rayos quebrados desde el punto del golpe y dos anillos rotos
const GRIETAS = [
  "M0 0 L18 -9 L34 -6 L52 -22 L78 -26 L96 -44",
  "M0 0 L12 14 L30 18 L38 40 L60 52 L66 80",
  "M0 0 L-16 10 L-34 8 L-46 26 L-72 30 L-94 48",
  "M0 0 L-10 -16 L-8 -34 L-26 -50 L-30 -76",
  "M0 0 L6 -20 L22 -36 L20 -58 L36 -84",
  "M0 0 L-20 -4 L-40 -18 L-62 -14 L-88 -28",
  "M0 0 L-4 20 L-20 36 L-16 60 L-30 86",
  "M0 0 L22 2 L44 12 L68 8 L92 20",
  "M34 -6 L40 8 M-34 8 L-38 -6 M30 18 L44 14 M-8 -34 L6 -30 M38 40 L26 50 M-46 26 L-52 40",
  "M18 -9 L12 14 L-16 10 L-10 -16 L6 -20 Z",
  "M52 -22 L60 6 L44 12 M38 40 L-4 44 L-20 36 M-46 26 L-62 -14 L-40 -18 M-26 -50 L20 -58",
];

// Animación al cambiar de página: la página vieja arde de abajo arriba (una llamarada la barre)
// y la nueva llega con un martillazo contra la pantalla: el martillo sube desde abajo hacia ti, golpea el
// cristal, lo deja agrietado un momento y todo tiembla. Cambiar filtros o guardar no anima.
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
        <span className="destello" />
        <svg className="grietas" viewBox="-100 -100 200 200">
          {GRIETAS.map((d) => <path key={d} d={d} pathLength={1} />)}
        </svg>
        {/* El martillo visto de frente: la cara cuadrada de golpeo y el mango hacia ti */}
        <svg className="martillo" viewBox="0 0 200 260">
          <defs>
            <radialGradient id="acero" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".35" stopColor="#c8ccd2" />
              <stop offset="1" stopColor="#4a4f57" />
            </radialGradient>
          </defs>
          <path d="M82 120 L118 120 L132 258 L68 258 Z" fill="#8a4b1f" stroke="#2a1405" strokeWidth="4" />
          <path d="M70 226 L130 226 L132 258 L68 258 Z" fill="#ff4d1a" />
          <rect x="16" y="8" width="168" height="168" rx="14" fill="url(#acero)" stroke="#1b1d20" strokeWidth="5" />
          <rect x="36" y="28" width="128" height="128" rx="6" fill="none" stroke="#2b2f35" strokeWidth="3" opacity=".6" />
        </svg>
      </div>
    </>
  );
}
