const LIMA_TIMEZONE = "America/Lima";

export function formatIncomeDateLabel(now: number): string {
  const formatter = new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TIMEZONE,
    day: "numeric",
    month: "short",
  });
  const parts = formatter.formatToParts(new Date(now));
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "")
    .replace(/\.$/, "")
    .toLowerCase();
  return `Hoy · ${day} ${month}`;
}

export function buildIncomeDescription(
  sourceLabel: string,
  concept: string,
): string {
  const trimmedConcept = concept.trim();
  return trimmedConcept || sourceLabel;
}
