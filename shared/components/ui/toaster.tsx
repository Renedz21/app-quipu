import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          background: "var(--color-surface)",
          color: "var(--color-ink)",
          border: "1px solid var(--color-line)",
          borderRadius: "11px",
          fontSize: "14px",
          fontFamily: "var(--font-sans)",
          boxShadow: "0 8px 24px rgba(35,32,28,0.12)",
        },
      }}
      icons={{
        success: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-qp">
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ),
        error: (
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-danger text-white text-[12px] font-bold leading-none">
            !
          </span>
        ),
      }}
    />
  );
}
