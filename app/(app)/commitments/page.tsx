import { Suspense } from "react";
import { requireOnboardedProfile } from "@/auth/auth-server";
import { pageMetadata } from "@/core/seo";
import {
  CommitmentsView,
  CommitmentsViewSkeleton,
} from "@/modules/commitments/components/commitments-view";

export const metadata = pageMetadata({
  title: "Compromisos",
  path: "/commitments",
});

export default async function CommitmentsPage() {
  await requireOnboardedProfile();

  return (
    <Suspense fallback={<CommitmentsViewSkeleton />}>
      <CommitmentsView />
    </Suspense>
  );
}
