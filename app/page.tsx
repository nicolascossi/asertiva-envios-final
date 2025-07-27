"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { Loader2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isLoggedIn = localStorage.getItem("isLoggedIn")
        if (isLoggedIn === "true") {
          router.push("/dashboard")
        } else {
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-8 text-center text-3xl font-bold text-primary">Asertiva Envíos</h1>
        <LoginForm />
      </div>
    </main>
  )
}
