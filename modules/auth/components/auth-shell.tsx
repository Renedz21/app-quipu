import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
