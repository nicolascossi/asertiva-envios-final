"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function TestEmailButton() {
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestEmail = async () => {
    setIsSending(true)
    setResult(null)
    try {
      const testShipment = {
        id: "test-id",
        shipmentNumber: "TEST-001",
        client: "Cliente de Prueba",
        clientEmail: "nicolasmartincossi@gmail.com", // Asegúrate de que esta sea la dirección correcta para las pruebas
        clientPhone: "123456789",
        clientAddress: "Dirección de Prueba",
        transport: "Transporte de Prueba",
        transportEmail: "transporte@example.com",
        transportPhone: "987654321",
        date: new Date().toISOString(),
        packages: 1,
        status: "sent" as const,
        invoiceNumber: "INV-001",
        remitNumber: "REM-001",
        notes: "Esto es una prueba",
        hasColdChain: false,
        isUrgent: false,
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testShipment),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      setResult({
        success: true,
        message: `Email enviado correctamente desde ${process.env.NEXT_PUBLIC_SENDER_EMAIL || "envios@gemico.shop"}. 
                  Por favor, verifica la bandeja de entrada y la carpeta de spam de ${testShipment.clientEmail}.`,
      })
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}. 
                  Verifica los logs del servidor y la configuración de Brevo para más detalles.`,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleTestEmail} disabled={isSending}>
        {isSending ? "Enviando..." : "Enviar email de prueba"}
      </Button>
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground">
        Dirección del remitente: {process.env.NEXT_PUBLIC_SENDER_EMAIL || "envios@gemico.shop"}
      </p>
    </div>
  )
}
