// Sin tildes ni mayúsculas, para que «jose» encuentre «José»
export const normal = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
