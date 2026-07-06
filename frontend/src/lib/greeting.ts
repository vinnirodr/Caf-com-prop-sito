/** Saudação calorosa conforme o horário do dispositivo (sem pontuação). */
export function saudacaoPorHorario(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Saudação já personalizada: "Bom dia, Vinícius!" quando há nome; senão só a
 * saudação do horário. Usa apenas o primeiro nome.
 */
export function saudacaoParaNome(nome?: string | null, date = new Date()): string {
  const base = saudacaoPorHorario(date);
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? `${base}, ${primeiro}!` : base;
}
