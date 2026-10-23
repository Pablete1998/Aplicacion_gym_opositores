import Link from "next/link";
import { exigirRol, uno } from "@/lib/datos";
import { euros, numeroFactura, rangoPeriodo } from "@/lib/facturas";
import { mesActual, mesAnterior, nombreMes } from "@/lib/informes";
import { FORMAS_PAGO, type FormaPago } from "@/lib/pagos";
import { createClient } from "@/lib/supabase/server";
import { emitir, guardarDatos, rectificar } from "./actions";
import { cargarFacturas } from "./listado";

const FECHA = (f: string) => f.split("-").reverse().join("/");

function trimestreDe(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return `${a}-T${Math.ceil(m / 3)}`;
}

export default async function Facturas({ searchParams }: PageProps<"/facturas">) {
  await exigirRol("direccion");
  const { periodo: periodoParam, guardado, emitida, rectificada, error } = await searchParams;
  const hoy = mesActual();
  const periodo = typeof periodoParam === "string" && rangoPeriodo(periodoParam) ? periodoParam : hoy;
  const rango = rangoPeriodo(periodo)!;
  const supabase = await createClient();

  const [facturas, { data: datos }, { data: pagos }] = await Promise.all([
    cargarFacturas(rango.desde, rango.hasta),
    supabase.from("datos_facturacion").select("*").maybeSingle(),
    // Cuotas cobradas de los meses del periodo, para ver cuáles se quedaron sin factura
    supabase
      .from("pagos")
      .select("id, mes, forma, importe, alumnos(nombre, apellidos), facturas(id, rectifica_id)")
      .gte("mes", rango.desde.slice(0, 7))
      .lt("mes", rango.hasta.slice(0, 7))
      .neq("forma", "regalado")
      .order("mes"),
  ]);
  // Una cuota tiene factura vigente si tiene más facturas que rectificativas
  const sinFactura = (pagos ?? []).filter((p) => {
    const rectificativas = p.facturas.filter((f) => f.rectifica_id).length;
    return p.facturas.length - rectificativas <= rectificativas;
  });
  const faltanDatos = !datos?.razon_social || !datos.nif || !datos.domicilio;
  const suma = (campo: "base" | "iva_cuota" | "total") => facturas.reduce((t, f) => t + f[campo], 0);
  const ivas = [...new Set(facturas.map((f) => f.iva_tipo))];

  const atajos = [
    { periodo: hoy, texto: "Este mes" },
    { periodo: mesAnterior(hoy), texto: "Mes pasado" },
    { periodo: trimestreDe(hoy), texto: "Este trimestre" },
    { periodo: trimestreDe([1, 2, 3].reduce((m) => mesAnterior(m), hoy)), texto: "Trimestre pasado" },
  ];
  const aviso = error
    ? { clase: "error", texto: String(error) }
    : emitida
      ? { clase: "ok", texto: "Factura emitida." }
      : rectificada
        ? { clase: "ok", texto: "Factura anulada con una rectificativa." }
        : null;

  return (
    <>
      <div>
        <h1>Facturas</h1>
        <p className="sub">
          Cada cuota cobrada en efectivo o por banco genera su factura al marcarla como pagada. Las regaladas no se facturan.
        </p>
      </div>

      {aviso && !guardado && <p className={`aviso ${aviso.clase}`}>{aviso.texto}</p>}
      {faltanDatos && (
        <p className="aviso error">
          Antes de emitir facturas, rellena los <a href="#datos">datos de facturación de la academia</a>.
        </p>
      )}

      <section className="panel">
        <div className="row">
          <h2>{rango.nombre.charAt(0).toUpperCase() + rango.nombre.slice(1)}</h2>
          <a href={`/facturas/exportar?periodo=${periodo}`} className="btn" download>
            Descargar Excel para el gestor
          </a>
        </div>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          {atajos.map((a) => (
            <Link key={a.texto} href={`/facturas?periodo=${a.periodo}`} className="btn ghost" aria-current={a.periodo === periodo ? "true" : undefined}>
              {a.texto}
            </Link>
          ))}
          <form className="row" action="/facturas">
            <input type="month" name="periodo" defaultValue={periodo.includes("T") ? hoy : periodo} aria-label="Mes" style={{ width: "auto" }} />
            <button className="btn ghost">Ver mes</button>
          </form>
        </div>

        <div className="cifras">
          <div className="dato"><span className="v">{facturas.length}</span>{facturas.length === 1 ? "factura" : "facturas"}</div>
          <div className="dato"><span className="v">{euros(suma("base"))}</span>base imponible</div>
          <div className="dato"><span className="v">{euros(suma("iva_cuota"))}</span>IVA{ivas.length === 1 ? ` (${ivas[0]} %)` : ""}</div>
          <div className="dato"><span className="v">{euros(suma("total"))}</span>total cobrado</div>
        </div>

        <div className="tbl">
          <table>
            <thead>
              <tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Base</th><th>IVA</th><th>Total</th><th>Pago</th><th></th></tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="num"><Link href={`/facturas/${f.id}`}>{numeroFactura(f.serie, f.numero)}</Link></td>
                  <td className="num">{FECHA(f.fecha)}</td>
                  <td>
                    {f.cliente_nombre}
                    {f.tipo === "simplificada" && <span className="sub"> · simplificada</span>}
                    {f.rectificada && <span className="sub"> · rectifica {f.rectificada}</span>}
                  </td>
                  <td className="num">{euros(f.base)}</td>
                  <td className="num">{euros(f.iva_cuota)}</td>
                  <td className="num">{euros(f.total)}</td>
                  <td>{FORMAS_PAGO[f.forma_pago as FormaPago] ?? f.forma_pago}</td>
                  <td>
                    {f.rectificadaPor ? (
                      <span className="pill p-no_apto">Anulada · {f.rectificadaPor}</span>
                    ) : (
                      !f.rectifica_id && (
                        <details className="rectificar">
                          <summary className="btn ghost">Anular</summary>
                          <form action={rectificar} className="campos">
                            <input type="hidden" name="id" value={f.id} />
                            <input type="hidden" name="periodo" value={periodo} />
                            <label>
                              Motivo
                              <input name="motivo" required placeholder="Ej.: faltaba el NIF" />
                            </label>
                            <label className="casilla">
                              <input type="checkbox" name="reemitir" defaultChecked /> Emitir otra con los datos de ahora
                            </label>
                            <label className="casilla">
                              <input type="checkbox" name="confirmo" required /> Sí, anular la {numeroFactura(f.serie, f.numero)}
                            </label>
                            <button className="btn">Hacer rectificativa</button>
                          </form>
                        </details>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {facturas.length === 0 && <tr><td colSpan={8}>No hay facturas en este periodo.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="sub">
          Una factura no se puede cambiar ni borrar: si hay un error, se anula con una rectificativa (serie R) y se emite otra.
        </p>
      </section>

      {sinFactura.length > 0 && (
        <section className="panel">
          <h2>Cuotas cobradas sin factura</h2>
          <p className="sub">Se cobraron cuando faltaban los datos de facturación o se anuló su factura.</p>
          <div className="tbl">
            <table>
              <thead><tr><th>Alumno</th><th>Mes</th><th>Pago</th><th>Importe</th><th></th></tr></thead>
              <tbody>
                {sinFactura.map((p) => {
                  const alumno = uno(p.alumnos);
                  return (
                    <tr key={p.id}>
                      <td>{alumno ? `${alumno.apellidos}, ${alumno.nombre}` : "—"}</td>
                      <td>{nombreMes(p.mes)}</td>
                      <td>{FORMAS_PAGO[p.forma as FormaPago]}</td>
                      <td className="num">{p.importe !== null ? euros(Number(p.importe)) : datos?.precio_cuota != null ? euros(Number(datos.precio_cuota)) : "—"}</td>
                      <td>
                        <form action={emitir}>
                          <input type="hidden" name="pago" value={p.id} />
                          <input type="hidden" name="periodo" value={periodo} />
                          <button className="btn ghost" disabled={faltanDatos}>Emitir factura</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel" id="datos">
        <h2>Datos de facturación</h2>
        <p className="sub">Salen en cada factura. Cambiarlos no toca las facturas ya emitidas.</p>
        {guardado && <p className="aviso ok">Datos guardados.</p>}
        <form action={guardarDatos} className="campos">
          <input type="hidden" name="periodo" value={periodo} />
          <label>
            Razón social o nombre
            <input name="razon_social" defaultValue={datos?.razon_social ?? ""} required />
          </label>
          <label>
            NIF / CIF
            <input name="nif" defaultValue={datos?.nif ?? ""} required />
          </label>
          <label>
            Domicilio
            <input name="domicilio" defaultValue={datos?.domicilio ?? ""} required />
          </label>
          <label>
            Código postal
            <input name="codigo_postal" defaultValue={datos?.codigo_postal ?? ""} inputMode="numeric" />
          </label>
          <label>
            Localidad
            <input name="localidad" defaultValue={datos?.localidad ?? ""} />
          </label>
          <label>
            Provincia
            <input name="provincia" defaultValue={datos?.provincia ?? ""} />
          </label>
          <label>
            Correo (opcional)
            <input name="email" type="email" defaultValue={datos?.email ?? ""} />
          </label>
          <label>
            Precio de la cuota, IVA incluido (€)
            <input name="precio_cuota" type="number" min="0" step="0.01" defaultValue={datos?.precio_cuota ?? ""} required />
          </label>
          <label>
            IVA (%)
            <input name="iva" type="number" min="0" max="30" step="0.01" defaultValue={datos?.iva ?? 21} required />
          </label>
          <label>
            Serie
            <input name="serie" defaultValue={datos?.serie ?? "A"} maxLength={5} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Concepto
            <input name="concepto" defaultValue={datos?.concepto ?? ""} />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Si el IVA es 0 %: por qué está exento (sale en la factura)
            <input name="exencion" defaultValue={datos?.exencion ?? ""} placeholder="Ej.: Operación exenta de IVA según art. 20.Uno.9.º de la Ley 37/1992" />
          </label>
          <p className="sub" style={{ gridColumn: "1 / -1" }}>
            Pregunta al gestor si las cuotas llevan IVA del 21 % o van exentas como enseñanza. La numeración es correlativa por año:
            {" "}{numeroFactura(`${datos?.serie ?? "A"}${hoy.slice(0, 4)}`, 1)}, {numeroFactura(`${datos?.serie ?? "A"}${hoy.slice(0, 4)}`, 2)}…
          </p>
          <button className="btn">Guardar datos</button>
        </form>
      </section>
    </>
  );
}
