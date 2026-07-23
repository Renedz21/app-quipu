import { cn } from "@/shared/lib/utils";

type Props = {
  className?: string;
  /** Default matches quipu-2 safe icon (~13×15 in 30px box). */
  size?: "sm" | "md";
};

const sizeClass = {
  sm: "h-[13px] w-[11px]",
  md: "h-[15px] w-[13px]",
} as const;

/** CSS safe / shield icon from quipu-2.html Bloque 6 (no reicon). */
export function EmergencyFundIcon({ className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "relative inline-block text-current",
        sizeClass[size],
        className,
      )}
      aria-hidden
    >
      <span className="absolute bottom-0 w-full rounded-[3px] bg-current [height:60%]" />
      <span className="absolute top-0 left-[19%] w-[62%] rounded-t-[5px] border-2 border-b-0 border-current [height:53%]" />
    </span>
  );
}
