"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Evento de Chrome y Android para ofrecer la instalación; no está en los tipos de TypeScript
interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const nada = () => () => {};
const esIphoneSinInstalar = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone;

// Invita a instalar la web como app: botón en Android y Chrome, instrucciones en iPhone
export function Instalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const iphone = useSyncExternalStore(nada, esIphoneSinInstalar, () => false);

  useEffect(() => {
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const instalada = () => setEvento(null);
    window.addEventListener("beforeinstallprompt", guardar);
    window.addEventListener("appinstalled", instalada);
    return () => {
      window.removeEventListener("beforeinstallprompt", guardar);
      window.removeEventListener("appinstalled", instalada);
    };
  }, []);

  async function instalar() {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  if (evento) {
    return (
      <section className="panel instalar">
        <div className="row">
          <div>
            <h2>Instala la app</h2>
            <p className="sub">Tendrás Fer&apos;s Team en el móvil como una app más, con tu QR a mano.</p>
          </div>
          <button type="button" className="btn" onClick={instalar}>Instalar</button>
        </div>
      </section>
    );
  }
  if (iphone) {
    return (
      <section className="panel instalar">
        <h2>Instala la app</h2>
        <p className="sub">
          En Safari, pulsa el botón de compartir <span aria-hidden="true">(el cuadrado con la flecha)</span> y luego
          «Añadir a pantalla de inicio».
        </p>
      </section>
    );
  }
  return null;
}
