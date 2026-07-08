import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailPasswordForm } from "./email-password-form";

vi.mock("@/modules/auth/emailPassword", () => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

import { signInWithEmail, signUpWithEmail } from "@/modules/auth/emailPassword";

describe("EmailPasswordForm", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("calls signInWithEmail on submit in signIn mode", async () => {
    (signInWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<EmailPasswordForm mode="signIn" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "test@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith({
        email: "test@quipu.pe",
        password: "password123",
      });
    });
  });

  it("calls signUpWithEmail on submit in signUp mode", async () => {
    (signUpWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {},
      error: null,
    });
    render(<EmailPasswordForm mode="signUp" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "new@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalled();
    });
  });

  it("shows error message when signIn fails", async () => {
    (signInWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Correo o contraseña incorrectos.",
        variant: "error",
      },
    });
    render(<EmailPasswordForm mode="signIn" />);
    fireEvent.change(screen.getByLabelText(/correo/i), {
      target: { value: "wrong@quipu.pe" },
    });
    fireEvent.change(screen.getByLabelText(/contraseña/i), {
      target: { value: "badpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/correo o contraseña incorrectos/i),
      ).toBeDefined();
    });
  });
});
