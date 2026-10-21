"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import jsQR from "jsqr";
import { comprobarAcceso } from "./actions";

// El mismo QR delante de la cámara se lee muchas veces por segundo: se ignora durante unos segundos
const PAUSA_MISMO_CODIGO = 4000;

export function Lector() {
  const [resultado, accion, comprobando] = useActionState(comprobarAcceso, null);
  const [camara, setCamara] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const ultimo = useRef({ codigo: "", momento: 0 });

  function comprobar(codigo: string) {
    const ahora = Date.now();
    if (codigo === ultimo.current.codigo && ahora - ultimo.current.momento < PAUSA_MISMO_CODIGO) return;
    ultimo.current = { codigo, momento: ahora };
    const form = new FormData();
    form.set("codigo", codigo);
    startTransition(() => accion(form));
  }
  // La función cambia en cada render; el bucle de la cámara usa siempre la última
  const comprobarRef = useRef(comprobar);
  useEffect(() => {
    comprobarRef.current = comprobar;
  });

  function alternarCamara() {
    setErrorCamara(null);
    if (!camara && !navigator.mediaDevices?.getUserMedia) {
      setErrorCamara("Este navegador no permite usar la cámara. Prueba con Chrome o Safari actualizados.");
      return;
    }
    setCamara(!camara);
  }

  useEffect(() => {
    if (!camara) return;
    let flujo: MediaStream | null = null;
    let parar = false;
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });

    function leer() {
      if (parar) return;
      const v = video.current;
      if (v && ctx && v.readyState >= v.HAVE_ENOUGH_DATA) {
        lienzo.width = v.videoWidth;
        lienzo.height = v.videoHeight;
        ctx.drawImage(v, 0, 0);
        const imagen = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        const qr = jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: "dontInvert" });
        if (qr?.data) comprobarRef.current(qr.data.trim());
      }
      setTimeout(() => requestAnimationFrame(leer), 200);
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((s) => {
        if (parar) return s.getTracks().forEach((t) => t.stop());
        flujo = s;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
        leer();
      })
      .catch(() => {
        setErrorCamara("No se pudo abrir la cámara. Revisa que el navegador tenga permiso para usarla.");
        setCamara(false);
      });

    return () => {
      parar = true;
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [camara]);

  return (
    <div className="grid2">
      <div
        className="resultado"
        style={{
          background: resultado ? (resultado.permitido ? "var(--ok-soft)" : "var(--bad-soft)") : "var(--bg)",
          color: resultado ? (resultado.permitido ? "var(--ok)" : "var(--bad)") : "var(--muted)",
          border: resultado ? 0 : "1px dashed var(--line)",
        }}
        aria-live="polite"
      >
        <div className="grande">{comprobando ? "Comprobando…" : resultado ? (resultado.permitido ? "Adelante" : "Acceso denegado") : "Esperando QR"}</div>
        {resultado?.nombre && <strong>{resultado.nombre}</strong>}
        {resultado?.motivo && <span>{resultado.motivo}</span>}
      </div>
      <div className="panel">
        <div className="row">
          <h2>Leer QR</h2>
          <button type="button" className="btn ghost" onClick={alternarCamara}>
            {camara ? "Apagar cámara" : "Usar la cámara"}
          </button>
        </div>
        {camara && <video ref={video} className="camara" muted playsInline aria-label="Imagen de la cámara" />}
        {errorCamara && <p className="aviso error">{errorCamara}</p>}
        {/* Los lectores QR USB o Bluetooth escriben el código y pulsan Intro, así que también vale un campo con foco */}
        <form action={accion} className="campos">
          <label>
            Código del alumno
            <input id="codigo" name="codigo" autoFocus={!camara} autoComplete="off" placeholder="Escanea el QR o pega el código" required />
          </label>
          <button className="btn" disabled={comprobando}>Comprobar</button>
        </form>
      </div>
    </div>
  );
}
