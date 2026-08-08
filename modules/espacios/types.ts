import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

export type MySpaceRow = FunctionReturnType<
  typeof api.spaces.getMySpaces
>[number];

export type SpaceOverview = FunctionReturnType<typeof api.spaces.getOverview>;
