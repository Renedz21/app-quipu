import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/core/components/ui/card";
import { fetchAuthQuery } from "@/lib/auth-server";
import { NewGoalDialog } from "@/modules/savings/components/new-goal-dialog";
import { WithdrawButton } from "@/modules/savings/components/withdraw-button";
import { Shield, TrendingUp } from "lucide-react";
import type React from "react";

export default async function SavingsPage() {
  const [subEnvelopes, goals, profile] = await Promise.all([
    fetchAuthQuery(api.savings.getSavingsSubEnvelopes),
    fetchAuthQuery(api.savings.getSavingsGoals),
    fetchAuthQuery(api.profiles.getMyProfile),
  ]);

  if (!profile || !subEnvelopes) return null;

  const { currencySymbol, currencyLocale } = profile;

  const fmt = (n: number) =>
    `${currencySymbol} ${n.toLocaleString(currencyLocale, { maximumFractionDigits: 0 })}`;

  const totalSaved = subEnvelopes.reduce((s, e) => s + e.currentAmount, 0);

  const emergency = subEnvelopes.find((s) => s.subEnvelopeId === "emergency");
  const investment = subEnvelopes.find((s) => s.subEnvelopeId === "investment");

  const mainSubs = [
    emergency && {
      ...emergency,
      icon: <Shield className="w-5 h-5 text-envelope-savings" />,
    },
    investment && {
      ...investment,
      icon: <TrendingUp className="w-5 h-5 text-envelope-savings" />,
    },
  ].filter(Boolean) as (NonNullable<typeof emergency> & {
    icon: React.ReactNode;
  })[];

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tu Ahorro</h1>
        <p className="text-muted-foreground">
          Total acumulado:{" "}
          <span className="font-bold text-envelope-savings">
            {fmt(totalSaved)}
          </span>
        </p>
      </div>

      {/* Sub-envelopes: emergency + investment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {mainSubs.map((sub, i) => (
          <div
            key={sub._id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Card className="h-full">
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {sub.icon}
                    <span className="font-semibold">{sub.label}</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">
                    {Math.round(sub.progress)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-envelope-savings transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(sub.progress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {fmt(sub.currentAmount)}
                  </span>
                  <span className="font-medium">
                    Meta: {fmt(sub.goalAmount)}
                  </span>
                </div>
                {sub.subEnvelopeId === "emergency" && (
                  <WithdrawButton emergencyBalance={sub.currentAmount} />
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Savings goals */}
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">Mis Objetivos</h2>
        <p className="text-muted-foreground text-sm">
          Máximo {profile.plan === "free" ? "1 objetivo" : "3 objetivos simultáneos"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(goals ?? []).map((goal, i) => (
          <div
            key={goal._id}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{goal.emoji}</span>
                  <span className="font-semibold truncate">{goal.name}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-envelope-savings transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(
                        (goal.currentAmount / goal.targetAmount) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {fmt(goal.currentAmount)}
                  </span>
                  <span className="font-medium">{fmt(goal.targetAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {fmt(goal.monthlyRequired)} / mes · Meta: {goal.deadline}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* New goal card */}
        <NewGoalDialog currencySymbol={currencySymbol} />
      </div>
    </>
  );
}
