/** Máscara de data brasileira para inputs de texto: DD/MM/AAAA. */
export function maskDateBR(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  const partes = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return partes.join('/');
}

/** "10/03/1968" -> "1968-03-10". Retorna null se incompleto/ inválido. */
export function brParaISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  const iso = `${aaaa}-${mm}-${dd}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return iso;
}

/** "1968-03-10" -> "10/03/1968". Vazio quando null. */
export function isoParaBR(iso: string | null): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, aaaa, mm, dd] = m;
  return `${dd}/${mm}/${aaaa}`;
}
