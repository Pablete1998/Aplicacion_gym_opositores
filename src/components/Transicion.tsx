"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, ViewTransition } from "react";

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

// Lenguas de fuego de la llamarada: posición, ancho y alto (en una caja de 1000 × 400), fijas para
// que el servidor y el navegador pinten lo mismo
const LLAMAS = Array.from({ length: 19 }, (_, i) => ({
  x: i * 56 + ((i * 37) % 23) - 10,
  ancho: 110 + ((i * 53) % 60),
  alto: 200 + ((i * 89) % 180),
  retraso: ((i * 71) % 9) * -40,
}));

// Chispas que saltan de las llamas
const CHISPAS = Array.from({ length: 24 }, (_, i) => ({
  x: (i * 43 + ((i * 29) % 17)) % 100,
  y: 30 + ((i * 61) % 50),
  tam: 2 + (i % 3),
  retraso: ((i * 37) % 11) * -45,
}));

// Una lengua de fuego: base ancha abajo, punta fina y curvada arriba
function lengua(x: number, ancho: number, alto: number, inclinacion: number) {
  const m = ancho / 2;
  const y = 400 - alto;
  return `M${x - m} 400 C${x - m} ${400 - alto * 0.45} ${x - m * 0.2} ${y + alto * 0.35} ${x + inclinacion} ${y}`
    + ` C${x + m * 0.35} ${y + alto * 0.4} ${x + m} ${400 - alto * 0.4} ${x + m} 400 Z`;
}

function Llamas() {
  return (
    <svg viewBox="0 0 1000 400" preserveAspectRatio="none">
      <defs>
        {/* El color del fuego de verdad: casi blanco en la base, naranja en medio y rojo que se apaga en la punta */}
        <linearGradient id="vt-fuego-fuera" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff6a00" />
          <stop offset=".45" stopColor="#e3300b" />
          <stop offset=".8" stopColor="#a8140a" stopOpacity=".7" />
          <stop offset="1" stopColor="#5a0a05" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vt-fuego-medio" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd35a" />
          <stop offset=".5" stopColor="#ff8a12" />
          <stop offset="1" stopColor="#ff4a00" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vt-fuego-centro" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset=".55" stopColor="#ffe48a" />
          <stop offset="1" stopColor="#ffb52e" stopOpacity="0" />
        </linearGradient>
        {/* Turbulencia que sube: deforma los bordes de las llamas como el aire caliente */}
        <filter id="vt-ondular" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.028" numOctaves="2" seed="4" result="ruido" />
          <feOffset in="ruido" dy="0" result="ruido-sube">
            <animate attributeName="dy" from="0" to="-400" dur="0.9s" repeatCount="indefinite" />
          </feOffset>
          <feDisplacementMap in="SourceGraphic" in2="ruido-sube" scale="38" xChannelSelector="R" yChannelSelector="G" result="ondulado" />
          <feGaussianBlur in="ondulado" stdDeviation="9" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="ondulado" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#vt-ondular)">
        {LLAMAS.map((l, i) => (
          <g key={i} className="llama" style={{ animationDelay: `${l.retraso}ms` }}>
            <path d={lengua(l.x, l.ancho, l.alto, i % 2 ? 18 : -18)} fill="url(#vt-fuego-fuera)" />
            <path d={lengua(l.x, l.ancho * 0.66, l.alto * 0.7, i % 2 ? 10 : -10)} fill="url(#vt-fuego-medio)" />
            <path d={lengua(l.x, l.ancho * 0.34, l.alto * 0.4, 0)} fill="url(#vt-fuego-centro)" />
          </g>
        ))}
      </g>
    </svg>
  );
}

// El mango del martillo: collar de acero, madera con vetas y empuñadura de goma estriada.
// La cabeza es la propia página nueva, enmarcada por un bisel de acero (CSS .cara)
function Mango() {
  return (
    <svg className="mango" viewBox="0 0 60 400" preserveAspectRatio="xMidYMin meet">
      <defs>
        <linearGradient id="vt-madera" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2610" />
          <stop offset=".35" stopColor="#a8682f" />
          <stop offset=".55" stopColor="#c58545" />
          <stop offset="1" stopColor="#5a2e12" />
        </linearGradient>
        <linearGradient id="vt-goma" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a0d05" />
          <stop offset=".45" stopColor="#d8331a" />
          <stop offset="1" stopColor="#4a0a04" />
        </linearGradient>
        <linearGradient id="vt-collar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b3f45" />
          <stop offset=".4" stopColor="#c9ced4" />
          <stop offset="1" stopColor="#2e3237" />
        </linearGradient>
      </defs>
      <path d="M14 20 L46 20 L56 400 L4 400 Z" fill="url(#vt-madera)" />
      <path d="M22 40 C24 120 20 200 24 270 M36 42 C38 130 34 210 38 270" stroke="#3a1c0a" strokeWidth="1.2" fill="none" opacity=".45" />
      <path d="M8 280 L52 280 L56 400 L4 400 Z" fill="url(#vt-goma)" />
      {[296, 316, 336, 356, 376].map((y) => <rect key={y} x="4" y={y} width="52" height="4" fill="#000" opacity=".35" />)}
      <rect x="6" y="0" width="48" height="30" rx="3" fill="url(#vt-collar)" />
    </svg>
  );
}

// Animación al cambiar de página: la página vieja arde de abajo arriba (una llamarada la barre)
// y la nueva llega como la cara de un martillo gigante: sube desde abajo, crece hasta llenar la pantalla,
// golpea el cristal, lo deja agrietado un momento y todo tiembla. Cambiar filtros o guardar no anima.
export function Transicion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const pagina = useRef<HTMLDivElement>(null);

  // La cabeza del martillo es la parte visible de la página nueva: se mide al cambiar de ruta para
  // que el bisel, el mango y las grietas encajen con ella
  useLayoutEffect(() => {
    const el = pagina.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const alto = Math.max(120, Math.min(r.height, window.innerHeight - r.top - 12));
    const raiz = document.documentElement.style;
    raiz.setProperty("--cara-x", `${r.left}px`);
    raiz.setProperty("--cara-y", `${r.top}px`);
    raiz.setProperty("--cara-ancho", `${r.width}px`);
    raiz.setProperty("--cara-alto", `${alto}px`);
  }, [ruta]);

  return (
    <>
      <ViewTransition key={ruta} enter="martillazo" exit="arder" default="none">
        <div ref={pagina} className="pagina">{children}</div>
      </ViewTransition>
      {/* Solo se ven mientras dura la transición (CSS :active-view-transition) */}
      <div key={`llamas-${ruta}`} className="llamarada" aria-hidden="true">
        <Llamas />
        {CHISPAS.map((c, i) => (
          <span key={i} className="chispa" style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.tam, height: c.tam, animationDelay: `${c.retraso}ms` }} />
        ))}
      </div>
      <div key={`golpe-${ruta}`} className="golpe" aria-hidden="true">
        <div className="cara">
          <Mango />
        </div>
        <span className="destello" />
        <svg className="grietas" viewBox="-100 -100 200 200">
          {GRIETAS.map((d) => <path key={d} d={d} pathLength={1} />)}
        </svg>
      </div>
    </>
  );
}
