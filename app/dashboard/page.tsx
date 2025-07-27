"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardContent from "@/components/dashboard-content"

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn")
    if (isLoggedIn !== "true") {
      router.push("/")
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return <div>Cargando...</div>
  }

  return (
    <main className="min-h-screen bg-background">
      <DashboardContent />
    </main>
  )
}
