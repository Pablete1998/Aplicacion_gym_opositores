import type { MetadataRoute } from "next";

// Permite instalar la web en el móvil como una app, con el icono de Fer's Team
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Fer's Team · Academia de opositores",
    short_name: "Fer's Team",
    description: "Tus marcas, tu evolución y tu QR de acceso a la academia",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    lang: "es",
    icons: [
      { src: "/icons/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
