import type { Metadata } from "next";
import { Geist_Mono, Hanken_Grotesk, Newsreader } from "next/font/google";
import "./globals.css";
import { getToken } from "@/auth/auth-server";
import { ConvexClientProvider } from "@/shared/components/providers/convex-provider";
import { AppearanceSync } from "@/modules/progress/components/appearance-sync";
import { AppToaster } from "@/shared/components/ui/toaster";
import { cn } from "@/shared/lib/utils";

// Canon tipográfico (docs/QUIPU-MASTER.md §3.2):
// Hanken Grotesk = interfaz · Newsreader = titulares/cifras · Geist Mono = micro-labels
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quipu — Tu sueldo, con disciplina",
  description:
    "Sabe si puedes gastar, en segundos. Quipu ordena tu dinero en tres sobres.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialToken = await getToken();
  return (
    <html
      lang="es"
      className={cn(
        "h-full",
        "antialiased",
        hankenGrotesk.variable,
        newsreader.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider initialToken={initialToken}>
          <AppearanceSync />
          {children}
          <AppToaster />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
