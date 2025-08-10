"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Paperclip, AlertCircle } from "lucide-react"
import type { Shipment, Client, Transport, ClientAddress } from "@/lib/types"
import { db } from "@/lib/firebase"
import { ref, push, set, get } from "firebase/database"
import { generateShipmentNumber, getNextShipmentNumber } from "@/lib/shipment-utils"

interface NewShipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onClientUpdate: (clients: Client[]) => void
  onTransportUpdate: (transports: Transport[]) => void
  clients: Client[]
  transports: Transport[]
  onShipmentCreate?: (newShipment: Shipment) => void
}

export default function NewShipmentModal({
  isOpen,
  onClose,
  clients,
  transports,
  onClientUpdate,
  onTransportUpdate,
  onShipmentCreate,
}: NewShipmentModalProps) {
  // Añadir la propiedad isFragile al estado inicial del envío
  const [shipment, setShipment] = useState<Partial<Shipment>>({
    status: "pending",
    date: new Date().toISOString().split("T")[0],
    packages: 1,
    pallets: 0, // Inicializar pallets en 0
    invoiceNumber: "",
    remitNumber: "",
    deliveryNote: "", // Inicializar nota de entrega como string vacío
    notes: "",
    hasColdChain: false,
    isUrgent: false,
    isFragile: false,
    weight: 0,
    declaredValue: 0,
    shippingCost: 0, // Inicializar costo de envío en 0
  })
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null)

  // Añadir estos estados para manejar los nuevos formatos
  const [remitType, setRemitType] = useState<"R" | "X" | "RM">("R")
  const [remitNumber, setRemitNumber] = useState("")
  const [invoiceType, setInvoiceType] = useState<"A" | "B" | "E">("A")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sort transports alphabetically
  const sortedTransports = [...transports].sort((a, b) => {
    const nameA = a.name || ""
    const nameB = b.name || ""
    return nameA.localeCompare(nameB)
  })

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setFiles([])
      setRemitType("R")
      setRemitNumber("")
      setSelectedClient(null)
      setSelectedAddress(null)

      // Get the next shipment number without incrementing the counter
      getNextShipmentNumber().then((number) => {
        setShipment((prev) => ({ ...prev, shipmentNumber: number }))
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  // Update remitNumber whenever remitType or remitNumber changes
  useEffect(() => {
    if (remitNumber) {
      if (remitType === "R") {
        setShipment((prev) => ({
          ...prev,
          remitNumber: `${remitType} - 0003 - ${remitNumber}`,
        }))
      } else if (remitType === "X") {
        setShipment((prev) => ({
          ...prev,
          remitNumber: `${remitType} - R00001 - ${remitNumber}`,
        }))
      } else if (remitType === "RM") {
        setShipment((prev) => ({
          ...prev,
          remitNumber: `${remitType} - ${remitNumber}`,
        }))
      }
    } else {
      setShipment((prev) => ({
        ...prev,
        remitNumber: "",
      }))
    }
  }, [remitType, remitNumber])

  // Update invoiceNumber whenever invoiceType or invoiceNumber changes
  useEffect(() => {
    if (invoiceNumber) {
      let prefix = ""
      if (invoiceType === "A") {
        prefix = "A 00001-"
      } else if (invoiceType === "B") {
        prefix = "B 00001-"
      } else if (invoiceType === "E") {
        prefix = "E 00004-"
      }

      setShipment((prev) => ({
        ...prev,
        invoiceNumber: `${prefix}${invoiceNumber}`,
      }))
    } else {
      setShipment((prev) => ({
        ...prev,
        invoiceNumber: "",
      }))
    }
  }, [invoiceType, invoiceNumber])

  const loadData = useCallback(async () => {
    try {
      // Assuming getClients and getTransports are defined elsewhere and fetch data
      const clientsData = clients //await getClients()
      const transportsData = transports //await getTransports()
      onClientUpdate(clientsData)
      onTransportUpdate(transportsData)
    } catch (error) {
      console.error("Error loading clients and transports:", error)
      setError("Error al cargar los datos de clientes y transportes")
    }
  }, [clients, onClientUpdate, onTransportUpdate, transports])

  useEffect(() => {
    console.log("Clientes en el modal:", clients)
    console.log("Transportes en el modal:", transports)
  }, [clients, transports])

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("shipmentNumber", shipment.shipmentNumber || "")

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al cargar el archivo")
    }

    const data = await response.json()
    return data.url
  }

  const adjustDate = (dateString) => {
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
  }

  // Añadir el estado para pallets
  const [pallets, setPallets] = useState<number | undefined>(undefined)

  // Función para manejar navegación con teclado en selects
  const handleSelectKeyDown = (
    e: React.KeyboardEvent,
    options: any[],
    currentValue: any,
    onChange: (value: any) => void,
  ) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault()
      const currentIndex = options.findIndex(
        (option) =>
          option.value === currentValue ||
          option.id === currentValue ||
          option.name === currentValue ||
          option === currentValue,
      )
      let newIndex

      if (e.key === "ArrowUp") {
        newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
      } else {
        newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
      }

      const newValue = options[newIndex]
      if (newValue) {
        if (newValue.value) onChange(newValue.value)
        else if (newValue.id) onChange(newValue.id)
        else if (newValue.name) onChange(newValue.name)
        else onChange(newValue)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validaciones
    if (!shipment.clientCode) {
      setError("Por favor ingrese un código de cliente")
      setIsLoading(false)
      return
    }

    if (!shipment.transport) {
      setError("Por favor seleccione un transporte")
      setIsLoading(false)
      return
    }

    try {
      console.log("Creando nuevo envío...")
      const newShipmentRef = push(ref(db, "shipments"))
      const shipmentNumber = await generateShipmentNumber() // This will now increment the counter
      const fileUrls = await Promise.all(files.map(uploadFile))

      // Crear el objeto del nuevo envío
      const newShipment = {
        ...shipment,
        id: newShipmentRef.key,
        shipmentNumber,
        client: selectedClient.businessName,
        clientEmail: selectedClient.email || "",
        clientPhone: selectedClient.phone || "",
        clientAddress: selectedAddress
          ? `${selectedAddress.street}${selectedAddress.city ? `, ${selectedAddress.city}` : ""}${
              selectedAddress.title ? ` [${selectedAddress.title}]` : ""
            }`
          : "",
        clientAddressId: selectedAddress?.id || "",
        clientAddressTitle: selectedAddress?.title || "", // Asegurar que el título se guarde explícitamente
        date: adjustDate(shipment.date || new Date().toISOString().split("T")[0]),
        attachments: fileUrls,
        createdAt: new Date().toISOString(),
        pallets: pallets || 0,
      }

      // Guardar el envío en Firebase
      console.log("Guardando envío en Firebase:", newShipment)
      await set(newShipmentRef, newShipment)
      console.log("Envío guardado en Firebase con ID:", newShipmentRef.key)

      // Si el estado es "sent", enviar correo de notificación
      if (newShipment.status === "sent") {
        // Check if client has an email
        if (!newShipment.clientEmail) {
          console.log("Client has no email, skipping email notification")

          // Notificar al componente padre sobre el nuevo envío
          if (onShipmentCreate) {
            console.log("Notificando al componente padre sobre el nuevo envío")
            onShipmentCreate(newShipment as Shipment)
          }

          setIsLoading(false)
          return
        }

        try {
          console.log("Enviando correo de notificación para envío nuevo con estado 'sent'")
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newShipment),
          })

          const data = await response.json()
          if (!response.ok) {
            console.error("Error al enviar correo:", data)
            setError(
              `El envío se creó correctamente, pero hubo un problema al enviar el correo: ${data.error || "Error desconocido"}`,
            )

            // Notificar al componente padre sobre el nuevo envío a pesar del error de correo
            if (onShipmentCreate) {
              console.log("Notificando al componente padre sobre el nuevo envío (con error de correo)")
              onShipmentCreate(newShipment as Shipment)
            }

            setIsLoading(false)
            return
          }

          console.log("Correo enviado correctamente:", data)
        } catch (emailError) {
          console.error("Error al enviar correo:", emailError)
          setError(`El envío se creó correctamente, pero hubo un problema al enviar el correo: ${emailError.message}`)

          // Notificar al componente padre sobre el nuevo envío a pesar del error de correo
          if (onShipmentCreate) {
            console.log("Notificando al componente padre sobre el nuevo envío (con error de correo)")
            onShipmentCreate(newShipment as Shipment)
          }

          setIsLoading(false)
          return
        }
      }

      // Obtener el envío completo de Firebase para asegurarnos de tener todos los datos
      const shipmentRef = ref(db, `shipments/${newShipmentRef.key}`)
      const shipmentSnapshot = await get(shipmentRef)

      if (shipmentSnapshot.exists()) {
        const completeShipment = {
          id: newShipmentRef.key,
          ...shipmentSnapshot.val(),
        }

        // Notificar al componente padre sobre el nuevo envío
        if (onShipmentCreate) {
          console.log("Notificando al componente padre sobre el nuevo envío completo:", completeShipment)
          onShipmentCreate(completeShipment as Shipment)
        }
      } else {
        // Si por alguna razón no podemos obtener el envío completo, usamos el que tenemos
        if (onShipmentCreate) {
          console.log("Notificando al componente padre sobre el nuevo envío (sin datos completos)")
          onShipmentCreate(newShipment as Shipment)
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error al crear el envío:", error)
      setError(error instanceof Error ? error.message : "Error al crear el envío")
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)

      // Validar tamaño de archivos (máximo 5MB por archivo)
      const maxSize = 5 * 1024 * 1024 // 5MB
      const invalidFiles = selectedFiles.filter((file) => file.size > maxSize)

      if (invalidFiles.length > 0) {
        setError("Algunos archivos exceden el tamaño máximo permitido de 5MB")
        return
      }

      setFiles(selectedFiles)
      setError(null)
    }
  }

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find((c) => c.id === clientId)
    if (selectedClient) {
      setSelectedClient(selectedClient)
      setSelectedAddress(null)

      // If there's only one address, select it automatically
      if (selectedClient.addresses.length === 1) {
        setSelectedAddress(selectedClient.addresses[0])
      }
      // Otherwise, try to select the default address
      else {
        const defaultAddress = selectedClient.addresses.find((addr) => addr.isDefault)
        if (defaultAddress) {
          setSelectedAddress(defaultAddress)
        }
      }

      // Also set the clientCode
      setShipment((prev) => ({
        ...prev,
        clientCode: selectedClient.clientCode,
      }))
    }
  }

  const handleAddressChange = (addressId: string) => {
    if (!selectedClient) return

    const selectedAddress = selectedClient.addresses.find((addr) => addr.id === addressId)
    if (selectedAddress) {
      setSelectedAddress(selectedAddress)
    }
  }

  const handleTransportChange = (transportName: string) => {
    const selectedTransport = transports.find((t) => t.name === transportName)
    if (selectedTransport) {
      setShipment((prev) => ({
        ...prev,
        transport: transportName,
        transportEmail: selectedTransport.email,
        transportPhone: selectedTransport.phone,
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Envío</DialogTitle>
          <DialogDescription>
            Ingrese los detalles del nuevo envío. Asegúrese de completar todos los campos requeridos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shipmentNumber" className="text-right">
                Número de Envío
              </Label>
              <Input id="shipmentNumber" value={shipment.shipmentNumber || ""} readOnly className="col-span-3" />
            </div>

            {/* Client Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientCode" className="text-right">
                Código de Cliente
              </Label>
              <div className="col-span-3">
                <Input
                  id="clientCode"
                  placeholder="Ingrese el código de cliente"
                  value={shipment.clientCode || ""}
                  onChange={(e) => {
                    const code = e.target.value
                    setShipment({ ...shipment, clientCode: code })

                    // Find client by code
                    const foundClient = clients.find((c) => c.clientCode === code)
                    if (foundClient) {
                      setSelectedClient(foundClient)

                      // If there's only one address, select it automatically
                      if (foundClient.addresses.length === 1) {
                        setSelectedAddress(foundClient.addresses[0])
                      }
                      // Otherwise, try to select the default address
                      else {
                        const defaultAddress = foundClient.addresses.find((addr) => addr.isDefault)
                        if (defaultAddress) {
                          setSelectedAddress(defaultAddress)
                        } else {
                          setSelectedAddress(null)
                        }
                      }
                    } else {
                      setSelectedClient(null)
                      setSelectedAddress(null)
                    }
                  }}
                  disabled={selectedClient !== null}
                />
                {selectedClient && <div className="mt-1 text-base font-medium">{selectedClient.businessName}</div>}
              </div>
            </div>

            {/* Address Selection - Only shown if client is selected */}
            {selectedClient && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Dirección
                </Label>
                <div className="col-span-3">
                  <Select
                    onValueChange={handleAddressChange}
                    value={selectedAddress?.id}
                    disabled={selectedClient.addresses.length === 0}
                  >
                    <SelectTrigger
                      onKeyDown={(e) =>
                        handleSelectKeyDown(e, selectedClient.addresses, selectedAddress?.id, handleAddressChange)
                      }
                    >
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
                  {selectedAddress && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {selectedAddress.street}
                      {selectedAddress.city ? `, ${selectedAddress.city}` : ""}
                      {selectedAddress.title ? ` [${selectedAddress.title.toUpperCase()}]` : ""}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transport" className="text-right">
                Transporte
              </Label>
              <Select onValueChange={handleTransportChange}>
                <SelectTrigger
                  className="col-span-3"
                  onKeyDown={(e) =>
                    handleSelectKeyDown(
                      e,
                      sortedTransports.map((t) => ({
                        name: t.name || `transport-${t.id}`,
                        value: t.name || `transport-${t.id}`,
                      })),
                      shipment.transport,
                      handleTransportChange,
                    )
                  }
                >
                  <SelectValue placeholder="Seleccionar transporte" />
                </SelectTrigger>
                <SelectContent>
                  {sortedTransports.length > 0 ? (
                    sortedTransports.map((transport) => (
                      <SelectItem key={transport.id} value={transport.name || `transport-${transport.id}`}>
                        {transport.name || "Transporte sin nombre"}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-transports">No hay transportes disponibles</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Fecha de Despacho
              </Label>
              <Input
                id="date"
                type="date"
                value={shipment.date}
                onChange={(e) => setShipment({ ...shipment, date: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="packages" className="text-right">
                Cantidad de Bultos
              </Label>
              <Input
                id="packages"
                type="number"
                min="1"
                value={shipment.packages}
                onChange={(e) => setShipment({ ...shipment, packages: Number.parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            {/* Nuevo campo para Pallets */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pallets" className="text-right">
                Cantidad de Pallets
              </Label>
              <Input
                id="pallets"
                type="number"
                min="0"
                value={shipment.pallets}
                onChange={(e) => setShipment({ ...shipment, pallets: Number.parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weight" className="text-right">
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.01"
                value={shipment.weight}
                onChange={(e) => setShipment({ ...shipment, weight: Number.parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="declaredValue" className="text-right">
                Valor Declarado ($)
              </Label>
              <Input
                id="declaredValue"
                type="number"
                min="0"
                step="0.01"
                value={shipment.declaredValue}
                onChange={(e) => setShipment({ ...shipment, declaredValue: Number.parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            {/* Nuevo campo para Costo de Envío */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shippingCost" className="text-right">
                Costo de Envío ($)
              </Label>
              <Input
                id="shippingCost"
                type="number"
                min="0"
                step="0.01"
                value={shipment.shippingCost}
                onChange={(e) => setShipment({ ...shipment, shippingCost: Number.parseFloat(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <Select
                value={shipment.status}
                onValueChange={(value) => setShipment({ ...shipment, status: value as "pending" | "sent" })}
              >
                <SelectTrigger
                  className="col-span-3"
                  onKeyDown={(e) =>
                    handleSelectKeyDown(e, [{ value: "pending" }, { value: "sent" }], shipment.status, (value) =>
                      setShipment({ ...shipment, status: value as "pending" | "sent" }),
                    )
                  }
                >
                  <SelectValue placeholder="Seleccione el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Nota de Entrega como input de texto */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deliveryNote" className="text-right">
                Nota de Entrega
              </Label>
              <Input
                id="deliveryNote"
                placeholder="Ingrese el número de nota de entrega"
                value={shipment.deliveryNote || ""}
                onChange={(e) => setShipment({ ...shipment, deliveryNote: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="files" className="text-right">
                Adjuntar archivos
              </Label>
              <div className="col-span-3">
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" // Limitar tipos de archivo
                />
                <Label
                  htmlFor="files"
                  className="cursor-pointer flex items-center justify-center w-full p-2 border border-dashed rounded-md"
                >
                  <Paperclip className="mr-2" />
                  {files.length > 0
                    ? `${files.length} archivo(s) seleccionado(s)`
                    : "Seleccionar archivos (máx. 5MB por archivo)"}
                </Label>
                {files.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span>{file.name}</span>
                        <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número de Factura</Label>
              <div className="flex gap-2">
                <Select value={invoiceType} onValueChange={(value) => setInvoiceType(value as "A" | "B" | "E")}>
                  <SelectTrigger
                    className="w-20"
                    onKeyDown={(e) =>
                      handleSelectKeyDown(e, [{ value: "A" }, { value: "B" }, { value: "E" }], invoiceType, (value) =>
                        setInvoiceType(value as "A" | "B" | "E"),
                      )
                    }
                  >
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
              {shipment.invoiceNumber && (
                <p className="text-sm text-muted-foreground mt-1">Formato guardado: {shipment.invoiceNumber}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="remitNumber">Número de Remito</Label>
              <div className="flex gap-2">
                <Select value={remitType} onValueChange={(value) => setRemitType(value as "R" | "X" | "RM")}>
                  <SelectTrigger
                    className="w-20"
                    onKeyDown={(e) =>
                      handleSelectKeyDown(e, [{ value: "R" }, { value: "X" }, { value: "RM" }], remitType, (value) =>
                        setRemitType(value as "R" | "X" | "RM"),
                      )
                    }
                  >
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
              {shipment.remitNumber && (
                <p className="text-sm text-muted-foreground mt-1">Formato guardado: {shipment.remitNumber}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Aclaraciones</Label>
            <Textarea
              id="notes"
              value={shipment.notes}
              onChange={(e) => setShipment({ ...shipment, notes: e.target.value })}
            />
          </div>

          {/* Reemplazar la sección de checkboxes con la versión actualizada que incluye "Muy Frágil" */}
          <div className="flex space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasColdChain"
                checked={shipment.hasColdChain}
                onCheckedChange={(checked) => setShipment({ ...shipment, hasColdChain: checked as boolean })}
              />
              <Label htmlFor="hasColdChain">Cadena de Frío</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isUrgent"
                checked={shipment.isUrgent}
                onCheckedChange={(checked) => setShipment({ ...shipment, isUrgent: checked as boolean })}
              />
              <Label htmlFor="isUrgent">Urgente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFragile"
                checked={shipment.isFragile}
                onCheckedChange={(checked) => setShipment({ ...shipment, isFragile: checked as boolean })}
              />
              <Label htmlFor="isFragile">Muy Frágil</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading || !shipment.clientCode || !shipment.transport}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Envío"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

