import QRCode from "qrcode";
import { Ficha } from "@/components/Ficha";
import { Instalar } from "@/components/Instalar";
import { cargarFicha, exigirRol, miAlumnoId } from "@/lib/datos";
import { QrGrande } from "./QrGrande";

export default async function MiEvolucion({ searchParams }: PageProps<"/mi">) {
  await exigirRol("alumno");
  const { prueba } = await searchParams;
  const id = await miAlumnoId();
  const ficha = id ? await cargarFicha(id) : null;
  if (!ficha) return <p className="sub">Tu usuario aún no está vinculado a una ficha de alumno. Avisa en recepción.</p>;
  const qr = await QRCode.toString(ficha.codigo_acceso, { type: "svg", margin: 1 });

  return (
    <>
      <Instalar />
      <Ficha ficha={ficha} pruebaId={typeof prueba === "string" ? prueba : undefined} base="/mi" />
      <section className="panel">
        <h2>Mi acceso</h2>
        <div className="row" style={{ justifyContent: "flex-start", gap: 20 }}>
          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} />
          <div>
            <p>Enséñalo en la entrada.</p>
            {ficha.cuota_al_dia ? <span className="pill p-objetivo">Cuota al día</span> : <span className="pill p-no_apto">Cuota pendiente</span>}
            <p><QrGrande svg={qr} nombre={ficha.nombreCompleto} cuotaAlDia={ficha.cuota_al_dia} /></p>
          </div>
        </div>
      </section>
    </>
  );
}
