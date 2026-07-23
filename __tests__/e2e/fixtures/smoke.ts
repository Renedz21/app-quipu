import { test as base, expect, type Page } from "@playwright/test";
import type { ConvexHttpClient } from "convex/browser";
import {
  createTestUser,
  getConvexJwt,
  signUpViaApi,
  type TestUser,
} from "../helpers/auth-api";
import { createAuthenticatedConvexClient } from "../helpers/convex-client";
import { loadEnvLocal } from "../helpers/env";

loadEnvLocal();

type AuthSession = {
  user: TestUser;
  token: string;
};

type SmokeFixtures = {
  smokeUser: TestUser;
  authSession: AuthSession;
  convexClient: ConvexHttpClient;
  authedPage: Page;
};

export const test = base.extend<SmokeFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture with no dependencies
  smokeUser: async ({}, use, testInfo) => {
    await use(createTestUser(String(testInfo.parallelIndex)));
  },

  authSession: async ({ request, baseURL, smokeUser }, use) => {
    if (!baseURL) throw new Error("playwright baseURL is required.");
    await signUpViaApi(request, baseURL, smokeUser);
    const token = await getConvexJwt(request, baseURL);
    await use({ user: smokeUser, token });
  },

  convexClient: async ({ authSession }, use) => {
    await use(createAuthenticatedConvexClient(authSession.token));
  },

  authedPage: async ({ page, request, authSession: _authSession }, use) => {
    void _authSession;
    const state = await request.storageState();
    await page.context().addCookies(state.cookies);
    await use(page);
  },
});

export { expect };
