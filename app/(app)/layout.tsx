import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full flex-1 bg-background">{children}</div>;
}
