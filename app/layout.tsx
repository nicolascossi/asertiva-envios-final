import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Gemico Envíos",
  description: "Sistema de gestión de envíos",
  icons: {
    icon: [
      {
        url: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LogoCuadrado-YJpvxkDWNlK7H1NngpNW05GYYpqL7X.png",
        href: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LogoCuadrado-YJpvxkDWNlK7H1NngpNW05GYYpqL7X.png",
      },
    ],
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="light">
      <head>
        <link
          rel="icon"
          type="image/png"
          href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/LogoCuadrado-YJpvxkDWNlK7H1NngpNW05GYYpqL7X.png"
        />
      </head>
      <body className={`${inter.className} light bg-white text-black`}>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
