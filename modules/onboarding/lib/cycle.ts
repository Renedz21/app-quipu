const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

export function formatCycle(day: number): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), day);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}
