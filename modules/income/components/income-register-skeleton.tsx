import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Canon bloque 5 "Cargando": formulario a la izquierda (monto, fuente,
 * fecha), panel de impacto a la derecha y acciones al final.
 */
export function IncomeRegisterSkeleton() {
  return (
    <div
      role="status"
      aria-label="Preparando el ingreso"
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8"
    >
      <Skeleton className="h-7 w-[220px] rounded-lg" />
      <Skeleton
        variant="line"
        className="mt-2 h-[13px] w-[300px] max-w-full rounded-[5px]"
      />

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-7">
        <div className="flex flex-col gap-4">
          <Skeleton variant="line" className="h-3 w-[130px] rounded-[5px]" />
          <Skeleton className="h-16 rounded-[14px]" />
          <Skeleton
            variant="line"
            className="h-3 w-[110px] rounded-[5px] [animation-delay:150ms]"
          />
          <div className="flex flex-wrap gap-[9px]">
            <Skeleton className="h-10 w-[110px] rounded-[11px]" />
            <Skeleton className="h-10 w-[130px] rounded-[11px] [animation-delay:150ms]" />
            <Skeleton className="h-10 w-[90px] rounded-[11px] [animation-delay:300ms]" />
            <Skeleton className="h-10 w-[100px] rounded-[11px] [animation-delay:150ms]" />
          </div>
          <Skeleton
            variant="line"
            className="h-3 w-20 rounded-[5px] [animation-delay:300ms]"
          />
          <Skeleton className="h-[46px] w-[220px] max-w-full rounded-[11px]" />
        </div>
        <Skeleton className="h-48 rounded-2xl [animation-delay:150ms] lg:h-[296px]" />
      </div>

      <div className="mt-7 flex justify-end gap-2.5">
        <Skeleton className="h-[46px] w-[110px] rounded-[11px]" />
        <Skeleton className="h-[46px] w-[160px] rounded-[11px] [animation-delay:150ms]" />
      </div>
    </div>
  );
}
