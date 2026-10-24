import { perfilActual } from "@/lib/datos";
import { esNombreImagen } from "@/lib/preguntas";
import { createClient } from "@/lib/supabase/server";

// Las imágenes de las preguntas están en un almacén privado: la app las lee con la sesión de quien
// las pide (los permisos los pone Supabase) y las sirve desde su propio dominio
export async function GET(_request: Request, { params }: RouteContext<"/teoria/imagen/[nombre]">) {
  await perfilActual();
  const { nombre } = await params;
  if (!esNombreImagen(nombre)) return new Response("No encontrada", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("preguntas").download(nombre);
  if (error || !data) return new Response("No encontrada", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/png",
      // El nombre es único: si cambia la imagen, cambia el nombre
      "Cache-Control": "private, max-age=604800, immutable",
    },
  });
}
