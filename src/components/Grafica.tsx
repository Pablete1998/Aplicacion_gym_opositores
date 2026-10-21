import { formatoMarca, type Baremo, type Unidad } from "@/lib/baremo";

const W = 640, H = 240, L = 58, R = 16, T = 14, B = 30;

const fechaCorta = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" });

// Evolución de una prueba con las líneas de mínimo y objetivo. Arriba siempre es mejor marca.
export function Grafica({ nombre, unidad, baremo, serie }: { nombre: string; unidad: Unidad; baremo: Baremo | null; serie: { fecha: string; marca: number }[] }) {
  if (serie.length === 0) return <p className="sub">Todavía no hay marcas registradas.</p>;
  const menosEsMejor = baremo ? !baremo.mayorEsMejor : unidad === "segundos";
  const valores = [...serie.map((s) => s.marca), ...(baremo ? [baremo.minima] : []), ...(baremo?.objetivo != null ? [baremo.objetivo] : [])];
  let lo = Math.min(...valores), hi = Math.max(...valores);
  const margen = (hi - lo) * 0.12 || 1;
  lo -= margen;
  hi += margen;
  const y = (v: number) => (menosEsMejor ? T + ((v - lo) / (hi - lo)) * (H - T - B) : H - B - ((v - lo) / (hi - lo)) * (H - T - B));
  const x = (i: number) => (serie.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (serie.length - 1));
  const linea = serie.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.marca).toFixed(1)}`).join("");
  const marcas = [0, 1, 2, 3, 4].map((i) => lo + ((hi - lo) * i) / 4);
  const ultima = serie[serie.length - 1];

  return (
    <div className="grafica">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución de ${nombre}`}>
        {marcas.map((m) => (
          <g key={m}>
            <line x1={L} x2={W - R} y1={y(m)} y2={y(m)} stroke="var(--line)" />
            <text x={L - 8} y={y(m) + 4} textAnchor="end">
              {formatoMarca(unidad, unidad === "segundos" && m >= 60 ? Math.round(m) : Math.round(m * 10) / 10)}
            </text>
          </g>
        ))}
        {baremo && <line x1={L} x2={W - R} y1={y(baremo.minima)} y2={y(baremo.minima)} stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="5 4" />}
        {baremo?.objetivo != null && <line x1={L} x2={W - R} y1={y(baremo.objetivo)} y2={y(baremo.objetivo)} stroke="var(--ok)" strokeWidth={1.5} strokeDasharray="5 4" />}
        <path d={`${linea}L${x(serie.length - 1)},${H - B}L${x(0)},${H - B}Z`} fill="var(--signal)" fillOpacity={0.12} />
        <path d={linea} fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinejoin="round" />
        {serie.map((s, i) => (
          <g key={`${s.fecha}-${i}`}>
            <circle cx={x(i)} cy={y(s.marca)} r={i === serie.length - 1 ? 5.5 : 3.5} fill={i === serie.length - 1 ? "var(--signal)" : "var(--surface)"} stroke="var(--ink)" strokeWidth={2}>
              <title>{`${fechaCorta(s.fecha)}: ${formatoMarca(unidad, s.marca)}`}</title>
            </circle>
            <text x={x(i)} y={H - 10} textAnchor="middle">
              {fechaCorta(s.fecha)}
            </text>
          </g>
        ))}
        <text x={Math.min(x(serie.length - 1), W - R - 4)} y={y(ultima.marca) - 12} textAnchor="end" style={{ fill: "var(--ink)", fontWeight: 500 }}>
          {formatoMarca(unidad, ultima.marca)}
        </text>
      </svg>
      {baremo && (
        <div className="leyenda">
          <span style={{ color: "var(--bad)" }}>- - Mínimo {formatoMarca(unidad, baremo.minima)}</span>
          {baremo.objetivo != null && <span style={{ color: "var(--ok)" }}>- - Objetivo {formatoMarca(unidad, baremo.objetivo)}</span>}
          <span>Arriba = mejor marca</span>
        </div>
      )}
    </div>
  );
}
