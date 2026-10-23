// Logo de Fer's Team redibujado en vectorial a partir del grabado en pizarra.
// El contorno usa el color del texto y el relleno el rojo de la marca.
const RELLENO = "var(--logo-rojo)";
const FONDO = "var(--logo-fondo, var(--brand))";

export function Logo({ conNombre = false, className }: { conNombre?: boolean; className?: string }) {
  return (
    <svg
      viewBox={conNombre ? "10 10 220 195" : "10 10 220 158"}
      className={className}
      role="img"
      aria-label="Fer's Team"
    >
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        {/* Hacha y alzaprima cruzadas detrás de las letras */}
        <path d="M60,55 L150,145 L143,152 L53,62 Z" fill={FONDO} />
        <path transform="translate(57,52) rotate(-45)" d="M-6,-8 L8,-8 L8,6 L-6,6 L-20,15 Q-27,-1 -20,-17 Z M8,-5 L22,-1 L8,3 Z" fill={RELLENO} />
        <path d="M180,55 L90,145 L97,152 L187,62 Z" fill={FONDO} />
        <path transform="translate(183,52) rotate(45)" d="M-20,-8 L18,-8 L24,-3 L18,4 L-20,4 Z" fill={RELLENO} />
        {/* Casco de bombero */}
        <path d="M88,58 Q86,22 120,18 Q154,22 152,58 Z" fill={RELLENO} />
        <path d="M120,20 L120,56" />
        <path d="M70,60 Q120,50 170,60 L170,68 Q120,58 70,68 Z" fill={FONDO} />
        {/* F en contorno y T rellena */}
        <path d="M72,74 L124,74 L124,94 L116,94 L116,86 L96,86 L96,108 L110,108 L110,120 L96,120 L96,146 L104,146 L104,158 L72,158 L72,146 L80,146 L80,86 L72,86 Z" fill={FONDO} />
        <path d="M114,74 L180,74 L180,96 L172,96 L172,87 L155,87 L155,146 L164,146 L164,158 L130,158 L130,146 L139,146 L139,87 L122,87 L122,96 L114,96 Z" fill={RELLENO} />
      </g>
      {conNombre && (
        <text x="120" y="196" textAnchor="middle" fontFamily="var(--f-display), 'Arial Narrow', sans-serif" fontWeight="700" fontSize="36" letterSpacing="1">
          <tspan fill="none" stroke="currentColor" strokeWidth="1.5">FER&apos;S</tspan>{" "}
          <tspan fill={RELLENO}>TEAM</tspan>
        </text>
      )}
    </svg>
  );
}
