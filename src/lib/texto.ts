// Sin tildes ni mayúsculas, para que «jose» encuentre «José»
export const normal = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Los ids de la base de datos son UUID; lo que no lo sea se descarta antes de consultar
export const esUuid = (texto: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto);
