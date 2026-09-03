import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import RouteGuard from "@/shared/components/auth/route-guard";

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();
const mockUseConvexAuth = jest.fn();
const mockUseSegments = jest.fn();

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

jest.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useConvexAuth: () => mockUseConvexAuth(),
}));

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
    useSegments: () => mockUseSegments(),
  };
});

function mockUnauthenticated() {
  mockUseSession.mockReturnValue({ data: null, isPending: false });
  mockUseConvexAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
  });
  mockUseQuery.mockReturnValue(undefined);
}

function mockAuthed(profile: { onboardingComplete: boolean } | null) {
  mockUseSession.mockReturnValue({
    data: { user: { id: "u1" } },
    isPending: false,
  });
  mockUseConvexAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  });
  mockUseQuery.mockReturnValue(profile);
}

function renderGuard() {
  return render(
    <RouteGuard>
      <Text>contenido-protegido</Text>
    </RouteGuard>,
  );
}

describe("RouteGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSegments.mockReturnValue(["(tabs)"]);
  });

  it("retorna null mientras la sesión está pendiente", async () => {
    mockUseSession.mockReturnValue({ data: null, isPending: true });
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    mockUseQuery.mockReturnValue(undefined);
    const { toJSON } = await renderGuard();
    expect(toJSON()).toBeNull();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip");
  });

  it("retorna null durante el handshake de Convex con sesión resuelta", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "u1" } },
      isPending: false,
    });
    mockUseConvexAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    });
    mockUseQuery.mockReturnValue(undefined);
    const { toJSON, queryByText } = await renderGuard();
    expect(toJSON()).toBeNull();
    expect(queryByText(/redirect:/)).toBeNull();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip");
  });

  it("sin sesión redirige a la intro de onboarding desde (tabs)", async () => {
    mockUnauthenticated();
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("redirect:/(onboarding)")).toBeTruthy();
    expect(queryByText("contenido-protegido")).toBeNull();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), "skip");
  });

  it("sin sesión permite el grupo (auth)", async () => {
    mockUnauthenticated();
    mockUseSegments.mockReturnValue(["(auth)"]);
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("contenido-protegido")).toBeTruthy();
    expect(queryByText(/redirect:/)).toBeNull();
  });

  it("sin sesión permite el grupo (onboarding) (intro)", async () => {
    mockUnauthenticated();
    mockUseSegments.mockReturnValue(["(onboarding)"]);
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("contenido-protegido")).toBeTruthy();
    expect(queryByText(/redirect:/)).toBeNull();
  });

  it("sesión sin onboarding redirige a /(onboarding)/sistema desde (tabs)", async () => {
    mockAuthed(null);
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("redirect:/(onboarding)/sistema")).toBeTruthy();
    expect(queryByText("contenido-protegido")).toBeNull();
  });

  it("sesión con onboarding incompleto redirige a /(onboarding)/sistema desde (tabs)", async () => {
    mockAuthed({ onboardingComplete: false });
    const { getByText } = await renderGuard();
    expect(getByText("redirect:/(onboarding)/sistema")).toBeTruthy();
  });

  it("sesión sin onboarding permite el grupo (onboarding)", async () => {
    mockAuthed(null);
    mockUseSegments.mockReturnValue(["(onboarding)"]);
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("contenido-protegido")).toBeTruthy();
    expect(queryByText(/redirect:/)).toBeNull();
  });

  it("onboarding completo renderiza (tabs)", async () => {
    mockAuthed({ onboardingComplete: true });
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("contenido-protegido")).toBeTruthy();
    expect(queryByText(/redirect:/)).toBeNull();
    expect(mockUseQuery).toHaveBeenCalledWith(expect.anything(), {});
  });

  it("onboarding completo expulsa del grupo (auth)", async () => {
    mockAuthed({ onboardingComplete: true });
    mockUseSegments.mockReturnValue(["(auth)"]);
    const { getByText, queryByText } = await renderGuard();
    expect(getByText("redirect:/(tabs)")).toBeTruthy();
    expect(queryByText("contenido-protegido")).toBeNull();
  });

  it("onboarding completo expulsa del grupo (onboarding)", async () => {
    mockAuthed({ onboardingComplete: true });
    mockUseSegments.mockReturnValue(["(onboarding)"]);
    const { getByText } = await renderGuard();
    expect(getByText("redirect:/(tabs)")).toBeTruthy();
  });
});
