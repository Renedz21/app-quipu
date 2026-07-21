import { Skeleton } from "@/shared/components/ui/skeleton";

export function DashboardHeroSkeleton() {
  return (
    <section
      aria-label="Cargando disponible hoy"
      className="mb-3.5 rounded-[18px] border border-line bg-qp-gradient p-5 shadow-[0_1px_2px_color-mix(in_oklch,var(--qp-ink)_3%,transparent)] md:p-7"
    >
      <div className="flex flex-col gap-6 md:flex-row md:gap-9">
        <div className="flex-[1.3]">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-14 w-48 md:h-16 md:w-64" />
          <Skeleton className="mt-4 h-4 w-full max-w-sm" />
        </div>
        <div className="flex-1 border-t border-qp-border pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-3 h-2 w-full rounded-full" />
          <Skeleton className="mt-4 h-8 w-32" />
        </div>
      </div>
    </section>
  );
}
