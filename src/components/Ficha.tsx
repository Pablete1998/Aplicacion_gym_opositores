import Link from "next/link";
import { ETIQUETA_ESTADO, estadoMarca, formatoMarca, progreso } from "@/lib/baremo";
import type { Ficha as FichaDatos } from "@/lib/datos";
import { Grafica } from "./Grafica";

const COLOR = { objetivo: "var(--ok)", apto: "var(--warn)", no_apto: "var(--bad)" } as const;

const fechaLarga = (f: string) => new Date(f + "T12:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export function Ficha({ ficha, pruebaId, base }: { ficha: FichaDatos; pruebaId?: string; base: string }) {
  const sel = ficha.pruebas.find((p) => p.id === pruebaId) ?? ficha.pruebas[0];
  const examen = ficha.oposicion.fecha_examen;
  const dias = ficha.diasHastaExamen;

  return (
    <>
      <div>
        <h1>{ficha.nombreCompleto}</h1>
        <p className="sub">
          <span className="pill p-op">{ficha.oposicion.nombre}</span>
          {ficha.grupo && ` · ${ficha.grupo}`}
          {examen && ` · examen previsto ${fechaLarga(examen)}${dias !== null && dias > 0 ? ` (faltan ${dias} días)` : ""}`}
        </p>
      </div>

      <section className="panel">
        <h2>Situación frente al baremo</h2>
        <div className="pruebas">
          {ficha.pruebas.map((p) => {
            const ultima = p.serie[p.serie.length - 1];
            const estado = ultima && p.baremo ? estadoMarca(p.baremo, ultima.marca) : null;
            return (
              <Link key={p.id} href={`${base}?prueba=${p.id}`} className="prueba" aria-current={p.id === sel?.id} scroll={false}>
                <div className="row">
                  <span>{p.nombre}</span>
                  {estado && <span className={`pill p-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>}
                </div>
                <div className="v">{ultima ? formatoMarca(p.unidad, ultima.marca) : "Sin marcas"}</div>
                {ultima && p.baremo && estado && (
                  <div className="barra">
                    <span style={{ width: `${progreso(p.baremo, ultima.marca) * 100}%`, background: COLOR[estado] }} />
                  </div>
                )}
                {p.baremo && (
                  <div className="m">
                    Mínimo {formatoMarca(p.unidad, p.baremo.minima)}
                    {p.baremo.objetivo != null && ` · objetivo ${formatoMarca(p.unidad, p.baremo.objetivo)}`}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {sel && (
        <div className="grid2">
          <section className="panel">
            <h2>Evolución: {sel.nombre}</h2>
            <Grafica nombre={sel.nombre} unidad={sel.unidad} baremo={sel.baremo} serie={sel.serie} />
          </section>
          <section className="panel">
            <h2>Historial</h2>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Marca</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {[...sel.serie].reverse().map((s, i) => {
                    const estado = sel.baremo ? estadoMarca(sel.baremo, s.marca) : null;
                    return (
                      <tr key={`${s.fecha}-${i}`}>
                        <td className="num">{fechaLarga(s.fecha)}</td>
                        <td className="num">{formatoMarca(sel.unidad, s.marca)}</td>
                        <td>{estado && <span className={`pill p-${estado}`}>{ETIQUETA_ESTADO[estado]}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
