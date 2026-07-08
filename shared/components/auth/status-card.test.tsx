import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusCard } from "./status-card";

describe("StatusCard", () => {
  it("renders title and description", () => {
    render(
      <StatusCard
        variant="success"
        title="¡Listo!"
        description="Tu cuenta está creada."
      />,
    );
    expect(screen.getByText("¡Listo!")).toBeDefined();
    expect(screen.getByText("Tu cuenta está creada.")).toBeDefined();
  });

  it("renders primary and secondary actions as links", () => {
    render(
      <StatusCard
        variant="error"
        title="Error"
        description="Algo falló"
        primaryAction={{ label: "Reintentar", href: "/retry" }}
        secondaryAction={{ label: "Usar otro método", href: "/other" }}
      />,
    );
    const retryLink = screen.getByText("Reintentar").closest("a");
    expect(retryLink?.getAttribute("href")).toBe("/retry");
    const otherLink = screen.getByText("Usar otro método").closest("a");
    expect(otherLink?.getAttribute("href")).toBe("/other");
  });

  it("omits actions section when no actions provided", () => {
    const { container } = render(
      <StatusCard variant="success" title="OK" description="..." />,
    );
    const card = container.querySelector('[data-slot="status-card"]');
    expect(card?.getAttribute("data-variant")).toBe("success");
    // CardContent no se renderiza si no hay actions.
    const links = card?.querySelectorAll("a");
    expect(links?.length).toBe(0);
  });
});
