import Link from "next/link";
import QRCode from "qrcode";
import { Ficha } from "@/components/Ficha";
import { Instalar } from "@/components/Instalar";
import { formatoMarca, siguienteMeta, type Unidad } from "@/lib/baremo";
import { euros, numeroFactura } from "@/lib/facturas";
import { cargarFicha, diasDeAsistencia, exigirRol, miAlumnoId } from "@/lib/datos";
import { ETIQUETA_TENDENCIA, haceDias, mesActual, type Tendencia } from "@/lib/informes";
import { hoyEnEspana } from "@/lib/sesiones";
import { clasificar } from "@/lib/simulacro";
import { createClient } from "@/lib/supabase/server";
import { esClaveToque, MENSAJES_TOQUE } from "@/lib/toques";
import { marcarToquesLeidos } from "./actions";
import { QrGrande } from "./QrGrande";
import { Toque } from "./Toque";

// El ranking compara la mejor marca de los últimos 30 días con la de los 30 anteriores
const DIAS_RANKING = 30;
const FLECHA: Record<Tendencia, string> = { mejora: "↑", estable: "→", empeora: "↓" };

// Filas de las funciones ranking_mi_grupo y mis_toques (migración 0004)
interface FilaRanking { prueba_id: string; alumno_id: string; nombre: string; marca: number | null; marca_anterior: number | null; soy_yo: boolean }
interface ToqueRecibido { id: string; de: string; mensaje: string; creado_en: string }

