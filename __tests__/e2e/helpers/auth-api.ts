import type { APIRequestContext } from "@playwright/test";

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function createTestUser(suffix: string): TestUser {
  const stamp = `${Date.now()}-${suffix}`;
  return {
    name: "Smoke Test",
    email: `smoke-${stamp}@quipu.test`,
    password: "SmokeTest123!",
  };
}

function authHeaders(baseURL: string) {
  return {
    Origin: baseURL,
    Referer: `${baseURL}/sign-up`,
  };
}

export async function signUpViaApi(
  request: APIRequestContext,
  baseURL: string,
  user: TestUser,
) {
  const response = await request.post(`${baseURL}/api/auth/sign-up/email`, {
    headers: authHeaders(baseURL),
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Sign-up failed (${response.status()}): ${await response.text()}`,
    );
  }
}

export async function signInViaApi(
  request: APIRequestContext,
  baseURL: string,
  user: Pick<TestUser, "email" | "password">,
) {
  const response = await request.post(`${baseURL}/api/auth/sign-in/email`, {
    headers: {
      Origin: baseURL,
      Referer: `${baseURL}/sign-in`,
    },
    data: {
      email: user.email,
      password: user.password,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Sign-in failed (${response.status()}): ${await response.text()}`,
    );
  }
}

export async function getConvexJwt(
  request: APIRequestContext,
  baseURL: string,
): Promise<string> {
  const response = await request.get(`${baseURL}/api/auth/convex/token`, {
    headers: {
      Origin: baseURL,
      Referer: `${baseURL}/dashboard`,
    },
  });
  if (!response.ok()) {
    throw new Error(
      `Convex token failed (${response.status()}): ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { token?: string };
  if (!body.token) {
    throw new Error("Convex token response missing token field.");
  }
  return body.token;
}
