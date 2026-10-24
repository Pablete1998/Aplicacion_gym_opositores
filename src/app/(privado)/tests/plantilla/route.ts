import { perfilActual } from "@/lib/datos";
import { COLUMNAS } from "@/lib/preguntas";

const EJEMPLOS = [
  ["Tema 1. La Constitución Española", "¿En qué año se aprobó la Constitución Española?", "1976", "1978", "1982", "", "B", "Referéndum del 6 de diciembre de 1978"],
  ["Tema 1. La Constitución Española", "¿Cuántos artículos tiene la Constitución?", "169", "159", "196", "179", "A", ""],
];

// Plantilla en CSV con punto y coma, que Excel en español abre ya en columnas
export async function GET() {
  const perfil = await perfilActual();
  if (perfil.rol !== "direccion" && perfil.rol !== "preparador") return new Response("No autorizado", { status: 403 });
  const celda = (c: string) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  const csv = "﻿" + [COLUMNAS as readonly string[], ...EJEMPLOS].map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-preguntas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
