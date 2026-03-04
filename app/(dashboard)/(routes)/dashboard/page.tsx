import { api } from "@/convex/_generated/api";
import { preloadAuthQuery } from "@/lib/auth-server";
import Client from "@/modules/dashboard/components/client";

// Auth and onboarding checks are handled by the parent layout.
export default async function DashboardPage() {
  const preloaded = await preloadAuthQuery(api.payday.getDashboardData);

  return (
    <section>
      <Client preloaded={preloaded} />
    </section>
  );
}
