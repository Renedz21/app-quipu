"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { fromConvexError } from "@/core/errors";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  NEW_GOAL_CANCEL,
  NEW_GOAL_LABEL,
  NEW_GOAL_SUBMIT,
  NEW_GOAL_TARGET_LABEL,
  NEW_GOAL_TITLE,
} from "../constants";
import { parseOptionalTargetCents } from "../lib/savingsCopy";
import { SavingsFormShell } from "./savings-form-shell";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewGoalDialog({ open, onOpenChange }: Props) {
  const createGoal = useMutation(api.savings.createSavingsGoal);
  const [label, setLabel] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await createGoal({
        label,
        targetAmount: parseOptionalTargetCents(targetInput),
      });
      toast.success("Meta creada.");
      setLabel("");
      setTargetInput("");
      onOpenChange(false);
    } catch (error) {
      toast.error(fromConvexError(error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SavingsFormShell
      open={open}
      onOpenChange={onOpenChange}
      title={NEW_GOAL_TITLE}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="goal-label">{NEW_GOAL_LABEL}</Label>
          <Input
            id="goal-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={40}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal-target">{NEW_GOAL_TARGET_LABEL}</Label>
          <Input
            id="goal-target"
            value={targetInput}
            onChange={(event) => setTargetInput(event.target.value)}
            inputMode="decimal"
            placeholder="3000"
          />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting || !label.trim()}>
            {NEW_GOAL_SUBMIT}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {NEW_GOAL_CANCEL}
          </Button>
        </div>
      </form>
    </SavingsFormShell>
  );
}
