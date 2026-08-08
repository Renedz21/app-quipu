"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { SpaceProposalKind } from "../lib/space-proposal-labels";
import { usePendingProposals } from "../queries";
import { SpaceProposalResponseList } from "./space-proposal-response-list";

type ProposalMember = {
  profileId: Id<"profiles">;
  name: string;
};

type Props = {
  spaceId: Id<"financialSpaces">;
  viewerProfileId: Id<"profiles">;
  members: ProposalMember[];
  currencyCode: string;
  excludeKinds?: SpaceProposalKind[];
};

export function SpaceProposalBanner({
  spaceId,
  viewerProfileId,
  members,
  currencyCode,
  excludeKinds = ["expected_contribution"],
}: Props) {
  const proposals = usePendingProposals(spaceId);

  if (proposals === undefined || proposals.length === 0) return null;

  const visible = proposals.filter(
    (proposal) => !excludeKinds.includes(proposal.kind),
  );
  if (visible.length === 0) return null;

  return (
    <SpaceProposalResponseList
      spaceId={spaceId}
      proposals={visible}
      viewerProfileId={viewerProfileId}
      members={members}
      currencyCode={currencyCode}
    />
  );
}
