import { Skeleton } from "@/shared/components/ui/skeleton";
import { ENVELOPES_SECTION_LABEL } from "../constants";

/**
 * Canon bloque 3 "Cargando": barra de sección, tres sobres y la fila
 * compromisos + coach, con pulso escalonado.
 */
export function EnvelopeCardsSkeleton() {
  return (
    <section
      aria-label="Cargando sobres"
      className="mt-3 space-y-3 md:mt-5 md:space-y-5"
    >
      <Skeleton variant="line" className="h-2.75 w-22.5 rounded-[5px]" />
      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        <Skeleton className="h-24 rounded-[14px] md:h-26" />
        <Skeleton className="h-24 rounded-[14px] [animation-delay:150ms] md:h-26" />
        <Skeleton className="h-24 rounded-[14px] [animation-delay:300ms] md:h-26" />
      </div>
      <Skeleton className="h-32 rounded-[14px] [animation-delay:150ms] md:h-37.5" />
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Skeleton className="h-32 rounded-[14px] [animation-delay:150ms] md:h-37.5" />
        <Skeleton className="h-32 rounded-[14px] [animation-delay:300ms] md:h-37.5" />
      </div>
    </section>
  );
}

export function EnvelopeSectionLabel() {
  return (
    <div className="mb-2 flex items-center gap-2 md:mb-3">
      <span className="font-mono text-[10.5px] uppercase tracking-widest text-mute">
        {ENVELOPES_SECTION_LABEL}
      </span>
      <div className="h-px flex-1 bg-line-divider" />
    </div>
  );
}
