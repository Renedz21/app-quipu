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

/**
 * Tests del bug de capabilities (ver P0-7 del living doc).
 *
 * El bug original: el botón se deshabilitaba cuando
 * `isUserVerifyingPlatformAuthenticatorAvailable()` retornaba `false`. Esto es
 * incorrecto porque ese API solo cubre authenticators UVPA (biometric/PIN) —
 * no cubre security keys externas (YubiKey), ni casos donde el browser no
 * detecta el authenticator pero existe (ej. PIN sin biometric en Windows Hello).
 *
 * El fix: deshabilitar el botón SOLO si `window.PublicKeyCredential` no existe
 * (browser sin WebAuthn). Si WebAuthn existe, el botón está activo aunque la
 * promesa UVPA falle.
 */
describe("PasskeyPromptButton", () => {
  beforeEach(() => {
    // Default: browser con WebAuthn y UVPA disponible
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

  it("renders enabled button when browser has WebAuthn", async () => {
    // El pre-load de autofill llama a signInWithPasskey(true). Lo mockeamos
    // para que retorne éxito y no haga nada visible.
    (signInWithPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("renders disabled button with 'no soporta' message when WebAuthn is unavailable", async () => {
    // Caso: browser sin WebAuthn (viejo o contexto restringido).
    Object.defineProperty(window, "PublicKeyCredential", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(true);
      expect(screen.getByText(/no soporta Passkeys/i)).toBeDefined();
    });
  });

  // Regression test del bug: botón debe estar activo aunque UVPA devuelva false
  // (cross-platform authenticator, security key, o simplemente UVPA no detectable).
  it("renders enabled button when WebAuthn exists but UVPA is unavailable (security key, etc.)", async () => {
    (signInWithPasskey as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
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
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
      // El copy "no soporta" NO debe aparecer cuando WebAuthn existe.
      expect(screen.queryByText(/no soporta Passkeys/i)).toBeNull();
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
    // El pre-load llamó a signInWithPasskey(true) al montar.
    expect(signInWithPasskey).toHaveBeenCalledWith(true);
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

  // Regression test: C1 del final review. Los errores de passkey antes eran
  // silenciosos (solo `data-error` attribute, sin render). Ahora se renderiza
  // con `role="alert"`.
  it("renders the error message when signInWithPasskey fails", async () => {
    (signInWithPasskey as ReturnType<typeof vi.fn>).mockImplementation(
      async (autoFill?: boolean) => {
        // El primer call es el pre-load de autofill (best-effort, lo silenciamos).
        if (autoFill) return { data: null, error: null };
        // El segundo call es el del click manual. Este sí falla.
        return {
          data: null,
          error: {
            code: "AUTH_PASSKEY_SECURITY_ERROR",
            message: "No pudimos verificarte.",
            variant: "verify-error",
          },
        };
      },
    );
    render(<PasskeyPromptButton mode="signIn" />);
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(screen.getByRole("button"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/No pudimos verificarte/);
  });
});
