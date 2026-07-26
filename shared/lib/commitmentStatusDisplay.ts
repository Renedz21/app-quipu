import { formatLimaDate } from "@/shared/lib/date";

export type CommitmentCoverageStatusLabel = "covered" | "partial" | "uncovered";
export type CommitmentPaymentStatusLabel = "paid" | "pending" | "overdue";

export function formatCoverageStatusLabel(
  status: CommitmentCoverageStatusLabel,
): string {
  switch (status) {
    case "covered":
      return "Cubierto";
    case "partial":
      return "Parcial";
    case "uncovered":
      return "Sin cubrir";
  }
}

export function formatPaymentStatusLabel(
  paymentStatus: CommitmentPaymentStatusLabel,
  paidAtForCycle?: number,
): string {
  if (paymentStatus === "paid" && paidAtForCycle != null) {
    return `Pagado el ${formatLimaDate(paidAtForCycle)}`;
  }
  if (paymentStatus === "overdue") {
    return "Vencido";
  }
  return "Pendiente de pago";
}

export function formatCommitmentStatusLines(params: {
  coverageStatus: CommitmentCoverageStatusLabel;
  paymentStatus: CommitmentPaymentStatusLabel;
  paidAtForCycle?: number;
}): string[] {
  const lines: string[] = [formatCoverageStatusLabel(params.coverageStatus)];

  if (params.paymentStatus === "paid") {
    lines.push(formatPaymentStatusLabel("paid", params.paidAtForCycle));
    return lines;
  }

  if (params.paymentStatus === "overdue") {
    lines.push("Vencido");
    return lines;
  }

  if (params.coverageStatus === "covered") {
    lines.push("Pendiente de pago");
  }

  return lines;
}
