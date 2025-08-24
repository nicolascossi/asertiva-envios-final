"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import Image from "next/image"

const CORRECT_PIN = "1147"

export default function LoginForm() {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (pin === CORRECT_PIN) {
      localStorage.setItem("isLoggedIn", "true")
      router.push("/dashboard")
    } else {
      setError("PIN incorrecto. Intente nuevamente.")
    }
  }

  return (
    <Card className="border-border/40 bg-card shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-4">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"
            alt="Asertiva"
            width={150}
            height={75}
            className="object-contain"
            priority
          />
        </div>
        <CardTitle className="text-2xl text-center">Acceso al Sistema</CardTitle>
        <CardDescription className="text-center">Ingrese el PIN para acceder a la aplicación</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <Input
              type="password"
              placeholder="Ingrese el PIN"
              className="pl-10"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full">
            Ingresar
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
