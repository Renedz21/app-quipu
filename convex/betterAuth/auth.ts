import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { createAuth } from "../auth";

/** Static instance for Better Auth schema CLI; runtime uses a real Convex ctx. */
export const auth = createAuth({} as GenericCtx<DataModel>);
