"use client";

import { useActionState, useState } from "react";
import { crearAcceso, restablecerPassword, type Credenciales } from "./actions";

function MostrarCredenciales({ estado }: { estado: Credenciales }) {
  if (!estado) return null;
  if (!estado.ok) return <p className="aviso error" style={{ gridColumn: "1 / -1" }}>{estado.error}</p>;
  return (
    <div className="aviso ok" style={{ gridColumn: "1 / -1" }}>
      Acceso listo. Pásale estos datos; tendrá que cambiar la contraseña al entrar:
      <br />
      Web: <strong>aplicaciongymopositores.vercel.app</strong> · Correo: <strong>{estado.email}</strong> · Contraseña provisional:{" "}
      <strong className="num">{estado.password}</strong>
    </div>
  );
}

export function NuevaPersona({ alumnosSinAcceso }: { alumnosSinAcceso: { id: string; nombre: string }[] }) {
  const [estado, enviar, creando] = useActionState(crearAcceso, null);
  const [rol, setRol] = useState("alumno");
  return (
    <form action={enviar} className="campos">
      <label>
        Rol
        <select id="rol" name="rol" value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="alumno">Alumno</option>
          <option value="preparador">Preparador</option>
          <option value="recepcion">Recepción</option>
          <option value="direccion">Dirección (administrador)</option>
        </select>
      </label>
      {rol === "alumno" && (
        <label>
          Ficha del alumno
          <select id="alumno_id" name="alumno_id" required>
            <option value="">Elige</option>
            {alumnosSinAcceso.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </label>
      )}
      <label>
        Nombre
        <input id="nombre" name="nombre" required autoComplete="off" />
      </label>
      <label>
        Correo
        <input id="email" name="email" type="email" required autoComplete="off" />
      </label>
      <button className="btn" disabled={creando}>{creando ? "Creando…" : "Dar acceso"}</button>
      <MostrarCredenciales estado={estado} />
    </form>
  );
}

export function Restablecer({ id }: { id: string }) {
  const [estado, enviar, enviando] = useActionState(restablecerPassword.bind(null, id), null);
  if (estado?.ok) return <span className="num" title="Contraseña provisional">{estado.password}</span>;
  return (
    <form action={enviar}>
      <button className="btn ghost" disabled={enviando}>{estado && !estado.ok ? "Error, reintentar" : "Nueva contraseña"}</button>
    </form>
  );
}
