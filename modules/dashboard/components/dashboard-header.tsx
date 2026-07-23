import { formatCycleDayLine } from "../lib/dashboard-math";
import { DashboardHeaderActions } from "./dashboard-header-actions";

type Props = {
  name: string;
  cycleDayLine?: string | null;
};

export function DashboardHeader({ name, cycleDayLine }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[27px] font-medium leading-tight text-ink md:text-[27px]">
          Hola, {name}
        </h1>
        {cycleDayLine ? (
          <p className="mt-0.5 text-[13.5px] text-mute">{cycleDayLine}</p>
        ) : null}
      </div>

      <DashboardHeaderActions />
    </div>
  );
}

export function buildDashboardCycleDayLine(
  daysElapsed: number,
  daysTotal: number,
): string {
  return formatCycleDayLine(daysElapsed, daysTotal);
}
