import { urlImagen } from "@/lib/preguntas";

// Imagen de una pregunta (series de figuras, gráficos…). No pasa por next/image: la sirve la propia app
// desde el almacén privado y ya llega con el tamaño con el que se subió.
export function ImagenPregunta({ nombre, alt = "Imagen de la pregunta" }: { nombre: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={urlImagen(nombre)} alt={alt} className="imagen-pregunta" loading="lazy" />;
}
