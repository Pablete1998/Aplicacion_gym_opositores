"use client";

import { useActionState, useState } from "react";
import type { RespuestaAlumno } from "./actions";

export interface Catalogo {
  oposiciones: { id: string; nombre: string }[];
  grupos: { id: string; nombre: string; oposicion_id: string }[];
}

export interface ValoresAlumno {
  nombre: string;
  apellidos: string;
  sexo: "H" | "M" | "";
  fecha_nacimiento: string | null;
  oposicion_id: string;
  grupo_id: string | null;
  cuota_al_dia: boolean;
  activo: boolean;
  nif: string | null;
  domicilio: string | null;
  cuota_importe: number | null;
}

export function FormularioAlumno({
  accion,
  catalogo,
  valores,
  esAlta,
}: {
  accion: (prev: RespuestaAlumno, form: FormData) => Promise<RespuestaAlumno>;
  catalogo: Catalogo;
  valores?: ValoresAlumno;
  esAlta: boolean;
}) {
  const [estado, enviar, guardando] = useActionState(accion, null);
  const [oposicion, setOposicion] = useState(valores?.oposicion_id ?? catalogo.oposiciones[0]?.id ?? "");
  const grupos = catalogo.grupos.filter((g) => g.oposicion_id === oposicion);

  return (
    <form action={enviar} className="campos">
      <label>
        Nombre
        <input id="nombre" name="nombre" defaultValue={valores?.nombre} required autoComplete="off" />
      </label>
      <label>
        Apellidos
        <input id="apellidos" name="apellidos" defaultValue={valores?.apellidos} required autoComplete="off" />
      </label>
      <label>
        Sexo (para el baremo)
        <select id="sexo" name="sexo" defaultValue={valores?.sexo ?? ""} required>
          <option value="" disabled>Elige</option>
          <option value="M">Mujer</option>
          <option value="H">Hombre</option>
        </select>
      </label>
      <label>
        Fecha de nacimiento
        <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" defaultValue={valores?.fecha_nacimiento ?? ""} />
      </label>
      <label>
        Oposición
        <select id="oposicion_id" name="oposicion_id" value={oposicion} onChange={(e) => setOposicion(e.target.value)} required>
          {catalogo.oposiciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
      </label>
      <label>
        Grupo
        <select id="grupo_id" name="grupo_id" defaultValue={valores?.grupo_id ?? ""} key={oposicion}>
          <option value="">Sin grupo</option>
          {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input id="cuota_al_dia" name="cuota_al_dia" type="checkbox" defaultChecked={valores?.cuota_al_dia ?? true} style={{ width: "auto" }} />
        Cuota al día (si no, se le deniega la entrada)
      </label>
      <label>
        NIF (para factura completa)
        <input id="nif" name="nif" defaultValue={valores?.nif ?? ""} autoComplete="off" placeholder="Sin NIF: factura simplificada" />
      </label>
      <label>
        Domicilio (opcional)
        <input id="domicilio" name="domicilio" defaultValue={valores?.domicilio ?? ""} autoComplete="off" />
      </label>
      <label>
        Cuota mensual, si paga distinto (€)
        <input id="cuota_importe" name="cuota_importe" type="number" min="0" step="0.01" defaultValue={valores?.cuota_importe ?? ""} placeholder="Precio general" />
      </label>
      {!esAlta && (
        <label>
          Estado
          <select id="activo" name="activo" defaultValue={valores?.activo === false ? "off" : "on"}>
            <option value="on">Activo</option>
            <option value="off">De baja</option>
          </select>
        </label>
      )}
      {esAlta && (
        <label style={{ display: "flex", gap: 8, alignItems: "center", gridColumn: "1 / -1" }}>
          <input id="consentimiento" name="consentimiento" type="checkbox" required style={{ width: "auto" }} />
          El alumno ha dado su consentimiento para que la academia guarde sus datos y resultados.
        </label>
      )}
      {estado?.error && <p className="aviso error" style={{ gridColumn: "1 / -1" }}>{estado.error}</p>}
      <button className="btn" disabled={guardando}>{guardando ? "Guardando…" : esAlta ? "Dar de alta" : "Guardar cambios"}</button>
    </form>
  );
}
