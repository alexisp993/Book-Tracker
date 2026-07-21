"use client";

import * as React from "react";
import { PartyPopper, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/bar";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/lib/queries";
import type { GoalDTO } from "@/lib/types";

export function ReadingGoalCard() {
  const { data: goals = [], isLoading } = useGoals();
  const [open, setOpen] = React.useState(false);

  const currentYear = new Date().getFullYear();
  const yearGoal = goals.find((g) => g.type === "BOOKS" && (g.year === currentYear || g.year === null));

  if (isLoading) return null;

  return (
    <>
      <Card>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">
              {currentYear} Reading Goal
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpen(true)}
          >
            {yearGoal ? "Edit" : "Set Goal"}
          </Button>
        </div>

        {yearGoal ? (
          <GoalProgress goal={yearGoal} />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Set a reading goal to track your progress.
          </p>
        )}
      </Card>

      <GoalDialog
        open={open}
        goal={yearGoal}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function GoalProgress({ goal }: { goal: GoalDTO }) {
  const pct = Math.min(100, Math.round((goal.progress / goal.target) * 100));
  const done = goal.progress >= goal.target;

  return (
    <div className="mt-3 space-y-1.5">
      <ProgressBar value={pct} fillClass={done ? "bg-emerald-500" : "bg-primary"} />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {done ? (
          <>
            <PartyPopper className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
            {`Goal complete! ${goal.progress} / ${goal.target} books`}
          </>
        ) : (
          `${goal.progress} / ${goal.target} books · ${pct}%`
        )}
      </p>
    </div>
  );
}

function GoalDialog({
  open,
  goal,
  onClose,
}: {
  open: boolean;
  goal: GoalDTO | undefined;
  onClose: () => void;
}) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const currentYear = new Date().getFullYear();

  const [target, setTarget] = React.useState(
    goal?.target.toString() ?? "12",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTarget(goal?.target.toString() ?? "12");
      setError(null);
    }
  }, [open, goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseInt(target, 10);
    if (!t || t < 1) {
      setError("Please enter a target of at least 1.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (goal) {
        await updateGoal.mutateAsync({ id: goal.id, input: { target: t } });
      } else {
        await createGoal.mutateAsync({
          title: `${currentYear} Reading Goal`,
          type: "BOOKS",
          target: t,
          year: currentYear,
        });
      }
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    setSubmitting(true);
    try {
      await deleteGoal.mutateAsync(goal.id);
      onClose();
    } catch {
      setError("Could not delete goal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal ? "Edit Reading Goal" : "Set a Reading Goal"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">
            Books to read in {currentYear}
          </Label>
          <Input
            id="goal-target"
            type="number"
            min={1}
            max={9999}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 12"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          {goal ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={submitting}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : goal ? "Save" : "Set Goal"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
