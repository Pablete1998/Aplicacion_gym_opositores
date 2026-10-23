import { perfilActual } from "@/lib/datos";
import { csvFacturas, rangoPeriodo } from "@/lib/facturas";
import { mesActual } from "@/lib/informes";
import { cargarFacturas } from "../listado";

// Listado de facturas de un mes o trimestre, en CSV que Excel abre tal cual, para mandar al gestor
export async function GET(request: Request) {
  const perfil = await perfilActual();
  if (perfil.rol !== "direccion") return new Response("No autorizado", { status: 403 });
  const pedido = new URL(request.url).searchParams.get("periodo") ?? "";
  const periodo = rangoPeriodo(pedido) ? pedido : mesActual();
  const rango = rangoPeriodo(periodo)!;
  const facturas = await cargarFacturas(rango.desde, rango.hasta);
  return new Response(csvFacturas(facturas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="facturas-${periodo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
