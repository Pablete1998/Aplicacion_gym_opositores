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

// El martillo visto de frente: cara de acero cuadrada con bisel, collar y mango de madera con empuñadura de goma
function Martillo() {
  return (
    <svg className="martillo" viewBox="0 0 200 400">
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
        <linearGradient id="vt-cara" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9ecef" />
          <stop offset=".45" stopColor="#9aa1a9" />
          <stop offset=".6" stopColor="#b9bec4" />
          <stop offset="1" stopColor="#5d636b" />
        </linearGradient>
        <linearGradient id="vt-collar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b3f45" />
          <stop offset=".4" stopColor="#c9ced4" />
          <stop offset="1" stopColor="#2e3237" />
        </linearGradient>
        <radialGradient id="vt-brillo" cx="30%" cy="25%" r="45%">
          <stop offset="0" stopColor="#fff" stopOpacity=".9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Acero cepillado: vetas finas en diagonal */}
        <filter id="vt-cepillado" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.012" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      {/* Mango */}
      <path d="M86 170 L114 170 L128 398 L72 398 Z" fill="url(#vt-madera)" />
      <path d="M93 180 C95 230 90 280 94 330 M104 182 C106 240 102 290 107 330 M99 200 C100 250 98 300 100 330" stroke="#3a1c0a" strokeWidth="1.2" fill="none" opacity=".45" />
      <path d="M76 322 L124 322 L128 398 L72 398 Z" fill="url(#vt-goma)" />
      {[334, 348, 362, 376, 390].map((y) => <rect key={y} x="72" y={y} width="56" height="3" fill="#000" opacity=".35" />)}
      {/* Collar de acero entre cabeza y mango */}
      <rect x="78" y="168" width="44" height="26" rx="3" fill="url(#vt-collar)" />
      {/* Cabeza: bisel en cuatro caras, con la luz arriba a la izquierda */}
      <path d="M16 8 L184 8 L162 30 L38 30 Z" fill="#eef0f2" />
      <path d="M16 8 L38 30 L38 154 L16 176 Z" fill="#b4bac1" />
      <path d="M184 8 L184 176 L162 154 L162 30 Z" fill="#5f656d" />
      <path d="M16 176 L38 154 L162 154 L184 176 Z" fill="#3c4147" />
      <rect x="38" y="30" width="124" height="124" fill="url(#vt-cara)" />
      <rect x="38" y="30" width="124" height="124" fill="#fff" filter="url(#vt-cepillado)" opacity=".18" />
      <path d="M48 70 L80 52 M110 128 L146 112 M60 140 L72 134" stroke="#2b2f35" strokeWidth=".8" opacity=".5" />
      <rect x="38" y="30" width="124" height="124" fill="url(#vt-brillo)" />
      <rect x="16" y="8" width="168" height="168" fill="none" stroke="#1b1d20" strokeWidth="2.5" />
    </svg>
  );
}

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
      <div key={`llamas-${ruta}`} className="llamarada" aria-hidden="true">
        <Llamas />
        {CHISPAS.map((c, i) => (
          <span key={i} className="chispa" style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.tam, height: c.tam, animationDelay: `${c.retraso}ms` }} />
        ))}
      </div>
      <div key={`golpe-${ruta}`} className="golpe" aria-hidden="true">
        <span className="destello" />
        <svg className="grietas" viewBox="-100 -100 200 200">
          {GRIETAS.map((d) => <path key={d} d={d} pathLength={1} />)}
        </svg>
        <Martillo />
      </div>
    </>
  );
}
