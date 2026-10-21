import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave secreta: solo en el servidor y solo tras comprobar que quien llama es dirección
export function createAdminClient() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hayClaveAdmin = () => Boolean(process.env.SUPABASE_SECRET_KEY);
