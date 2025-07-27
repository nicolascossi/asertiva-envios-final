"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Printer, Eye, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ref, get, remove, update } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import type { Shipment, Client } from "@/lib/types"
import ShipmentDetailModal from "@/components/shipment-detail-modal"
import { useRouter } from "next/navigation"
import { sendEmailNotification } from "@/lib/email-notification"

// Importar los componentes necesarios para el menú desplegable
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Send, Trash2, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Añadir el AlertDialog para confirmar la eliminación
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Función para extraer solo el número del envío (sin el prefijo ENV-)
const extractShipmentNumber = (shipmentNumber: string): string => {
  return shipmentNumber.replace("ENV-", "")
}

// Función para formatear la información de pallets y bultos
const formatPalletsAndPackages = (pallets?: number, packages?: number): string => {
  if (!pallets || pallets === 0) {
    return `${packages || 0} Bultos`
  }

  // Si hay pallets, mostrar "X Pallets and X Bultos"
  return `${pallets} Pallets y ${packages || 0} Bultos`
}

// Extended shipment type with client code
interface ExtendedShipment extends Shipment {
  clientCode?: string
  remitoTriplicado?: boolean
  pallets?: number
}

// Modificar la interfaz de props para incluir una prop que controle si se muestra la columna de remito triplicado
interface ShipmentListProps {
  shipments?: ExtendedShipment[]
  showRemitoTriplicado?: boolean
  onUpdateShipment?: (updatedShipment: ExtendedShipment) => void
  onDeleteShipment?: (deletedShipmentId: string) => void
}

