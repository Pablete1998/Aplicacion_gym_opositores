"use client";

import { useEffect, useState } from "react";

// QR a pantalla completa sobre fondo blanco para que el lector de la entrada lo lea a la primera
export function QrGrande({ svg, nombre, cuotaAlDia }: { svg: string; nombre: string; cuotaAlDia: boolean }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    // Que la pantalla no se apague mientras se enseña el QR (si el navegador lo permite)
    let bloqueo: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((b) => (bloqueo = b)).catch(() => {});
    const cerrarConEsc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", cerrarConEsc);
    return () => {
      bloqueo?.release().catch(() => {});
      window.removeEventListener("keydown", cerrarConEsc);
    };
  }, [abierto]);

  return (
    <>
      <button type="button" className="btn" onClick={() => setAbierto(true)}>Enseñar en grande</button>
      {abierto && (
        <div className="qr-grande" role="dialog" aria-modal="true" aria-label="Mi QR de acceso" onClick={() => setAbierto(false)}>
          <div className="qr-grande-codigo" dangerouslySetInnerHTML={{ __html: svg }} />
          <strong>{nombre}</strong>
          {cuotaAlDia ? <span className="pill p-objetivo">Cuota al día</span> : <span className="pill p-no_apto">Cuota pendiente</span>}
          <span className="qr-grande-cerrar">Toca para cerrar</span>
        </div>
      )}
    </>
  );
}
