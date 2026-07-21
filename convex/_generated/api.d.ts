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
import type * as dashboard from "../dashboard.js";
import type * as expenses from "../expenses.js";
import type * as fixedCommitments from "../fixedCommitments.js";
import type * as http from "../http.js";
import type * as incomeEvents from "../incomeEvents.js";
import type * as lib_budgetMath from "../lib/budgetMath.js";
import type * as lib_coachState from "../lib/coachState.js";
import type * as lib_commitmentCoverage from "../lib/commitmentCoverage.js";
import type * as lib_crisisResolution from "../lib/crisisResolution.js";
import type * as lib_dashboardMath from "../lib/dashboardMath.js";
import type * as lib_evaluateClosedCycle from "../lib/evaluateClosedCycle.js";
import type * as lib_evaluateCommitmentCoverage from "../lib/evaluateCommitmentCoverage.js";
import type * as lib_gamificationMath from "../lib/gamificationMath.js";
import type * as lib_incomeEventLogic from "../lib/incomeEventLogic.js";
import type * as lib_rescueTransfer from "../lib/rescueTransfer.js";
import type * as lib_savingsMath from "../lib/savingsMath.js";
import type * as lib_settingsCopy from "../lib/settingsCopy.js";
import type * as migrations_backfillRequiredV25 from "../migrations/backfillRequiredV25.js";
import type * as movements from "../movements.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as savings from "../savings.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  coachEngine: typeof coachEngine;
  dashboard: typeof dashboard;
  expenses: typeof expenses;
  fixedCommitments: typeof fixedCommitments;
  http: typeof http;
  incomeEvents: typeof incomeEvents;
  "lib/budgetMath": typeof lib_budgetMath;
  "lib/coachState": typeof lib_coachState;
  "lib/commitmentCoverage": typeof lib_commitmentCoverage;
  "lib/crisisResolution": typeof lib_crisisResolution;
  "lib/dashboardMath": typeof lib_dashboardMath;
  "lib/evaluateClosedCycle": typeof lib_evaluateClosedCycle;
  "lib/evaluateCommitmentCoverage": typeof lib_evaluateCommitmentCoverage;
  "lib/gamificationMath": typeof lib_gamificationMath;
  "lib/incomeEventLogic": typeof lib_incomeEventLogic;
  "lib/rescueTransfer": typeof lib_rescueTransfer;
  "lib/savingsMath": typeof lib_savingsMath;
  "lib/settingsCopy": typeof lib_settingsCopy;
  "migrations/backfillRequiredV25": typeof migrations_backfillRequiredV25;
  movements: typeof movements;
  profiles: typeof profiles;
  progress: typeof progress;
  savings: typeof savings;
  settings: typeof settings;
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
