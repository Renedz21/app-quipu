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
import type * as billing from "../billing.js";
import type * as coachEngine from "../coachEngine.js";
import type * as dashboard from "../dashboard.js";
import type * as expenses from "../expenses.js";
import type * as fixedCommitments from "../fixedCommitments.js";
import type * as http from "../http.js";
import type * as incomeEvents from "../incomeEvents.js";
import type * as lib_appDataTables from "../lib/appDataTables.js";
import type * as lib_billingSync from "../lib/billingSync.js";
import type * as lib_budgetMath from "../lib/budgetMath.js";
import type * as lib_coachState from "../lib/coachState.js";
import type * as lib_commitmentCoverage from "../lib/commitmentCoverage.js";
import type * as lib_commitmentDueDate from "../lib/commitmentDueDate.js";
import type * as lib_commitmentPayment from "../lib/commitmentPayment.js";
import type * as lib_crisisResolution from "../lib/crisisResolution.js";
import type * as lib_cycleSavingsBreakdown from "../lib/cycleSavingsBreakdown.js";
import type * as lib_dashboardMath from "../lib/dashboardMath.js";
import type * as lib_email_authEmailLayout from "../lib/email/authEmailLayout.js";
import type * as lib_email_authEmailTokens from "../lib/email/authEmailTokens.js";
import type * as lib_email_authMail from "../lib/email/authMail.js";
import type * as lib_email_authTemplates from "../lib/email/authTemplates.js";
import type * as lib_email_send from "../lib/email/send.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_evaluateClosedCycle from "../lib/evaluateClosedCycle.js";
import type * as lib_evaluateCommitmentCoverage from "../lib/evaluateCommitmentCoverage.js";
import type * as lib_extraordinaryIncome from "../lib/extraordinaryIncome.js";
import type * as lib_extraordinarySavingsSurplus from "../lib/extraordinarySavingsSurplus.js";
import type * as lib_gamificationMath from "../lib/gamificationMath.js";
import type * as lib_incomeEventLogic from "../lib/incomeEventLogic.js";
import type * as lib_incomeHold from "../lib/incomeHold.js";
import type * as lib_rescueTransfer from "../lib/rescueTransfer.js";
import type * as lib_resetAppTables from "../lib/resetAppTables.js";
import type * as lib_savingsMath from "../lib/savingsMath.js";
import type * as lib_settingsCopy from "../lib/settingsCopy.js";
import type * as migrations_backfillCommitmentNextDueAt from "../migrations/backfillCommitmentNextDueAt.js";
import type * as migrations_backfillRequiredV25 from "../migrations/backfillRequiredV25.js";
import type * as movements from "../movements.js";
import type * as polar from "../polar.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as resetDb from "../resetDb.js";
import type * as savings from "../savings.js";
import type * as settings from "../settings.js";
import type * as testing from "../testing.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  billing: typeof billing;
  coachEngine: typeof coachEngine;
  dashboard: typeof dashboard;
  expenses: typeof expenses;
  fixedCommitments: typeof fixedCommitments;
  http: typeof http;
  incomeEvents: typeof incomeEvents;
  "lib/appDataTables": typeof lib_appDataTables;
  "lib/billingSync": typeof lib_billingSync;
  "lib/budgetMath": typeof lib_budgetMath;
  "lib/coachState": typeof lib_coachState;
  "lib/commitmentCoverage": typeof lib_commitmentCoverage;
  "lib/commitmentDueDate": typeof lib_commitmentDueDate;
  "lib/commitmentPayment": typeof lib_commitmentPayment;
  "lib/crisisResolution": typeof lib_crisisResolution;
  "lib/cycleSavingsBreakdown": typeof lib_cycleSavingsBreakdown;
  "lib/dashboardMath": typeof lib_dashboardMath;
  "lib/email/authEmailLayout": typeof lib_email_authEmailLayout;
  "lib/email/authEmailTokens": typeof lib_email_authEmailTokens;
  "lib/email/authMail": typeof lib_email_authMail;
  "lib/email/authTemplates": typeof lib_email_authTemplates;
  "lib/email/send": typeof lib_email_send;
  "lib/entitlements": typeof lib_entitlements;
  "lib/evaluateClosedCycle": typeof lib_evaluateClosedCycle;
  "lib/evaluateCommitmentCoverage": typeof lib_evaluateCommitmentCoverage;
  "lib/extraordinaryIncome": typeof lib_extraordinaryIncome;
  "lib/extraordinarySavingsSurplus": typeof lib_extraordinarySavingsSurplus;
  "lib/gamificationMath": typeof lib_gamificationMath;
  "lib/incomeEventLogic": typeof lib_incomeEventLogic;
  "lib/incomeHold": typeof lib_incomeHold;
  "lib/rescueTransfer": typeof lib_rescueTransfer;
  "lib/resetAppTables": typeof lib_resetAppTables;
  "lib/savingsMath": typeof lib_savingsMath;
  "lib/settingsCopy": typeof lib_settingsCopy;
  "migrations/backfillCommitmentNextDueAt": typeof migrations_backfillCommitmentNextDueAt;
  "migrations/backfillRequiredV25": typeof migrations_backfillRequiredV25;
  movements: typeof movements;
  polar: typeof polar;
  profiles: typeof profiles;
  progress: typeof progress;
  resetDb: typeof resetDb;
  savings: typeof savings;
  settings: typeof settings;
  testing: typeof testing;
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
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
};