// Actualizar la definición de la función para aceptar las props
export default function ShipmentList({
  shipments: propShipments = [], // Proporcionar un valor predeterminado para evitar errores
  showRemitoTriplicado = false,
  onUpdateShipment,
  onDeleteShipment,
}: ShipmentListProps) {
  const router = useRouter()
  const [shipments, setShipments] = useState<ExtendedShipment[]>([])
  const [clients, setClients] = useState<Record<string, Client>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedShipment, setSelectedShipment] = useState<ExtendedShipment | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null)
  const [shipmentToDelete, setShipmentToDelete] = useState<ExtendedShipment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  // Actualizar el estado local cuando cambian las props
  useEffect(() => {
    if (propShipments && Array.isArray(propShipments)) {
      console.log("ShipmentList recibió nuevos envíos:", propShipments.length)
      setShipments(propShipments)
      setIsLoading(false)
    } else {
      console.warn("ShipmentList recibió propShipments no válido:", propShipments)
      setShipments([])
      setIsLoading(false)
    }
  }, [propShipments])

  useEffect(() => {
    // Fetch clients first
    fetchClients()
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const clientsRef = ref(db, "clients")
      const snapshot = await get(clientsRef)

      if (snapshot.exists()) {
        const clientsData = snapshot.val()
        const clientsMap: Record<string, Client> = {}

        // Create a map of client name to client data for quick lookup
        Object.entries(clientsData).forEach(([id, data]) => {
          const client = data as Client
          if (client.businessName) {
            clientsMap[client.businessName] = { id, ...client }
          }
        })

        setClients(clientsMap)
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }, [])

  const handleViewDetail = (shipment: ExtendedShipment) => {
    setSelectedShipment(shipment)
  }

  const handleCloseModal = () => {
    setSelectedShipment(null)
  }

  const handlePrintLabel = (e: React.MouseEvent, shipment: ExtendedShipment) => {
    e.stopPropagation()
    router.push(`/print-labels/${shipment.id}`)
  }

  // Función para marcar como enviado o pendiente y enviar email si corresponde
  const handleToggleShipmentStatus = async (e: React.MouseEvent, shipment: ExtendedShipment) => {
    e.stopPropagation() // Prevent row click from triggering

    setIsUpdating(shipment.id)

    try {
      const newStatus = shipment.status === "sent" ? "pending" : "sent"
      const shipmentRef = ref(rtdb, `shipments/${shipment.id}`)

      // Si estamos cambiando a enviado y el cliente tiene email, enviar notificación
      if (newStatus === "sent") {
        setIsSendingEmail(shipment.id)

        // Actualizar estado en la base de datos
        await update(shipmentRef, { status: newStatus })

        // Verificar si el cliente tiene email
        const hasEmail = shipment.clientEmail && shipment.clientEmail.trim() !== ""

        if (hasEmail) {
          try {
            await sendEmailNotification(shipment)
            await update(shipmentRef, {
              emailSent: true,
              emailSentAt: Date.now(),
            })

            toast({
              title: "Envío marcado como enviado",
              description: "El estado del envío ha sido actualizado y se ha enviado un email al cliente.",
              variant: "default",
            })
          } catch (emailError) {
            console.error("Error sending email:", emailError)

            toast({
              title: "Envío marcado como enviado",
              description: "El estado del envío ha sido actualizado, pero no se pudo enviar el email al cliente.",
              variant: "default",
            })
          }
        } else {
          toast({
            title: "Envío marcado como enviado",
            description:
              "El estado del envío ha sido actualizado. No se envió email porque el cliente no tiene dirección de correo.",
            variant: "default",
          })
        }
      } else {
        // Si estamos cambiando a pendiente, solo actualizar el estado
        await update(shipmentRef, { status: newStatus })

        toast({
          title: "Envío marcado como pendiente",
          description: "El estado del envío ha sido actualizado correctamente.",
          variant: "default",
        })
      }

      // Crear el envío actualizado con el nuevo estado
      const updatedShipment = { ...shipment, status: newStatus }

      // Notificar al componente padre si existe la función
      if (onUpdateShipment) {
        onUpdateShipment(updatedShipment)
      }
    } catch (error) {
      console.error("Error updating shipment status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del envío. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
      setIsSendingEmail(null)
    }
  }

  const handleToggleRemitoTriplicado = async (e: React.MouseEvent, shipment: ExtendedShipment) => {
    e.stopPropagation() // Prevent row click from triggering

    setIsUpdating(shipment.id)

    try {
      const newStatus = !shipment.remitoTriplicado
      const shipmentRef = ref(rtdb, `shipments/${shipment.id}`)
      await update(shipmentRef, { remitoTriplicado: newStatus })

      // Crear el envío actualizado
      const updatedShipment = { ...shipment, remitoTriplicado: newStatus }

      // Notificar al componente padre si existe la función
      if (onUpdateShipment) {
        onUpdateShipment(updatedShipment)
      }

      toast({
        title: "Estado actualizado",
        description: `Remito triplicado marcado como ${newStatus ? "RECIBIDO" : "PENDIENTE"}`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error updating remito triplicado status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del remito triplicado",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, shipment: ExtendedShipment) => {
    e.stopPropagation() // Prevent row click from triggering
    setShipmentToDelete(shipment)
  }

  // Mejorar la función confirmDelete para notificar al componente padre
  const confirmDelete = async () => {
    if (!shipmentToDelete) return

    setIsDeleting(true)
    try {
      const shipmentRef = ref(rtdb, `shipments/${shipmentToDelete.id}`)
      await remove(shipmentRef)

      toast({
        title: "Envío eliminado",
        description: `El envío ${shipmentToDelete.shipmentNumber} ha sido eliminado correctamente.`,
        variant: "default",
      })

      // Guardar el ID antes de limpiar shipmentToDelete
      const deletedShipmentId = shipmentToDelete.id

      // Notificar al componente padre sobre la eliminación
      if (onDeleteShipment) {
        onDeleteShipment(deletedShipmentId)
      }
    } catch (error) {
      console.error("Error deleting shipment:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el envío. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShipmentToDelete(null)
    }
  }

  // Filter shipments based on search term
  const filteredShipments = shipments.filter((shipment) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      shipment.client?.toLowerCase().includes(searchLower) ||
      shipment.transport?.toLowerCase().includes(searchLower) ||
      shipment.shipmentNumber?.toLowerCase().includes(searchLower) ||
      (shipment.clientCode && shipment.clientCode.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, transporte, número de envío o código de cliente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando envíos...</p>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-muted-foreground">
            {searchTerm ? "No se encontraron envíos que coincidan con la búsqueda." : "No hay envíos disponibles."}
          </p>
        </div>
      ) : (
        <div className="w-full">
          <div className="rounded-md border overflow-hidden">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[7%] text-xs">Nº Envío</TableHead>
                  <TableHead className="w-[7%] text-xs">Fecha</TableHead>
                  <TableHead className="w-[6%] text-xs">Código</TableHead>
                  <TableHead className="w-[14%] text-xs">Cliente</TableHead>
                  <TableHead className="w-[12%] text-xs">Transporte</TableHead>
                  <TableHead className="w-[10%] text-xs">Pallets/Bultos</TableHead>
                  <TableHead className="w-[7%] text-xs">Peso (kg)</TableHead>
                  <TableHead className="w-[7%] text-xs">$ Valor</TableHead>
                  <TableHead className="w-[7%] text-xs">Factura</TableHead>
                  <TableHead className="w-[7%] text-xs">Remito</TableHead>
                  <TableHead className="w-[6%] text-xs">Estado</TableHead>
                  {showRemitoTriplicado && <TableHead className="w-[8%] text-xs">Remito Trip.</TableHead>}
                  <TableHead className="text-right w-[7%] text-xs">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow
                    key={shipment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetail(shipment)}
                  >
                    <TableCell className="font-medium text-xs truncate">
                      {extractShipmentNumber(shipment.shipmentNumber)}
                    </TableCell>
                    <TableCell className="text-xs truncate">{format(new Date(shipment.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs truncate">{shipment.clientCode || "-"}</TableCell>
                    <TableCell className="text-xs truncate">{shipment.client}</TableCell>
                    <TableCell className="text-xs truncate">{shipment.transport}</TableCell>
                    <TableCell className="text-xs truncate">
                      {formatPalletsAndPackages(shipment.pallets, shipment.packages)}
                    </TableCell>
                    <TableCell className="text-xs truncate">
                      {shipment.weight ? shipment.weight.toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell className="text-xs truncate">
                      $ {shipment.declaredValue ? shipment.declaredValue.toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell className="text-xs truncate">{shipment.invoiceNumber || "-"}</TableCell>
                    <TableCell className="text-xs truncate">{shipment.remitNumber || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={shipment.status === "sent" ? "default" : "secondary"} className="text-xs">
                        {shipment.status === "sent" ? "Enviado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    {showRemitoTriplicado && (
                      <TableCell>
                        <Badge
                          variant={shipment.remitoTriplicado ? "default" : "destructive"}
                          className="text-xs truncate"
                        >
                          {shipment.remitoTriplicado ? "RECIBIDO" : "PENDIENTE"}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-7 w-7 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetail(shipment)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handlePrintLabel(e, shipment)}>
                              <Printer className="mr-2 h-4 w-4" />
                              Imprimir etiqueta
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleToggleShipmentStatus(e, shipment)}
                              disabled={isUpdating === shipment.id || isSendingEmail === shipment.id}
                            >
                              {shipment.status === "sent" ? (
                                <>
                                  <Send className="mr-2 h-4 w-4 rotate-180" />
                                  Marcar como pendiente
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  {isSendingEmail === shipment.id ? "Enviando email..." : "Marcar como enviado"}
                                </>
                              )}
                            </DropdownMenuItem>
                            {showRemitoTriplicado && (
                              <DropdownMenuItem onClick={(e) => handleToggleRemitoTriplicado(e, shipment)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {shipment.remitoTriplicado ? "Marcar como pendiente" : "Marcar como recibido"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => handleDeleteClick(e, shipment)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar envío
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="text-right">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredShipments.length} de {shipments.length} envíos
        </p>
      </div>

      {selectedShipment && <ShipmentDetailModal shipment={selectedShipment} onClose={handleCloseModal} />}

      <AlertDialog open={!!shipmentToDelete} onOpenChange={() => !isDeleting && setShipmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro que desea eliminar este envío?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el envío
              {shipmentToDelete && ` ${shipmentToDelete.shipmentNumber}`} para {shipmentToDelete?.client}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
