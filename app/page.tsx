import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/auth/auth-server";
import { pageMetadata, siteConfig } from "@/core/seo";
import { QuipuLogo } from "@/shared/components/quipu-logo";

export const metadata = {
  ...pageMetadata({
    title: siteConfig.name,
    path: "/",
    index: true,
  }),
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
};

const landingSignals = [
  { label: "Tranquilidad", dotClass: "bg-qp" },
  { label: "Control", dotClass: "bg-moss" },
  { label: "Buen camino", dotClass: "bg-clay" },
] as const;

export default async function HomePage() {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(120%_75%_at_50%_-10%,var(--qp-selected),var(--qp-surface)_62%)] px-6 pt-7 pb-8 sm:px-14 sm:pt-9 sm:pb-9">
      <header className="flex justify-center sm:justify-start">
        <QuipuLogo />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-qp">
          Disciplina financiera, sin ansiedad
        </span>
        <h1 className="max-w-[620px] text-balance font-serif text-[34px] font-medium leading-[1.08] tracking-[-0.01em] text-ink sm:text-[47px]">
          Sabe si puedes gastar, en segundos.
        </h1>
        <p className="mt-5 mb-8 max-w-[440px] text-[15px] leading-[1.55] text-mute sm:text-[17px]">
          Quipu ordena tu dinero en tres sobres y te dice, de un vistazo, si vas
          por buen camino este ciclo.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/sign-up"
            className="rounded-[11px] bg-ink px-[26px] py-[14px] text-[15px] font-semibold text-canvas transition-colors hover:bg-ink/90"
          >
            Crear cuenta
          </Link>
          <Link
            href="/sign-in"
            className="rounded-[11px] border border-line bg-surface px-[26px] py-[14px] text-[15px] font-semibold text-ink transition-colors hover:bg-surface-warm"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>

      <footer className="flex justify-center gap-6 border-t border-line-soft pt-5 sm:gap-[30px]">
        {landingSignals.map((signal) => (
          <span
            key={signal.label}
            className="inline-flex items-center gap-2 text-[13.5px] text-body"
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${signal.dotClass}`}
            />
            {signal.label}
          </span>
        ))}
      </footer>
    </div>
  );
}
