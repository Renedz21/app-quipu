/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as coachEngine from "../coachEngine.js";
import type * as expenses from "../expenses.js";
import type * as fixedCommitments from "../fixedCommitments.js";
import type * as http from "../http.js";
import type * as incomeEvents from "../incomeEvents.js";
import type * as lib_budgetMath from "../lib/budgetMath.js";
import type * as lib_incomeEventLogic from "../lib/incomeEventLogic.js";
import type * as migrations_backfillRequiredV25 from "../migrations/backfillRequiredV25.js";
import type * as profiles from "../profiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  coachEngine: typeof coachEngine;
  expenses: typeof expenses;
  fixedCommitments: typeof fixedCommitments;
  http: typeof http;
  incomeEvents: typeof incomeEvents;
  "lib/budgetMath": typeof lib_budgetMath;
  "lib/incomeEventLogic": typeof lib_incomeEventLogic;
  "migrations/backfillRequiredV25": typeof migrations_backfillRequiredV25;
  profiles: typeof profiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
