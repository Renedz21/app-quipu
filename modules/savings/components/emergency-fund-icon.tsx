type Props = {
  className?: string;
};

export function EmergencyFundIcon({ className }: Props) {
  return (
    <span className={`relative inline-block text-current ${className ?? ""}`}>
      <span className="absolute bottom-0 block h-[9px] w-full rounded-[3px] bg-current md:h-[10px]" />
      <span className="absolute top-0 left-[2.5px] block h-[8px] w-[8px] rounded-t-[5px] border-2 border-b-0 border-current md:left-[3px] md:h-[9px] md:w-[8px]" />
    </span>
  );
}
