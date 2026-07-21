"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/shared/components/ui/button";

type CoachOption = {
  id: string;
  label: string;
};

type Props = {
  interactionId: Id<"coachInteractions">;
  options: CoachOption[];
};

export function CoachNudgeActions({ interactionId, options }: Props) {
  const resolveNudge = useMutation(api.coachEngine.resolveNudgeAction);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          size="sm"
          variant={option.id === "ignore" ? "outline" : "secondary"}
          onClick={() =>
            resolveNudge({
              interactionId,
              optionId: option.id as
                | "freeze_wants"
                | "suggest_rescue"
                | "ignore",
            })
          }
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
