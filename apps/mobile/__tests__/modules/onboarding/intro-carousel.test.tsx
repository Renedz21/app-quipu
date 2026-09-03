import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { IntroCarousel } from "@/modules/onboarding/components/intro-carousel";

const SCREEN_WIDTH = Dimensions.get("window").width;

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("IntroCarousel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renderiza las 3 slides con sus eyebrows", async () => {
    await render(<IntroCarousel />);
    expect(screen.getByText("QUIPU")).toBeTruthy();
    expect(screen.getByText("LOS TRES SOBRES")).toBeTruthy();
    expect(screen.getByText("CICLOS Y DISPONIBLE DIARIO")).toBeTruthy();
  });

  it("renderiza los 3 dots", async () => {
    await render(<IntroCarousel />);
    expect(screen.getByTestId("dot-0")).toBeTruthy();
    expect(screen.getByTestId("dot-1")).toBeTruthy();
    expect(screen.getByTestId("dot-2")).toBeTruthy();
  });

  it("el primer dot está activo al montar", async () => {
    await render(<IntroCarousel />);
    expect(screen.getByTestId("dot-0").props.className).toContain(
      "bg-foreground",
    );
    expect(screen.getByTestId("dot-1").props.className).toContain("bg-line");
  });

  it("el dot activo sigue la página tras el scroll", async () => {
    await render(<IntroCarousel />);
    const list = screen.getByTestId("intro-list");
    await act(async () => {
      fireEvent(list, "momentumScrollEnd", {
        nativeEvent: { contentOffset: { x: SCREEN_WIDTH, y: 0 } },
      });
    });
    expect(screen.getByTestId("dot-1").props.className).toContain(
      "bg-foreground",
    );
    expect(screen.getByTestId("dot-0").props.className).toContain("bg-line");
  });

  it('el CTA del slide 1 "Cómo funciona" avanza al slide 2 sin navegar', async () => {
    await render(<IntroCarousel />);
    fireEvent.press(screen.getByText("Cómo funciona"));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('"Ya tengo cuenta" navega a sign-in', async () => {
    await render(<IntroCarousel />);
    fireEvent.press(screen.getByText("Ya tengo cuenta"));
    expect(mockPush).toHaveBeenCalledWith("/(auth)/sign-in");
  });

  it('"Saltar" se muestra en los slides 2 y 3 pero no en el 1', async () => {
    await render(<IntroCarousel />);
    const skipLinks = screen.getAllByText("Saltar");
    expect(skipLinks).toHaveLength(2);
  });

  it('"Saltar" navega a crear cuenta', async () => {
    await render(<IntroCarousel />);
    fireEvent.press(screen.getAllByText("Saltar")[0]);
    expect(mockPush).toHaveBeenCalledWith("/(auth)/create-account");
  });

  it("slide 3 muestra el precio en pesos con tamaño mixto y la barra de progreso en el día actual", async () => {
    await render(<IntroCarousel />);
    expect(screen.getByText("S/")).toBeTruthy();
    expect(screen.getByText("42")).toBeTruthy();
    expect(screen.getByText(".30")).toBeTruthy();
    expect(screen.getByText("DÍA 1")).toBeTruthy();
    expect(screen.getByText("HOY · 15")).toBeTruthy();
    expect(screen.getByText("DÍA 30")).toBeTruthy();
  });

  it("slide 3 muestra las reglas en dos columnas con la última en verde", async () => {
    await render(<IntroCarousel />);
    expect(screen.getByText("Si un día gastas de más")).toBeTruthy();
    expect(screen.getByText("mañana baja")).toBeTruthy();
    expect(screen.getByText("Si gastas de menos")).toBeTruthy();
    expect(screen.getByText("mañana sube")).toBeTruthy();
    expect(screen.getByText("Tu ahorro")).toBeTruthy();
    expect(screen.getByText("no se toca")).toBeTruthy();
  });
});
