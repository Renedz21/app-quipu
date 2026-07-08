import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeyPromptButton } from "./passkey-prompt-button";

// Mock del wrapper de passkey
vi.mock("@/modules/auth/passkey", () => ({
  signInWithPasskey: vi.fn(),
  registerPasskey: vi.fn(),
}));

// Mock de useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { signInWithPasskey, registerPasskey } from "@/modules/auth/passkey";

describe("PasskeyPromptButton", () => {
  beforeEach(() => {
    // Default: dispositivo soporta passkey
    Object.defineProperty(window, "PublicKeyCredential", {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: () =>
          Promise.resolve(true),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders enabled button when platform authenticator is available", async () => {
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("renders disabled button with 'no soporta' message when not available", async () => {
    Object.defineProperty(window, "PublicKeyCredential", {
      value: {
        isUserVerifyingPlatformAuthenticatorAvailable: () =>
          Promise.resolve(false),
      },
      configurable: true,
      writable: true,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      expect(screen.getByText(/no soporta Passkeys/i)).toBeDefined();
    });
  });

  it("calls signInWithPasskey on click in signIn mode", async () => {
    (signInWithPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(signInWithPasskey).toHaveBeenCalledWith(false);
    });
  });

  it("calls registerPasskey on click in signUp mode", async () => {
    (registerPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<PasskeyPromptButton mode="signUp" email="test@quipu.pe" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(registerPasskey).toHaveBeenCalledWith({
        name: "test@quipu.pe",
        context: "test@quipu.pe",
      });
    });
  });
});
