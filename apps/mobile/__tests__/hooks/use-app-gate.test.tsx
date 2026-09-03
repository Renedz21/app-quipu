import { render } from "@testing-library/react-native";
import { act, useReducer } from "react";
import { Text } from "react-native";
import { useAppGate } from "@/shared/hooks/use-app-gate";

const mockUseSession = jest.fn();
const mockUseQuery = jest.fn();
const mockUseConvexAuth = jest.fn();

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

jest.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useConvexAuth: () => mockUseConvexAuth(),
}));

let forceUpdate: () => void = () => {};

function Harness() {
  const [, f] = useReducer((x: number) => x + 1, 0);
  forceUpdate = f;
  const { status, isLoading } = useAppGate();
  return <Text>{`gate:${status}:${isLoading}`}</Text>;
}

function setSession(pending: boolean, data: unknown) {
  mockUseSession.mockReturnValue({ data, isPending: pending });
}

function setConvex(isAuthenticated: boolean, isLoading: boolean) {
  mockUseConvexAuth.mockReturnValue({ isAuthenticated, isLoading });
}

async function rerenderStable() {
  await act(async () => {
    forceUpdate();
  });
}

describe("useAppGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setConvex(false, false);
    mockUseQuery.mockReturnValue(undefined);
  });

  it("loading durante el primer arranque con sesión pendiente", async () => {
    setSession(true, null);
    const { getByText } = await render(<Harness />);
    expect(getByText("gate:loading:true")).toBeTruthy();
  });

  it("unauthenticated tras resolver sin sesión", async () => {
    setSession(true, null);
    const { getByText } = await render(<Harness />);
    setSession(false, null);
    await rerenderStable();
    expect(getByText("gate:unauthenticated:false")).toBeTruthy();
  });

  it("NO vuelve a loading en la revalidación posterior a resolver (causa del flash post-sign-out)", async () => {
    setSession(true, null);
    const { getByText } = await render(<Harness />);
    setSession(false, null);
    await rerenderStable();
    expect(getByText("gate:unauthenticated:false")).toBeTruthy();

    // better-auth dispara un refetch tras /sign-out (broadcastSessionUpdate):
    // isPending:true con data null. No debe volver a “loading”.
    setSession(true, null);
    await rerenderStable();
    expect(getByText("gate:unauthenticated:false")).toBeTruthy();
  });

  it("ready con sesión y onboarding completo", async () => {
    setSession(false, { user: { id: "u1" } });
    setConvex(true, false);
    mockUseQuery.mockReturnValue({ _id: "p1", onboardingComplete: true });
    const { getByText } = await render(<Harness />);
    expect(getByText("gate:ready:false")).toBeTruthy();
  });

  it("loading si la sesión existe pero Convex aún hace handshake", async () => {
    setSession(false, { user: { id: "u1" } });
    setConvex(false, true);
    const { getByText } = await render(<Harness />);
    expect(getByText("gate:loading:true")).toBeTruthy();
  });

  it("onboarding con sesión y onboarding incompleto", async () => {
    setSession(false, { user: { id: "u1" } });
    setConvex(true, false);
    mockUseQuery.mockReturnValue({ _id: "p1", onboardingComplete: false });
    const { getByText } = await render(<Harness />);
    expect(getByText("gate:onboarding:false")).toBeTruthy();
  });

  it("la revalidación no afecta a una sesión activa (ready no cambia)", async () => {
    setSession(false, { user: { id: "u1" } });
    setConvex(true, false);
    mockUseQuery.mockReturnValue({ _id: "p1", onboardingComplete: true });
    const { getByText } = await render(<Harness />);
    setSession(true, { user: { id: "u1" } });
    await rerenderStable();
    expect(getByText("gate:ready:false")).toBeTruthy();
  });
});
