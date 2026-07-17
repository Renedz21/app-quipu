import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { authPrimaryButtonClass } from "../constants";

export function SuccessStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-7 flex size-[88px] items-center justify-center rounded-full bg-qp shadow-glow">
        <span
          aria-hidden
          className="mt-[-6px] block h-9 w-5 rotate-45 border-canvas border-r-4 border-b-4"
        />
      </div>
      <h1 className="font-serif font-medium text-[32px] text-ink">
        Tu cuenta está lista
      </h1>
      <p className="mt-2.5 max-w-[380px] text-[15px] text-mute leading-[1.55]">
        Empecemos por ordenar tu sistema. En unos pasos sabrás exactamente
        cuánto puedes gastar.
      </p>
      <Button
        type="button"
        onClick={onContinue}
        className={cn(authPrimaryButtonClass, "mt-[30px] w-auto px-[30px]")}
      >
        Ir al onboarding →
      </Button>
    </div>
  );
}
