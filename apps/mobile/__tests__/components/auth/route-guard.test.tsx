import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import RouteGuard from "@/shared/components/auth/route-guard";

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();
const mockUseConvexAuth = jest.fn();
const mockUseSegments = jest.fn();
const mockReplace = jest.fn();

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
    useRouter: () => ({ replace: mockReplace }),
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

  describe("loading", () => {
    it("renderiza children sin navegar mientras la sesión está pendiente", async () => {
      mockUseSession.mockReturnValue({ data: null, isPending: true });
      mockUseConvexAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });
      mockUseQuery.mockReturnValue(undefined);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("renderiza children sin navegar durante el handshake de Convex", async () => {
      mockUseSession.mockReturnValue({
        data: { user: { id: "u1" } },
        isPending: false,
      });
      mockUseConvexAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
      });
      mockUseQuery.mockReturnValue(undefined);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("unauthenticated", () => {
    it("renderiza children y navega a /(onboarding) desde (tabs)", async () => {
      mockUnauthenticated();
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/(onboarding)"),
      );
    });

    it("renderiza children sin navegar cuando está en (auth)", async () => {
      mockUnauthenticated();
      mockUseSegments.mockReturnValue(["(auth)"]);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("renderiza children sin navegar cuando está en (onboarding)", async () => {
      mockUnauthenticated();
      mockUseSegments.mockReturnValue(["(onboarding)"]);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("onboarding", () => {
    it("renderiza children y navega a /(onboarding)/sistema desde (tabs)", async () => {
      mockAuthed(null);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith("/(onboarding)/sistema"),
      );
    });

    it("renderiza children sin navegar cuando está en (onboarding)", async () => {
      mockAuthed(null);
      mockUseSegments.mockReturnValue(["(onboarding)"]);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("ready", () => {
    it("renderiza children sin navegar cuando está en (tabs)", async () => {
      mockAuthed({ onboardingComplete: true });
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("renderiza children y navega a /(tabs) desde (auth)", async () => {
      mockAuthed({ onboardingComplete: true });
      mockUseSegments.mockReturnValue(["(auth)"]);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
    });

    it("renderiza children y navega a /(tabs) desde (onboarding)", async () => {
      mockAuthed({ onboardingComplete: true });
      mockUseSegments.mockReturnValue(["(onboarding)"]);
      const { getByText } = await renderGuard();
      expect(getByText("contenido-protegido")).toBeTruthy();
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(tabs)"));
    });
  });
});
