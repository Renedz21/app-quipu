import { Button } from "@/shared/components/ui/button";
import { REGISTER_CTA } from "../constants";
import { formatCycleDayLine } from "../lib/dashboard-math";

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

      <Button
        type="button"
        disabled
        title={`${REGISTER_CTA} · Próximamente`}
        className="hidden h-11 rounded-[11px] bg-ink px-[18px] text-sm font-semibold text-canvas hover:bg-ink/90 md:inline-flex"
      >
        <span className="relative mr-2 size-[13px]" aria-hidden>
          <span className="absolute top-[5.5px] left-0 h-0.5 w-[13px] rounded-sm bg-canvas" />
          <span className="absolute top-0 left-[5.5px] h-[13px] w-0.5 rounded-sm bg-canvas" />
        </span>
        {REGISTER_CTA}
      </Button>
    </div>
  );
}

export function buildDashboardCycleDayLine(
  daysElapsed: number,
  daysTotal: number,
): string {
  return formatCycleDayLine(daysElapsed, daysTotal);
}
