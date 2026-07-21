import { Skeleton } from "@/shared/components/ui/skeleton";
import { ENVELOPES_SECTION_LABEL } from "../constants";

export function EnvelopeCardsSkeleton() {
  return (
    <section aria-label="Cargando sobres" className="mb-2">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <div className="h-px flex-1 bg-line-divider" />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {(["needs", "wants", "savings"] as const).map((type) => (
          <div
            key={type}
            className="rounded-[14px] border border-line bg-card p-4 md:p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-32" />
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
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
