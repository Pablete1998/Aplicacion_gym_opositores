import Link from "next/link";
import { notFound } from "next/navigation";
import { Imprimir } from "@/components/Imprimir";
import { Logo } from "@/components/Logo";
import { exigirRol } from "@/lib/datos";
import { conceptoLegible, euros, numeroFactura } from "@/lib/facturas";
import { FORMAS_PAGO, type FormaPago } from "@/lib/pagos";
import { createClient } from "@/lib/supabase/server";

interface Emisor {
  razon_social: string;
  nif: string;
  domicilio: string;
  codigo_postal: string;
  localidad: string;
  provincia: string;
  email: string | null;
}

// Factura para imprimir o guardar en PDF. La ven dirección y el propio alumno (RLS).
export default async function VerFactura({ params }: PageProps<"/facturas/[id]">) {
  const perfil = await exigirRol("direccion", "alumno");
  const { id } = await params;
  const supabase = await createClient();
  const { data: f } = await supabase.from("facturas").select("*").eq("id", id).maybeSingle();
  if (!f) notFound();
  const [{ data: original }, { data: anulada }] = await Promise.all([
    f.rectifica_id ? supabase.from("facturas").select("serie, numero, fecha").eq("id", f.rectifica_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("facturas").select("serie, numero").eq("rectifica_id", f.id).maybeSingle(),
  ]);
  const e = f.emisor as Emisor;
  const numero = numeroFactura(f.serie, f.numero);
  const titulo = f.rectifica_id ? "Factura rectificativa" : f.tipo === "simplificada" ? "Factura simplificada" : "Factura";
  const lugar = [e.codigo_postal, e.localidad, e.provincia && e.provincia !== e.localidad ? `(${e.provincia})` : ""].filter(Boolean).join(" ");
  const volver = perfil.rol === "direccion" ? { href: `/facturas?periodo=${f.fecha.slice(0, 7)}`, texto: "Facturas" } : { href: "/mi#facturas", texto: "Mi evolución" };

  return (
    <>
      <div className="row no-print">
        <Link href={volver.href} className="sub">← {volver.texto}</Link>
        <Imprimir />
      </div>
      {anulada && <p className="aviso error no-print">Esta factura está anulada por la rectificativa {numeroFactura(anulada.serie, anulada.numero)}.</p>}

      <article className="factura panel">
        <header className="factura-cabecera">
          <div className="informe-cabecera">
            <Logo />
            <div>
              <strong>{e.razon_social}</strong>
              <div>NIF {e.nif}</div>
              <div>{e.domicilio}</div>
              {lugar && <div>{lugar}</div>}
              {e.email && <div>{e.email}</div>}
            </div>
          </div>
          <div className="factura-numero">
            <h1>{titulo}</h1>
            <div>Nº <strong className="num">{numero}</strong></div>
            <div>Fecha {f.fecha.split("-").reverse().join("/")}</div>
          </div>
        </header>

        <section>
          <h2>Cliente</h2>
          <div>{f.cliente_nombre}</div>
          {f.cliente_nif && <div>NIF {f.cliente_nif}</div>}
          {f.cliente_domicilio && <div>{f.cliente_domicilio}</div>}
        </section>

        {original && (
          <p>
            Rectifica la factura <strong>{numeroFactura(original.serie, original.numero)}</strong> del {original.fecha.split("-").reverse().join("/")}.
            Motivo: {f.motivo_rectificacion}.
          </p>
        )}

        <div className="tbl">
          <table>
            <thead><tr><th>Concepto</th><th className="num">Base imponible</th><th className="num">IVA</th><th className="num">Total</th></tr></thead>
            <tbody>
              <tr>
                <td>{conceptoLegible(f.concepto)}</td>
                <td className="num">{euros(Number(f.base))}</td>
                <td className="num">{Number(f.iva_tipo)} % · {euros(Number(f.iva_cuota))}</td>
                <td className="num">{euros(Number(f.total))}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><th colSpan={3}>Total</th><th className="num factura-total">{euros(Number(f.total))}</th></tr>
            </tfoot>
          </table>
        </div>

        {f.exencion && <p>{f.exencion}</p>}
        <p className="sub">
          Forma de pago: {FORMAS_PAGO[f.forma_pago as FormaPago] ?? f.forma_pago}.
          {f.tipo === "simplificada" && !f.rectifica_id && " Si necesitas factura completa a tu nombre, pide en la academia que añadan tu NIF."}
        </p>
        <p className="factura-huella">Huella: {f.huella}</p>
      </article>
    </>
  );
}
