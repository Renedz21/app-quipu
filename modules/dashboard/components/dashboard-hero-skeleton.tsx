import { Skeleton } from "@/shared/components/ui/skeleton";

/** Canon bloque 3 "Cargando": hero como bloque plano único. */
export function DashboardHeroSkeleton() {
  return (
    <Skeleton
      role="status"
      aria-label="Cargando disponible hoy"
      className="h-[132px] w-full rounded-[18px] [animation-delay:150ms]"
    />
  );
}
