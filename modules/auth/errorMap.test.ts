import { describe, expect, it } from "vitest";
import { mapBetterAuthError } from "./errorMap";

describe("mapBetterAuthError", () => {
  it("maps SECURITY_ERROR to AUTH_PASSKEY_SECURITY_ERROR with verify-error variant", () => {
    const r = mapBetterAuthError("SECURITY_ERROR");
    expect(r.code).toBe("AUTH_PASSKEY_SECURITY_ERROR");
    expect(r.variant).toBe("verify-error");
    expect(r.message).toMatch(/No pudimos verificarte/);
  });

  it("maps lowercase security_error to the same code", () => {
    const r = mapBetterAuthError("security_error");
    expect(r.code).toBe("AUTH_PASSKEY_SECURITY_ERROR");
  });

  it("maps NETWORK_ERROR to network-error variant", () => {
    const r = mapBetterAuthError("NETWORK_ERROR");
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
    expect(r.variant).toBe("network-error");
  });

  it("maps network_error (lowercase) to the same code", () => {
    const r = mapBetterAuthError("network_error");
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
  });

  it("maps INVALID_CHALLENGE to expired-error variant", () => {
    const r = mapBetterAuthError("INVALID_CHALLENGE");
    expect(r.code).toBe("AUTH_PASSKEY_EXPIRED");
    expect(r.variant).toBe("expired-error");
  });

  it("maps USER_NOT_FOUND to error variant", () => {
    const r = mapBetterAuthError("USER_NOT_FOUND");
    expect(r.code).toBe("AUTH_USER_NOT_FOUND");
    expect(r.variant).toBe("error");
  });

  it("maps INVALID_EMAIL to AUTH_INVALID_CREDENTIALS", () => {
    const r = mapBetterAuthError("INVALID_EMAIL");
    expect(r.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("maps INVALID_PASSWORD to AUTH_INVALID_CREDENTIALS", () => {
    const r = mapBetterAuthError("INVALID_PASSWORD");
    expect(r.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("maps EMAIL_ALREADY_EXISTS to AUTH_EMAIL_TAKEN", () => {
    const r = mapBetterAuthError("EMAIL_ALREADY_EXISTS");
    expect(r.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("falls back to AUTH_UNKNOWN_ERROR for unknown codes", () => {
    const r = mapBetterAuthError("WEIRD_CODE");
    expect(r.code).toBe("AUTH_UNKNOWN_ERROR");
    expect(r.variant).toBe("error");
  });

  it("accepts object input with code property", () => {
    const r = mapBetterAuthError({ code: "NETWORK_ERROR" });
    expect(r.code).toBe("AUTH_PASSKEY_NETWORK_ERROR");
  });

  it("preserves custom message when provided in object input", () => {
    const r = mapBetterAuthError({
      code: "NETWORK_ERROR",
      message: "Custom message",
    });
    expect(r.message).toBe("Custom message");
  });
});
