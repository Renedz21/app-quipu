const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

export function formatCycle(
  paydays: number[],
  payFrequency: "monthly" | "biweekly",
): string {
  const now = new Date();
  const day = paydays[0] ?? 1;
  const start = new Date(now.getFullYear(), now.getMonth(), day);

  if (payFrequency === "biweekly" && paydays.length >= 2) {
    const [d1, d2] = [...paydays].sort((a, b) => a - b);
    return `${d1} y ${d2} ${MONTHS[now.getMonth()]}`;
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return `${start.getDate()} ${MONTHS[start.getMonth()]} → ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}
