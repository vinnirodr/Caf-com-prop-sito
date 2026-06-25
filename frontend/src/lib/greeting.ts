/** Saudação calorosa conforme o horário do dispositivo. */
export function saudacaoPorHorario(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Bom dia,';
  if (h >= 12 && h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}