export default async function MiEvolucion({ searchParams }: PageProps<"/mi">) {
  await exigirRol("alumno");
  const { prueba, ranking: rankingParam } = await searchParams;
  const id = await miAlumnoId();
  const ficha = id ? await cargarFicha(id) : null;
  if (!id || !ficha) return <p className="sub">Tu usuario aún no está vinculado a una ficha de alumno. Avisa en recepción.</p>;

  const supabase = await createClient();
  const [qr, dias, { data: toquesDatos }, { data: rankingDatos }, { data: planHoy }, { data: facturas }] = await Promise.all([
    QRCode.toString(ficha.codigo_acceso, { type: "svg", margin: 1 }),
    diasDeAsistencia(id, mesActual()),
    supabase.rpc("mis_toques"),
    supabase.rpc("ranking_mi_grupo", { p_desde: haceDias(DIAS_RANKING), p_antes: haceDias(DIAS_RANKING * 2) }),
    // Plan de hoy de su grupo (RLS) y si ya ha empezado o terminado la sesión
    supabase.from("planes").select("titulo, plan_ejercicios(id), sesiones(terminada_en)").eq("fecha", hoyEnEspana()).maybeSingle(),
    // Sus facturas (RLS), las últimas primero
    supabase.from("facturas").select("id, serie, numero, fecha, total").order("fecha", { ascending: false }).order("numero", { ascending: false }).limit(12),
  ]);
  const sesionHoy = planHoy?.sesiones[0];
  // Si la migración 0004 aún no está aplicada, las funciones fallan y no se muestra ni ranking ni toques
  const toques = toquesDatos as ToqueRecibido[] | null;
  const ranking = rankingDatos as FilaRanking[] | null;

  // Lo que le falta en cada prueba para el siguiente escalón, con su última marca
  const metas = ficha.pruebas.flatMap((p) => {
    const ultima = p.serie.at(-1);
    const meta = ultima && p.baremo ? siguienteMeta(p.baremo, ultima.marca) : null;
    return ultima && p.baremo ? [{ id: p.id, nombre: p.nombre, unidad: p.unidad, meta }] : [];
  });

  // Ranking: solo pruebas físicas con alguna marca reciente en el grupo
  const filasRanking = (ranking ?? []).filter((r) => r.marca !== null);
  const pruebasRanking = ficha.pruebas.filter((p) => p.tipo === "fisica" && filasRanking.some((r) => r.prueba_id === p.id));
  const pruebaRanking = pruebasRanking.find((p) => p.id === rankingParam) ?? pruebasRanking[0];
  const clasificacion = pruebaRanking
    ? clasificar(
        filasRanking.filter((r) => r.prueba_id === pruebaRanking.id).map((r) => ({ ...r, marca: Number(r.marca) })),
        pruebaRanking.mayorEsMejor,
      ).map((r) => {
        const antes = r.marca_anterior === null ? null : Number(r.marca_anterior);
        const cambio = antes === null ? null : pruebaRanking.mayorEsMejor ? r.marca - antes : antes - r.marca;
        const tendencia: Tendencia | null = cambio === null ? null : cambio > Math.abs(antes!) * 0.01 ? "mejora" : cambio < -Math.abs(antes!) * 0.01 ? "empeora" : "estable";
        return { ...r, tendencia };
      })
    : [];

  return (
    <>
      {toques && toques.length > 0 && (
        <section className="panel toques">
          <h2>{toques.length === 1 ? "Te han dado un toque" : `Te han dado ${toques.length} toques`}</h2>
          <ul>
            {toques.map((t) => (
              <li key={t.id}><strong>{t.de}</strong> te dice: «{esClaveToque(t.mensaje) ? MENSAJES_TOQUE[t.mensaje] : t.mensaje}»</li>
            ))}
          </ul>
          <form action={marcarToquesLeidos}>
            <button className="btn ghost">Visto</button>
          </form>
        </section>
      )}
      {planHoy && (
        <section className="panel proximo">
          <div className="row">
            <div>
              <h2>Sesión de hoy: {planHoy.titulo}</h2>
              <p className="sub">
                {planHoy.plan_ejercicios.length} ejercicios ·{" "}
                {sesionHoy?.terminada_en ? "¡Terminada!" : sesionHoy ? "En curso" : ficha.cuota_al_dia ? "Sin empezar" : "Cuota pendiente"}
              </p>
            </div>
            <Link href="/mi/sesion" className="btn">{sesionHoy?.terminada_en ? "Ver" : sesionHoy ? "Seguir" : "Empezar"}</Link>
          </div>
        </section>
      )}
      <Instalar />
      <Ficha
        ficha={ficha}
        pruebaId={typeof prueba === "string" ? prueba : undefined}
        base="/mi"
        antes={
          <section className="panel proximo">
            <h2>Tu próximo paso</h2>
            <div className="row" style={{ justifyContent: "flex-start" }}>
              {ficha.diasHastaExamen !== null && ficha.diasHastaExamen > 0 && (
                <div className="dato"><span className="v">{ficha.diasHastaExamen}</span> días para el examen</div>
              )}
              <div className="dato"><span className="v">{dias}</span> {dias === 1 ? "día entrenado" : "días entrenados"} este mes</div>
            </div>
            {metas.length > 0 ? (
              <ul className="metas">
                {metas.map((m) => (
                  <li key={m.id}>
                    <strong>{m.nombre}:</strong>{" "}
                    {m.meta ? <>te faltan <span className="num">{formatoMarca(m.unidad as Unidad, m.meta.falta)}</span> para {m.meta.meta}.</> : "¡lo tienes al máximo! Mantén la marca."}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sub">Cuando tu preparador apunte tus primeras marcas verás aquí cuánto te falta en cada prueba.</p>
            )}
            <p><Link href="/mi/informe" className="btn ghost">Mi informe del mes</Link></p>
          </section>
        }
      />

      {pruebaRanking && (
        <section className="panel">
          <div className="row">
            <h2>Ranking de tu grupo</h2>
            <span className="sub">Mejor marca de los últimos {DIAS_RANKING} días · flecha frente al mes anterior</span>
          </div>
          <div className="row" style={{ justifyContent: "flex-start" }}>
            {pruebasRanking.map((p) => (
              <Link key={p.id} href={`/mi?ranking=${p.id}`} scroll={false} className="btn ghost" aria-current={p.id === pruebaRanking.id}>{p.nombre}</Link>
            ))}
          </div>
          <div className="tbl">
            <table>
              <thead><tr><th>#</th><th>Compañero</th><th>Marca</th><th></th></tr></thead>
              <tbody>
                {clasificacion.map((r) => (
                  <tr key={r.alumno_id} className={r.soy_yo ? "yo" : undefined}>
                    <td className="num">{r.puesto}</td>
                    <td>{r.soy_yo ? <strong>Tú</strong> : r.nombre}</td>
                    <td className="num">
                      {formatoMarca(pruebaRanking.unidad, r.marca)}
                      {r.tendencia && <span className={`flecha t-${r.tendencia}`} title={ETIQUETA_TENDENCIA[r.tendencia]}> {FLECHA[r.tendencia]}</span>}
                    </td>
                    <td>{!r.soy_yo && <Toque para={r.alumno_id} nombre={r.nombre} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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

      {facturas && facturas.length > 0 && (
        <section className="panel" id="facturas">
          <h2>Mis facturas</h2>
          <ul className="evolucion">
            {facturas.map((f) => (
              <li key={f.id}>
                <Link href={`/facturas/${f.id}`} className="num">{numeroFactura(f.serie, f.numero)}</Link>
                <span className="sub">{f.fecha.split("-").reverse().join("/")}</span>
                <span className="num">{euros(Number(f.total))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
