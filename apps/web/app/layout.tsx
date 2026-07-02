import type { Metadata } from "next"
import { Hanken_Grotesk } from "next/font/google"
import { ConvexClientProvider } from "@/core/components/providers/ConvexClientProvider"
import { getToken } from "@/lib/auth-server"
import "./globals.css"

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Quipu",
  description: "Personal finance for the Peruvian market",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const initialToken = await getToken()

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${hankenGrotesk.variable} h-full antialiased`}>
        <ConvexClientProvider initialToken={initialToken}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  )
}
