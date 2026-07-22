import { requireOnboardedProfile } from "@/auth/auth-server";
import { pageMetadata } from "@/core/seo";
import { MOVE_SURPLUS_PAGE_TITLE } from "@/modules/savings/constants";
import { MoveSurplusView } from "@/modules/savings/components/move-surplus-view";

export const metadata = pageMetadata({
  title: MOVE_SURPLUS_PAGE_TITLE,
  path: "/savings/move",
});

type SearchParams = Promise<{ from?: string }>;

export default async function MoveSurplusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOnboardedProfile();
  const params = await searchParams;
  const initialFromEnvelope =
    params.from === "needs" || params.from === "wants" ? params.from : undefined;

  return <MoveSurplusView initialFromEnvelope={initialFromEnvelope} />;
}
