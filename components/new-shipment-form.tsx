"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Upload } from "lucide-react"
import type { Shipment } from "@/lib/types"
import { getClients, getTransports } from "@/lib/data-utils"
import { sendEmail } from "@/lib/email-utils"
import { ref, push, set } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { rtdb, storage } from "@/lib/firebase"

export default function NewShipmentForm() {
  const router = useRouter()
  const clients = getClients()
  const transports = getTransports()

  const [formData, setFormData] = useState<Partial<Shipment>>({
    date: new Date().toISOString(),
    status: "pending",
    packages: 1,
  })
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClientChange = (clientName: string) => {
    const client = clients.find((c) => c.name === clientName)
    if (client) {
      setFormData((prev) => ({
        ...prev,
        client: clientName,
        clientEmail: client.email,
        clientPhone: client.phone,
      }))
    }
  }

  const handleTransportChange = (transportName: string) => {
    const transport = transports.find((t) => t.name === transportName)
    if (transport) {
      setFormData((prev) => ({
        ...prev,
        transport: transportName,
        transportEmail: transport.email,
        transportPhone: transport.phone,
      }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setFormData((prev) => ({
        ...prev,
        invoiceFile: e.target.files?.[0].name,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let invoiceFileUrl = ""
      if (file) {
        const fileRef = storageRef(storage, `invoices/${file.name}`)
        await uploadBytes(fileRef, file)
        invoiceFileUrl = await getDownloadURL(fileRef)
      }

      const newShipment = {
        ...formData,
        invoiceFileUrl,
        createdAt: new Date().toISOString(),
      } as Shipment

      const newShipmentRef = push(ref(rtdb, "shipments"))
      await set(newShipmentRef, newShipment)

      // Send notification email
      if (newShipment.clientEmail) {
        sendEmail({
          to: newShipment.clientEmail,
          subject: "Nuevo Envío Registrado",
          body: `Se ha registrado un nuevo envío con número ${newShipment.shipmentNumber}.`,
        })
      }

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Nuevo Envío</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select required onValueChange={handleClientChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.name} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport">Transporte</Label>
              <Select required onValueChange={handleTransportChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar transporte" />
                </SelectTrigger>
                <SelectContent>
                  {transports.map((transport) => (
                    <SelectItem key={transport.name} value={transport.name}>
                      {transport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipmentNumber">Número de Envío</Label>
              <Input
                id="shipmentNumber"
                required
                value={formData.shipmentNumber || ""}
                onChange={(e) => setFormData({ ...formData, shipmentNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Despacho</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date ? new Date(formData.date).toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    date: new Date(e.target.value).toISOString(),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packages">Cantidad de Bultos</Label>
              <Input
                id="packages"
                type="number"
                min="1"
                required
                value={formData.packages || 1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packages: Number.parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">Factura/Remito</Label>
              <div className="flex items-center gap-2">
                <Input id="invoice" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("invoice")?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {file ? file.name : "Seleccionar archivo"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Envío"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
