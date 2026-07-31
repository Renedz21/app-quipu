import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function CycleCorrectMoneyField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      {hint ? <p className="mt-0.5 text-[11px] text-mute">{hint}</p> : null}
      <Input
        id={id}
        className="mt-1.5"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
