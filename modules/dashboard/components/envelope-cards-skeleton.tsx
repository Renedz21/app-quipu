import { Skeleton } from "@/shared/components/ui/skeleton";
import { ENVELOPES_SECTION_LABEL } from "../constants";

/**
 * Canon bloque 3 "Cargando": barra de sección, tres sobres y la fila
 * compromisos + coach, con pulso escalonado.
 */
export function EnvelopeCardsSkeleton() {
  return (
    <section aria-label="Cargando sobres" className="mt-5 space-y-5">
      <Skeleton variant="line" className="h-[11px] w-[90px] rounded-[5px]" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-[104px] rounded-[14px]" />
        <Skeleton className="h-[104px] rounded-[14px] [animation-delay:150ms]" />
        <Skeleton className="h-[104px] rounded-[14px] [animation-delay:300ms]" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
        <Skeleton className="h-[150px] rounded-[14px] [animation-delay:150ms]" />
        <Skeleton className="h-[150px] rounded-[14px] [animation-delay:300ms]" />
      </div>
    </section>
  );
}

export function EnvelopeSectionLabel() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
        {ENVELOPES_SECTION_LABEL}
      </span>
      <div className="h-px flex-1 bg-line-divider" />
    </div>
  );
}
