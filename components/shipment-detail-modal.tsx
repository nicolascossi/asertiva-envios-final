"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { Printer, Edit, Save, X } from "lucide-react"
import type { Shipment, Client, ClientAddress } from "@/lib/types"
import { getClients, getTransports } from "@/lib/data-utils"
import { ref, update } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface ShipmentDetailModalProps {
  shipment: Shipment
  onClose: () => void
  showPrintButton?: boolean
}

export default function ShipmentDetailModal({ shipment, onClose, showPrintButton = true }: ShipmentDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedShipment, setEditedShipment] = useState<Shipment>({ ...shipment })
  const [remitType, setRemitType] = useState<"R" | "X" | "RM">("R")
  const [remitNumber, setRemitNumber] = useState("")
  const [invoiceType, setInvoiceType] = useState<"A" | "B" | "E">("A")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [transports, setTransports] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null)

  useEffect(() => {
    // Parse existing remitNumber if it exists
    if (shipment.remitNumber) {
      // Check for R format: "R - 0003 - NUMBER"
      const rPattern = /^R - 0003 - (.+)$/
      const rMatch = shipment.remitNumber.match(rPattern)

      // Check for X format: "X - R00001 - NUMBER"
      const xPattern = /^X - R00001 - (.+)$/
      const xMatch = shipment.remitNumber.match(xPattern)

      // Check for RM format: "RM - NUMBER"
      const rmPattern = /^RM - (.+)$/
      const rmMatch = shipment.remitNumber.match(rmPattern)

      if (rMatch && rMatch[1]) {
        setRemitType("R")
        setRemitNumber(rMatch[1])
      } else if (xMatch && xMatch[1]) {
        setRemitType("X")
        setRemitNumber(xMatch[1])
      } else if (rmMatch && rmMatch[1]) {
        setRemitType("RM")
        setRemitNumber(rmMatch[1])
      } else {
        // If format doesn't match, just use the whole string as the number
        setRemitType("R")
        setRemitNumber(shipment.remitNumber)
      }
    } else {
      setRemitType("R")
      setRemitNumber("")
    }

    // Parse existing invoiceNumber if it exists
    if (shipment.invoiceNumber) {
      // Check for A format: "A 00001-NUMBER"
      const aPattern = /^A 00001-(.+)$/
      const aMatch = shipment.invoiceNumber.match(aPattern)

      // Check for B format: "B 00001-(.+)$/
      const bPattern = /^B 00001-(.+)$/
      const bMatch = shipment.invoiceNumber.match(bPattern)

      // Check for E format: "E 00004-NUMBER"
      const ePattern = /^E 00004-(.+)$/
      const eMatch = shipment.invoiceNumber.match(ePattern)

      if (aMatch && aMatch[1]) {
        setInvoiceType("A")
        setInvoiceNumber(aMatch[1])
      } else if (bMatch && bMatch[1]) {
        setInvoiceType("B")
        setInvoiceNumber(bMatch[1])
      } else if (eMatch && eMatch[1]) {
        setInvoiceType("E")
        setInvoiceNumber(eMatch[1])
      } else {
        // If format doesn't match, just use the whole string as the number
        setInvoiceType("A")
        setInvoiceNumber(shipment.invoiceNumber)
      }
    } else {
      setInvoiceType("A")
      setInvoiceNumber("")
    }
  }, [shipment.remitNumber, shipment.invoiceNumber])

  // Update editedShipment.remitNumber when remitType or remitNumber changes
  useEffect(() => {
    if (isEditing) {
      if (remitNumber) {
        if (remitType === "R") {
          setEditedShipment((prev) => ({
            ...prev,
            remitNumber: `${remitType} - 0003 - ${remitNumber}`,
          }))
        } else if (remitType === "X") {
          setEditedShipment((prev) => ({
            ...prev,
            remitNumber: `${remitType} - R00001 - ${remitNumber}`,
          }))
        } else if (remitType === "RM") {
          setEditedShipment((prev) => ({
            ...prev,
            remitNumber: `${remitType} - ${remitNumber}`,
          }))
        }
      } else {
        setEditedShipment((prev) => ({
          ...prev,
          remitNumber: "",
        }))
      }
    }
  }, [remitType, remitNumber, isEditing])

  // Update editedShipment.invoiceNumber when invoiceType or invoiceNumber changes
  useEffect(() => {
    if (isEditing) {
      if (invoiceNumber) {
        let prefix = ""
        if (invoiceType === "A") {
          prefix = "A 00001-"
        } else if (invoiceType === "B") {
          prefix = "B 00001-"
        } else if (invoiceType === "E") {
          prefix = "E 00004-"
        }

        setEditedShipment((prev) => ({
          ...prev,
          invoiceNumber: `${prefix}${invoiceNumber}`,
        }))
      } else {
        setEditedShipment((prev) => ({
          ...prev,
          invoiceNumber: "",
        }))
      }
    }
  }, [invoiceType, invoiceNumber, isEditing])

  useEffect(() => {
    const loadData = async () => {
      try {
        const clientsData = await getClients()
        const transportsData = await getTransports()
        setClients(clientsData)
        setTransports(transportsData)

        // Find the client based on the shipment's client name
        const client = clientsData.find((c) => c.businessName === shipment.client)
        if (client) {
          setSelectedClient(client)

          // Try to find the selected address by ID or by matching street
          let address = null
          if (shipment.clientAddressId) {
            address = client.addresses.find((a) => a.id === shipment.clientAddressId)
          }

          // If no address found by ID, try to match by street name
          if (!address && shipment.clientAddress) {
            const streetPart = shipment.clientAddress.split(",")[0].trim()
            address = client.addresses.find((a) => a.street.includes(streetPart) || streetPart.includes(a.street))
          }

          // If still no match, use the default address
          if (!address && client.addresses.length > 0) {
            address = client.addresses.find((a) => a.isDefault) || client.addresses[0]
          }

          if (address) {
            setSelectedAddress(address)
          }
        }
      } catch (error) {
        console.error("Error loading clients and transports:", error)
        setError("Error al cargar los datos de clientes y transportes")
      }
    }
    loadData()
  }, [shipment])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setSelectedAddress(null)

      // If there's only one address, select it automatically
      if (client.addresses.length === 1) {
        setSelectedAddress(client.addresses[0])
      }
      // Otherwise, try to select the default address
      else {
        const defaultAddress = client.addresses.find((addr) => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddress(defaultAddress)
        }
      }

      // Also set the clientCode
      setEditedShipment((prev) => ({
        ...prev,
        clientCode: client.clientCode,
      }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      // Update client info if selection has changed
      // Modificar cómo se actualiza el envío para incluir correctamente el título
      if (selectedClient && selectedAddress) {
        setEditedShipment((prev) => ({
          ...prev,
          client: selectedClient.businessName,
          clientEmail: selectedClient.email,
          clientPhone: selectedClient.phone,
          clientAddress: `${selectedAddress.street}${selectedAddress.city ? `, ${selectedAddress.city}` : ""}${
            selectedAddress.title ? ` [${selectedAddress.title}]` : ""
          }`,
          clientAddressId: selectedAddress.id,
          clientAddressTitle: selectedAddress.title || "", // Asegurar que el título se guarde explícitamente
          clientCode: selectedClient.clientCode,
        }))
      }

      // Update the state in the database
      const shipmentRef = ref(rtdb, `shipments/${shipment.id}`)
      await update(shipmentRef, editedShipment)

      console.log("Shipment updated successfully")
      setSuccessMessage("Pedido actualizado correctamente.")

      // If the state changed to "sent", try to send the email
      if (editedShipment.status === "sent" && shipment.status !== "sent") {
        // Check if client has an email
        if (!editedShipment.clientEmail) {
          console.log("Client has no email, skipping email notification")
          setSuccessMessage(
            "Pedido actualizado correctamente. No se envió notificación porque el cliente no tiene email registrado.",
          )
        } else {
          try {
            const response = await fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(editedShipment),
            })

            const data = await response.json()

            if (!response.ok) {
              throw new Error(data.error || "Failed to send email")
            }

            console.log("Email sent successfully:", data)
            setSuccessMessage(
              (prev) =>
                `${prev} Correo de notificación enviado con ${editedShipment.attachments?.length || 0} archivo(s) adjunto(s).`,
            )
          } catch (emailError) {
            console.error("Error sending email:", emailError)
            setError(
              `El pedido se actualizó, pero hubo un error al enviar el correo de notificación: ${emailError.message}`,
            )
          }
        }
      }

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating shipment:", error)
      setError(`Error al actualizar el envío: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedShipment({ ...shipment })
    // Reset remit fields to original values
    if (shipment.remitNumber) {
      const parts = shipment.remitNumber.split(" - ")
      if (parts.length === 2) {
        setRemitType(parts[0] as "R" | "X")
        setRemitNumber(parts[1])
      } else {
        setRemitType("R")
        setRemitNumber(shipment.remitNumber)
      }
    } else {
      setRemitType("R")
      setRemitNumber("")
    }
    setIsEditing(false)
    setError(null)
  }

  const handlePrintLabels = () => {
    window.open(`/print-labels/${shipment.id}`, "_blank")
  }

  const adjustDate = useCallback((dateString) => {
    try {
      // Handle empty or invalid dates
      if (!dateString) return new Date().toISOString()

      // Parse the date string properly
      const [year, month, day] = dateString.split("-").map(Number)

      // Validate date components
      if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
        console.error("Invalid date components:", { year, month, day })
        return new Date().toISOString()
      }

      // Create the date at noon to avoid timezone issues
      return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString()
    } catch (error) {
      console.error("Error adjusting date:", error)
      return new Date().toISOString()
    }
  }, [])

  const handleChange = (field: keyof Shipment, value: any) => {
    if (field === "date") {
      try {
        // Validate the date format before adjusting
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          setEditedShipment((prev) => ({ ...prev, [field]: adjustDate(value) }))
        } else {
          console.warn("Invalid date format:", value)
          // Keep the previous valid date
        }
      } catch (error) {
        console.error("Error handling date change:", error)
      }
    } else {
      setEditedShipment((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleAddressChange = (addressId: string) => {
    if (!selectedClient) return

    const address = selectedClient.addresses.find((a) => a.id === addressId)
    if (address) {
      setSelectedAddress(address)
    }
  }

  const handleTransportChange = (transportName: string) => {
    const transport = transports.find((t) => t.name === transportName)
    if (transport) {
      setEditedShipment((prev) => ({
        ...prev,
        transport: transportName,
        transportEmail: transport.email,
        transportPhone: transport.phone,
      }))
    }
  }

  if (!shipment) {
    return null
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col items-center space-y-4">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"
            alt="Asertiva"
            width={120}
            height={60}
            className="object-contain"
            priority
          />
          <DialogTitle>Detalles del Envío {shipment.shipmentNumber}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              {isEditing ? (
                <Select value={selectedClient?.id} onValueChange={handleClientChange} disabled={true}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients && clients.length > 0 ? (
                      [...clients]
                        .sort((a, b) => a.businessName.localeCompare(b.businessName))
                        .map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.businessName} ({client.clientCode})
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="no-clients" disabled>
                        No hay clientes disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.client}</div>
              )}
            </div>

            {isEditing && selectedClient && (
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Select
                  value={selectedAddress?.id}
                  onValueChange={handleAddressChange}
                  disabled={!selectedClient || selectedClient.addresses.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar dirección" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClient.addresses.length > 0 ? (
                      selectedClient.addresses.map((address) => (
                        <SelectItem key={address.id} value={address.id}>
                          {address.street}
                          {address.city ? `, ${address.city}` : ""}
                          {address.title ? ` [${address.title.toUpperCase()}]` : ""}
                          {address.isDefault ? " [Predeterminada]" : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-addresses" disabled>
                        No hay direcciones registradas
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="clientAddress">Dirección</Label>
                <div className="p-2 border rounded-md bg-muted/30">{shipment.clientAddress}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="transport">Transporte</Label>
              {isEditing ? (
                <Select value={editedShipment.transport} onValueChange={handleTransportChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar transporte" />
                  </SelectTrigger>
                  <SelectContent>
                    {transports && transports.length > 0 ? (
                      transports.map((transport) => (
                        <SelectItem key={transport.id} value={transport.name || `transport-${transport.id}`}>
                          {transport.name || "Transporte sin nombre"}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-transports">No hay transportes disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.transport}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipmentNumber">Número de Envío</Label>
              {isEditing ? (
                <Input
                  id="shipmentNumber"
                  value={editedShipment.shipmentNumber}
                  onChange={(e) => handleChange("shipmentNumber", e.target.value)}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.shipmentNumber}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Despacho</Label>
              {isEditing ? (
                <Input
                  id="date"
                  type="date"
                  value={editedShipment.date ? format(new Date(editedShipment.date), "yyyy-MM-dd") : ""}
                  onChange={(e) => handleChange("date", e.target.value)}
                  onInvalid={(e) => e.preventDefault()}
                  min="2000-01-01"
                  max="2100-12-31"
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{format(new Date(shipment.date), "dd/MM/yyyy")}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="packages">Cantidad de Bultos</Label>
              {isEditing ? (
                <Input
                  id="packages"
                  type="number"
                  min="1"
                  value={editedShipment.packages}
                  onChange={(e) => handleChange("packages", Number.parseInt(e.target.value))}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.packages}</div>
              )}
            </div>

            {/* Nuevo campo para Pallets */}
            <div className="space-y-2">
              <Label htmlFor="pallets">Cantidad de Pallets</Label>
              {isEditing ? (
                <Input
                  id="pallets"
                  type="number"
                  min="0"
                  value={editedShipment.pallets || 0}
                  onChange={(e) => handleChange("pallets", Number.parseInt(e.target.value))}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.pallets || 0}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              {isEditing ? (
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedShipment.weight || 0}
                  onChange={(e) => handleChange("weight", Number.parseFloat(e.target.value))}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">{shipment.weight || 0} kg</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredValue">Valor Declarado ($)</Label>
              {isEditing ? (
                <Input
                  id="declaredValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedShipment.declaredValue || 0}
                  onChange={(e) => handleChange("declaredValue", Number.parseFloat(e.target.value))}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">$ {shipment.declaredValue || 0}</div>
              )}
            </div>

            {/* Nuevo campo para Costo de Envío */}
            <div className="space-y-2">
              <Label htmlFor="shippingCost">Costo de Envío ($)</Label>
              {isEditing ? (
                <Input
                  id="shippingCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedShipment.shippingCost || 0}
                  onChange={(e) => handleChange("shippingCost", Number.parseFloat(e.target.value))}
                />
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">$ {shipment.shippingCost || 0}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              {isEditing ? (
                <Select value={editedShipment.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 border rounded-md bg-muted/30">
                  {shipment.status === "sent" ? "Enviado" : "Pendiente"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Número de Factura</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Select value={invoiceType} onValueChange={(value) => setInvoiceType(value as "A" | "B" | "E")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="invoiceNumber"
                  placeholder="Número"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
            ) : (
              <div className="p-2 border rounded-md bg-muted/30">{shipment.invoiceNumber}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="remitNumber">Número de Remito</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Select value={remitType} onValueChange={(value) => setRemitType(value as "R" | "X" | "RM")}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R">R</SelectItem>
                    <SelectItem value="X">X</SelectItem>
                    <SelectItem value="RM">RM</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="remitNumber"
                  placeholder="Número"
                  value={remitNumber}
                  onChange={(e) => setRemitNumber(e.target.value)}
                  className="flex-1"
                />
              </div>
            ) : (
              <div className="p-2 border rounded-md bg-muted/30">{shipment.remitNumber}</div>
            )}
          </div>

          {/* Campo de Nota de Entrega como input de texto */}
          <div className="space-y-2">
            <Label htmlFor="deliveryNote">Nota de Entrega</Label>
            {isEditing ? (
              <Input
                id="deliveryNote"
                placeholder="Ingrese el número de nota de entrega"
                value={editedShipment.deliveryNote || ""}
                onChange={(e) => handleChange("deliveryNote", e.target.value)}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/30">{shipment.deliveryNote || "Sin nota"}</div>
            )}
          </div>

          {/* Campo de Nota de Pedido como input de texto */}
          <div className="space-y-2">
            <Label htmlFor="orderNote">Nota de Pedido</Label>
            {isEditing ? (
              <Input
                id="orderNote"
                placeholder="Ingrese el número de nota de pedido"
                value={editedShipment.orderNote || ""}
                onChange={(e) => handleChange("orderNote", e.target.value)}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/30">{shipment.orderNote || "Sin nota"}</div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Aclaraciones</Label>
            {isEditing ? (
              <Textarea
                id="notes"
                value={editedShipment.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            ) : (
              <div className="p-2 border rounded-md bg-muted/30">{shipment.notes}</div>
            )}
          </div>

          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasColdChain"
                checked={isEditing ? editedShipment.hasColdChain : shipment.hasColdChain}
                onCheckedChange={(checked) => handleChange("hasColdChain", checked as boolean)}
                disabled={!isEditing}
              />
              <Label htmlFor="hasColdChain">Cadena de Frío</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isUrgent"
                checked={isEditing ? editedShipment.isUrgent : shipment.isUrgent}
                onCheckedChange={(checked) => handleChange("isUrgent", checked as boolean)}
                disabled={!isEditing}
              />
              <Label htmlFor="isUrgent">Urgente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFragile"
                checked={isEditing ? editedShipment.isFragile : shipment.isFragile}
                onCheckedChange={(checked) => handleChange("isFragile", checked as boolean)}
                disabled={!isEditing}
              />
              <Label htmlFor="isFragile">Muy Frágil</Label>
            </div>
          </div>

          {shipment.attachments && shipment.attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Documentos adjuntos</Label>
              <div className="space-y-2">
                {shipment.attachments.map((url, index) => (
                  <div key={index} className="p-2 border rounded-md bg-muted/30 flex justify-between items-center">
                    <span>Documento {index + 1}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Ver
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium">Cliente</h3>
              <p>{shipment.client}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Transporte</h3>
              <p>{shipment.transport}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Pallets</h3>
              <p>{shipment.pallets || "0"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Bultos</h3>
              <p>{shipment.packages}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Peso</h3>
              <p>{shipment.weight ? `${shipment.weight.toFixed(2)} kg` : "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Valor Declarado</h3>
              <p>{shipment.declaredValue ? `$${shipment.declaredValue.toFixed(2)}` : "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Costo de Envío</h3>
              <p>{shipment.shippingCost ? `$${shipment.shippingCost.toFixed(2)}` : "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Factura</h3>
              <p>{shipment.invoiceNumber || "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Remito</h3>
              <p>{shipment.remitNumber || "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Nota de Entrega</h3>
              <p>{shipment.deliveryNote || "Sin nota"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Nota de Pedido</h3>
              <p>{shipment.orderNote || "Sin nota"}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !selectedClient || !selectedAddress}>
                {isSaving ? (
                  <>
                    <span className="spinner mr-2"></span> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {showPrintButton ? (
                <>
                  <Button variant="outline" onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button onClick={handlePrintLabels}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Etiquetas
                  </Button>
                </>
              ) : (
                <div className="w-full flex justify-center">
                  <Button onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
