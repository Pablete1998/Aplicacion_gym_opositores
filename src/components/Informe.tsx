import Link from "next/link";
import { ETIQUETA_ESTADO, estadoMarca, formatoMarca, puntosMarca } from "@/lib/baremo";
import type { Ficha } from "@/lib/datos";
import { enMes, mejorDe, mesAnterior, mesSiguiente, nombreMes } from "@/lib/informes";
import { Grafica } from "./Grafica";
import { Imprimir } from "./Imprimir";
import { Logo } from "./Logo";

// Informe de un mes, para imprimir o guardar en PDF. Lo usan el personal (con comentario) y el propio alumno.
export function Informe({ ficha, mes, dias, ruta, volver, conComentario }: {
  ficha: Ficha;
  mes: string;
  dias: number | null;
  ruta: string;
  volver: { href: string; texto: string };
  conComentario: boolean;
}) {
  const anterior = mesAnterior(mes);
  const pruebas = ficha.pruebas.map((p) => {
    const delMes = p.serie.filter((s) => enMes(s.fecha, mes));
    const mejor = mejorDe(delMes, p.mayorEsMejor);
    const mejorAntes = mejorDe(p.serie.filter((s) => enMes(s.fecha, anterior)), p.mayorEsMejor);
    const cambio = mejor !== null && mejorAntes !== null ? (p.mayorEsMejor ? mejor - mejorAntes : mejorAntes - mejor) : null;
    // Para la gráfica, los últimos seis meses hasta el final del mes del informe
    const desde = [1, 2, 3, 4, 5].reduce((m) => mesAnterior(m), mes);
    const serie = p.serie.filter((s) => s.fecha >= `${desde}-01` && s.fecha < `${mesSiguiente(mes)}-01`);
    return { ...p, delMes, mejor, mejorAntes, cambio, serieGrafica: serie };
  });
  const conMarcas = pruebas.filter((p) => p.serieGrafica.length);

  return (
    <>
      <div className="row no-print">
        <Link href={volver.href} className="sub">← {volver.texto}</Link>
        <form className="row" action={ruta}>
          <input type="month" name="mes" defaultValue={mes} aria-label="Mes del informe" style={{ width: "auto" }} />
          <button className="btn ghost">Ver mes</button>
          <Imprimir />
        </form>
      </div>

      <article className="informe">
        <header className="informe-cabecera">
          <Logo />
          <div>
            <h1>{ficha.nombreCompleto}</h1>
            <p className="sub">
              Informe de {nombreMes(mes)} · {ficha.oposicion.nombre}
              {ficha.grupo && ` · ${ficha.grupo}`}
              {ficha.diasHastaExamen !== null && ficha.diasHastaExamen > 0 && ` · faltan ${ficha.diasHastaExamen} días para el examen`}
            </p>
          </div>
        </header>

        <section className="panel">
          <h2>Resumen del mes</h2>
          {dias !== null && <p>{conComentario ? "Ha venido" : "Has venido"} <strong>{dias} {dias === 1 ? "día" : "días"}</strong> a la academia.</p>}
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Prueba</th><th>Mejor marca del mes</th><th>Frente a {nombreMes(anterior).split(" ")[0]}</th><th>Baremo</th></tr>
              </thead>
              <tbody>
                {pruebas.map((p) => {
                  const estado = p.mejor !== null && p.baremo ? estadoMarca(p.baremo, p.mejor) : null;
                  const puntos = p.mejor !== null && p.baremo ? puntosMarca(p.baremo, p.mejor) : null;
                  return (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td className="num">{p.mejor !== null ? formatoMarca(p.unidad, p.mejor) : <span className="sub">Sin marcas</span>}</td>
                      <td className="num">
                        {p.cambio === null ? <span className="sub">—</span> : p.cambio === 0 ? "Igual" : (
                          <span className={p.cambio > 0 ? "t-mejora" : "t-empeora"}>
                            {p.cambio > 0 ? "Mejora " : "Empeora "}
                            {formatoMarca(p.unidad, Math.round(Math.abs(p.cambio) * 10) / 10)}
                          </span>
                        )}
                      </td>
                      <td>{estado && <span className={`pill p-${estado}`}>{ETIQUETA_ESTADO[estado]}{puntos !== null && ` · ${puntos} p`}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {conMarcas.length > 0 && (
          <section className="panel">
            <h2>Evolución de los últimos seis meses</h2>
            <div className="graficas">
              {conMarcas.map((p) => (
                <div key={p.id}>
                  <h3>{p.nombre}</h3>
                  <Grafica nombre={p.nombre} unidad={p.unidad} baremo={p.baremo} serie={p.serieGrafica} />
                </div>
              ))}
            </div>
          </section>
        )}

        {conComentario && (
          <section className="panel">
            <h2>Comentario del preparador</h2>
            <textarea name="comentario" rows={4} placeholder="Escribe aquí antes de imprimir: en qué ha mejorado, qué tiene que trabajar…" />
          </section>
        )}
      </article>
    </>
  );
}
