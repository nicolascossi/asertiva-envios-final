"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileDown, Search, Mail, Loader2, Calendar, CheckCircle2, X } from "lucide-react"
import { format, isWithinInterval, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { ref, get, update, onValue, off } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import type { Shipment, Client } from "@/lib/types"
import ShipmentDetailModal from "@/components/shipment-detail-modal"
import { toast, useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { debounce } from "lodash"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"


// Extended shipment type with client code
interface ExtendedShipment extends Shipment {
  clientCode?: string
  remitoTriplicado?: boolean
  pallets?: number
}

// Añadir onUpdateShipment a la interfaz ShipmentListProps
interface ShipmentListProps {
  shipments: ExtendedShipment[]
  showRemitoTriplicado: boolean
  onUpdateShipment?: (updatedShipment: ExtendedShipment) => void
  onDeleteShipment?: (deletedShipmentId: string) => void
  searchTerm: string
}

// Función de utilidad para formatear fechas de manera segura
const safeFormatDate = (date: string | Date, formatStr: string, options?: any): string => {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (!isValid(dateObj)) {
      console.warn("Fecha inválida:", date)
      return "Fecha inválida"
    }
    return format(dateObj, formatStr, options)
  } catch (error) {
    console.error("Error al formatear fecha:", error)
    return "Fecha inválida"
  }
}

// Función de utilidad para validar fechas
const isValidDate = (dateStr: string): boolean => {
  try {
    const date = new Date(dateStr)
    return isValid(date)
  } catch (error) {
    return false
  }
}

// Función de utilidad para formatear números de manera segura
const safeFormatNumber = (value: number | undefined | null, decimals = 2): string => {
  try {
    if (value === undefined || value === null) return "0.00"
    return value.toFixed(decimals)
  } catch (error) {
    console.error("Error al formatear número:", error)
    return "0.00"
  }
}

// Función para extraer solo el número del envío (sin el prefijo ENV-)
const extractShipmentNumber = (shipmentNumber: string): string => {
  return shipmentNumber.replace("ENV-", "")
}

// Función para formatear la información de pallets y bultos
const formatPalletsAndPackages = (pallets?: number, packages?: number): string => {
  if (!pallets || pallets === 0) {
    return `${packages || 0} Bultos`
  }

  // Si hay pallets, mostrar "X Pallets y X/X Bultos"
  return `${pallets} Pallets y ${packages || 0} Bultos`
}

// Función para resaltar el texto que coincide con el término de búsqueda
const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!text || !searchTerm || searchTerm.trim() === "") {
    return text || "-"
  }

  const textStr = String(text)
  const searchTermLower = searchTerm.toLowerCase()

  // Si el texto no contiene el término de búsqueda, devolverlo sin cambios
  if (!textStr.toLowerCase().includes(searchTermLower)) {
    return textStr
  }

  // Dividir el texto en partes que coinciden y no coinciden con el término de búsqueda
  const parts = []
  let lastIndex = 0
  let index = textStr.toLowerCase().indexOf(searchTermLower)

  while (index !== -1) {
    // Añadir la parte que no coincide
    if (index > lastIndex) {
      parts.push(textStr.substring(lastIndex, index))
    }

    // Añadir la parte que coincide (usando el texto original para mantener mayúsculas/minúsculas)
    parts.push(
      <span key={`highlight-${index}`} className="bg-yellow-200 text-black px-0.5 rounded">
        {textStr.substring(index, index + searchTerm.length)}
      </span>,
    )

    lastIndex = index + searchTerm.length
    index = textStr.toLowerCase().indexOf(searchTermLower, lastIndex)
  }

  // Añadir el resto del texto después de la última coincidencia
  if (lastIndex < textStr.length) {
    parts.push(textStr.substring(lastIndex))
  }

  return <>{parts}</>
}

// Añadir el parámetro onUpdateShipment a la función ShipmentList
function ShipmentList({
  shipments = [],
  showRemitoTriplicado,
  onUpdateShipment,
  onDeleteShipment,
  searchTerm,
}: ShipmentListProps) {
  const [selectedShipment, setSelectedShipment] = useState<ExtendedShipment | null>(null)
  const [updatingRemito, setUpdatingRemito] = useState<string | null>(null)
  const router = useRouter()

  const handleRowClick = useCallback((shipment: ExtendedShipment) => {
    setSelectedShipment(shipment)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedShipment(null)
  }, [])

  // Modificar la función handleToggleRemitoTriplicado
  const handleToggleRemitoTriplicado = async (e: React.MouseEvent, shipment: ExtendedShipment) => {
    e.stopPropagation() // Evitar que se abra el modal de detalles

    if (updatingRemito) return // Evitar múltiples clics simultáneos

    setUpdatingRemito(shipment.id)

    try {
      const shipmentRef = ref(rtdb, `shipments/${shipment.id}`)
      const newValue = !shipment.remitoTriplicado

      // Actualizar en Firebase
      await update(shipmentRef, { remitoTriplicado: newValue })

      // Crear el envío actualizado
      const updatedShipment = { ...shipment, remitoTriplicado: newValue }

      // Notificar al componente padre sobre la actualización
      if (onUpdateShipment) {
        onUpdateShipment(updatedShipment)
      }

      toast({
        title: newValue ? "Remito triplicado recibido" : "Remito triplicado marcado como pendiente",
        description: `Se ha actualizado el estado del remito triplicado para el envío ${shipment.shipmentNumber}`,
        duration: 3000,
      })
    } catch (error) {
      console.error("Error al actualizar el estado del remito triplicado:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del remito triplicado",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setUpdatingRemito(null)
    }
  }

  return (
    <>
      <div className="w-full">
        <div className="rounded-md border overflow-hidden">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow>
                {/* Eliminamos la columna de número de envío */}
                <TableHead className="w-[5%] text-xs">Fecha</TableHead>
                <TableHead className="w-[4%] text-xs">Código</TableHead>
                <TableHead className="w-[9%] text-xs">Cliente</TableHead>
                <TableHead className="w-[8%] text-xs">Transporte</TableHead>
                <TableHead className="w-[5%] text-xs">Pallets/Bultos</TableHead>
                <TableHead className="w-[4%] text-xs">Peso</TableHead>
                <TableHead className="w-[4%] text-xs">$ Valor</TableHead>
                <TableHead className="w-[4%] text-xs">$ Envío</TableHead>
                <TableHead className="w-[8%] text-xs">Factura</TableHead>
                <TableHead className="w-[8%] text-xs">Remito</TableHead>
                <TableHead className="w-[8%] text-xs">Nota Entrega</TableHead>
                <TableHead className="w-[8%] text-xs">Nota Pedido</TableHead>
                <TableHead className="w-[4%] text-xs">Estado</TableHead>
                {showRemitoTriplicado && <TableHead className="w-[7%] text-xs">Remito Trip.</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(shipments) &&
                shipments.map((shipment) => (
                  <TableRow
                    key={shipment.id}
                    className="cursor-pointer hover:bg-muted/50 print:hover:bg-transparent"
                    onClick={() => handleRowClick(shipment)}
                  >
                    {/* Eliminamos la celda de número de envío */}
                    <TableCell className="text-xs truncate">{safeFormatDate(shipment.date, "dd/MM/yyyy")}</TableCell>
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
                    <TableCell className="text-xs truncate">
                      $ {shipment.shippingCost ? shipment.shippingCost.toFixed(2) : "0.00"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal break-words">
                      {highlightText(shipment.invoiceNumber || "-", searchTerm)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal break-words">
                      {highlightText(shipment.remitNumber || "-", searchTerm)}
                    </TableCell>
                    <TableCell className="text-xs truncate" title={shipment.deliveryNote || "Sin nota"}>
                      {highlightText(shipment.deliveryNote || "Sin nota", searchTerm)}
                    </TableCell>
                    <TableCell className="text-xs truncate" title={shipment.orderNote || "Sin nota"}>
                      {highlightText(shipment.orderNote || "Sin nota", searchTerm)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={shipment.status === "sent" ? "default" : "secondary"} className="text-xs">
                        {shipment.status === "sent" ? "Enviado" : "Pendiente"}
                      </Badge>
                    </TableCell>
                    {showRemitoTriplicado && (
                      <TableCell>
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={shipment.remitoTriplicado ? "default" : "destructive"}
                            className="text-xs truncate"
                          >
                            {shipment.remitoTriplicado ? "RECIBIDO" : "PENDIENTE"}
                          </Badge>
                          <Button
                            variant={shipment.remitoTriplicado ? "default" : "outline"}
                            size="sm"
                            className="h-6 w-6 p-0 ml-1 flex-shrink-0"
                            onClick={(e) => handleToggleRemitoTriplicado(e, shipment)}
                            disabled={updatingRemito === shipment.id}
                            title={shipment.remitoTriplicado ? "Marcar como pendiente" : "Marcar como recibido"}
                          >
                            {updatingRemito === shipment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2
                                className={`h-3 w-3 ${
                                  shipment.remitoTriplicado ? "text-white" : "text-muted-foreground"
                                }`}
                              />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedShipment && (
        <ShipmentDetailModal shipment={selectedShipment} onClose={handleCloseModal} showPrintButton={false} />
      )}
    </>
  )
}

export default function EnviosPorFechaPage() {
  const router = useRouter()
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [shipments, setShipments] = useState<ExtendedShipment[]>([])
  const [clients, setClients] = useState<Record<string, Client>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateError, setDateError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  // Use a ref to store the Firebase listener reference for cleanup
  const shipmentsListenerRef = useRef<any>(null)

  useEffect(() => {
    // Fetch clients first
    fetchClients()

    // Cleanup function to remove the listener when component unmounts
    return () => {
      console.log("Cleaning up shipments listener...")
      if (shipmentsListenerRef.current) {
        off(shipmentsListenerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (startDate && endDate && Object.keys(clients).length > 0) {
      // Validar fechas antes de hacer la búsqueda
      if (!isValidDate(startDate) || !isValidDate(endDate)) {
        setDateError("Una o ambas fechas seleccionadas no son válidas. Por favor, seleccione fechas correctas.")
        return
      }

      // Si las fechas son válidas, limpiar el error y buscar envíos
      setDateError(null)
      setupShipmentsListener(startDate, endDate)
    }
  }, [startDate, endDate, clients])

  const fetchClients = async () => {
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
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes. Por favor, intente de nuevo.",
        variant: "destructive",
      })
    }
  }

  // Set up real-time listener for shipments within date range
  const setupShipmentsListener = (start: string, end: string) => {
    setIsLoading(true)

    // Clean up any existing listener
    if (shipmentsListenerRef.current) {
      off(shipmentsListenerRef.current)
    }

    try {
      // Validar fechas antes de proceder
      if (!isValidDate(start) || !isValidDate(end)) {
        throw new Error("Fechas inválidas")
      }

      // Convertir fechas de string a objetos Date para comparación
      const startDateObj = parseISO(`${start}T00:00:00`)
      const endDateObj = parseISO(`${end}T23:59:59`)

      if (!isValid(startDateObj) || !isValid(endDateObj)) {
        throw new Error("Fechas de rango inválidas")
      }

      // Set up real-time listener for all shipments
      const shipmentsRef = ref(rtdb, "shipments")
      shipmentsListenerRef.current = shipmentsRef

      onValue(
        shipmentsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const shipmentsData = snapshot.val()
            const shipmentsArray: ExtendedShipment[] = []

            Object.entries(shipmentsData).forEach(([id, data]) => {
              const shipment = data as Omit<Shipment, "id">

              try {
                // Convertir la fecha del envío a objeto Date
                const shipmentDate = new Date(shipment.date)

                // Verificar que la fecha sea válida
                if (isNaN(shipmentDate.getTime())) {
                  console.warn("Invalid date for shipment:", shipment.shipmentNumber)
                  return // Skip this shipment
                }

                // Comprobar si la fecha del envío está dentro del rango seleccionado
                if (isWithinInterval(shipmentDate, { start: startDateObj, end: endDateObj })) {
                  // Add client code if available
                  const clientData = clients[shipment.client]
                  const extendedShipment: ExtendedShipment = {
                    id,
                    ...shipment,
                    clientCode: clientData?.clientCode || "-",
                    remitoTriplicado: (data as any).remitoTriplicado || false,
                    pallets: (data as any).pallets || 0,
                  }
                  shipmentsArray.push(extendedShipment)
                }
              } catch (error) {
                console.error("Error processing shipment date:", error, shipment)
              }
            })

            // Ordenar por número de envío (más reciente primero)
            shipmentsArray.sort((a, b) => {
              const numA = Number.parseInt(a.shipmentNumber.replace("ENV-", ""), 10)
              const numB = Number.parseInt(b.shipmentNumber.replace("ENV-", ""), 10)
              return numB - numA // Descending order (newest first)
            })

            setShipments(shipmentsArray)
          } else {
            setShipments([])
          }
          setIsLoading(false)
          setIsRefreshing(false)
        },
        (error) => {
          console.error("Error fetching shipments:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar los envíos. Por favor, intente de nuevo.",
            variant: "destructive",
          })
          setShipments([])
          setIsLoading(false)
          setIsRefreshing(false)
        },
      )
    } catch (error) {
      console.error("Error setting up shipments listener:", error)
      toast({
        title: "Error",
        description: "Error al procesar las fechas. Por favor, seleccione fechas válidas.",
        variant: "destructive",
      })
      setDateError("Error al procesar las fechas. Por favor, seleccione fechas válidas.")
      setShipments([])
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value
      setStartDate(newDate)

      // Validar la fecha inmediatamente
      if (!isValidDate(newDate)) {
        setDateError("La fecha inicial no es válida. Por favor, seleccione una fecha correcta.")
      } else if (dateError && isValidDate(endDate)) {
        // Si hay un error pero ahora ambas fechas son válidas, limpiar el error
        setDateError(null)
      }
    },
    [dateError, endDate],
  )

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDate = e.target.value
      setEndDate(newDate)

      // Validar la fecha inmediatamente
      if (!isValidDate(newDate)) {
        setDateError("La fecha final no es válida. Por favor, seleccione una fecha correcta.")
      } else if (dateError && isValidDate(startDate)) {
        // Si hay un error pero ahora ambas fechas son válidas, limpiar el error
        setDateError(null)
      }
    },
    [dateError, startDate],
  )

  const handleRefresh = useCallback(() => {
    if (isValidDate(startDate) && isValidDate(endDate)) {
      setIsRefreshing(true)
      setDateError(null)
      setupShipmentsListener(startDate, endDate)
    } else {
      setDateError("No se puede actualizar con fechas inválidas. Por favor, corrija las fechas.")
    }
  }, [startDate, endDate])

  // Función para manejar la actualización de un envío
  const handleShipmentUpdate = useCallback((updatedShipment: ExtendedShipment) => {
    // No need to manually update state as the real-time listener will handle it
    toast({
      title: "Envío actualizado",
      description: `El envío ${updatedShipment.shipmentNumber} ha sido actualizado correctamente.`,
      duration: 3000,
    })
  }, [])

  // Función para manejar la eliminación de un envío
  const handleShipmentDelete = useCallback((deletedShipmentId: string) => {
    // No need to manually update state as the real-time listener will handle it
    toast({
      title: "Envío eliminado",
      description: "El envío ha sido eliminado correctamente.",
      duration: 3000,
    })
  }, [])

  const handleExportPDF = async () => {
    if (shipments.length === 0) return

    try {
      setIsExporting(true)

      // Crear un nuevo documento PDF en orientación horizontal (landscape)
      const doc = new jsPDF({
  orientation: "landscape",
  unit: "mm",
  format: [841, 594], // A1 apaisado
})

      // Cargar el logo de Asertiva
      const logoUrl =
        "https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"

      // Función para añadir el logo y encabezado a cada página
      const addHeaderToPage = (doc) => {
        try {
          // Añadir logo
          doc.addImage(logoUrl, "PNG", 14, 10, 30, 15)

          // Añadir título
          const formattedStartDate = format(new Date(`${startDate}T12:00:00`), "dd/MM/yyyy", { locale: es })
          const formattedEndDate = format(new Date(`${endDate}T12:00:00`), "dd/MM/yyyy", { locale: es })
          doc.setFontSize(16)
          doc.text(`Envíos del ${formattedStartDate} al ${formattedEndDate}`, 50, 18)
        } catch (error) {
          console.error("Error adding header to PDF:", error)
          // Fallback simple si hay error
          doc.setFontSize(16)
          doc.text("Plantilla de Envíos", 50, 18)
        }
      }

      // Añadir logo y título a la primera página
      addHeaderToPage(doc)

      // Preparar datos para la tabla
      const tableData = shipments.map((shipment) => [
        shipment.shipmentNumber,
        safeFormatDate(shipment.date, "dd/MM/yyyy"),
        shipment.clientCode || "-", // Código Cliente antes que Cliente
        shipment.client || "-",
        shipment.transport || "-",
        formatPalletsAndPackages(shipment.pallets, shipment.packages), // Formato actualizado
        (shipment.weight ? safeFormatNumber(shipment.weight) : "0.00") + " kg",
        "$ " + (shipment.declaredValue ? safeFormatNumber(shipment.declaredValue) : "0.00"),
        "$ " + (shipment.shippingCost ? safeFormatNumber(shipment.shippingCost) : "0.00"), // Nuevo campo
        shipment.invoiceNumber || "-", // Add invoice number
        shipment.remitNumber || "-",
        shipment.deliveryNote || "Sin nota", // Nueva columna para nota de entrega
        shipment.orderNote || "Sin nota", // Nueva columna para nota de pedido
        shipment.status === "sent" ? "ENVIADO" : "PENDIENTE", // Estado en MAYÚSCULAS
        shipment.remitoTriplicado ? "Recibido" : "Pendiente", // Remito Triplicado con primera letra mayúscula
        shipment.notes || "-",
      ])

      // Definir cabeceras de la tabla
      const headers = [
        "Nº Envío",
        "Fecha",
        "Código Cliente", // Código Cliente antes que Cliente
        "Cliente",
        "Transporte",
        "Pallets/Bultos", // Actualizado
        "Peso",
        "Valor",
        "Costo Envío", // Nueva columna
        "Factura",
        "Remito",
        "Nota Entrega", // Nueva columna
        "Nota Pedido", // Nueva columna
        "Estado",
        "Remito Triplicado", // Nueva columna
        "Observaciones",
      ]

      // Calcular el ancho total de la página en mm
      const pageWidth = doc.internal.pageSize.getWidth()

      // Calcular el ancho total de la tabla (suma de todos los anchos de columna)
      const totalTableWidth = 18 + 18 + 18 + 30 + 22 + 18 + 18 + 18 + 18 + 18 + 18 + 20 + 20 + 18 + 22 + 30

      // Calcular los márgenes laterales para centrar la tabla
      const leftMargin = (pageWidth - totalTableWidth) / 2

      // Generar la tabla - ajustando anchos para que quepa en A4 horizontal y use todo el ancho disponible
autoTable(doc, {
  head: [headers],
  body: tableData,
  startY: 30,
  theme: "grid",

  // 👉 evita que se corte a los costados
  horizontalPageBreak: true,

  // 👉 márgenes fijos seguros
  margin: { top: 30, left: 10, right: 10, bottom: 15 },

  // 👉 que se adapte al ancho real del A1
  tableWidth: "auto",

  styles: {
    fontSize: 8,
    cellPadding: 1.5,
    halign: "center",
    valign: "middle",
    overflow: "linebreak",
  },

  // 👉 solo agrandamos columnas críticas
  columnStyles: {
    3: { cellWidth: 40 }, // Cliente
    15: { cellWidth: 50 }, // Observaciones
  },

  didDrawPage: (data) => {
    if (data.pageNumber > 1) {
      addHeaderToPage(doc)
    }
  },
})


      // Añadir pie de página con fecha de generación
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Generado el ${safeFormatDate(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} - Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        )
      }

      // Guardar el PDF
      const formattedStartDate = startDate.replace(/-/g, "")
      const formattedEndDate = endDate.replace(/-/g, "")
      let pdfFileName = ""
      if (startDate === endDate) {
        // Single day
        pdfFileName = `Plantilla Envios-${formattedStartDate}.pdf`
      } else {
        // Date range
        pdfFileName = `Plantilla Envios-${formattedStartDate}-${formattedEndDate}.pdf`
      }
      doc.save(pdfFileName)
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      toast({
        title: "Error",
        description: "Error al generar el PDF. Por favor, intente de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleSendPdfByEmail = async () => {
    if (shipments.length === 0) return

    // Validar fechas antes de proceder
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      toast({
        title: "Error",
        description: "No se puede enviar el correo con fechas inválidas. Por favor, corrija las fechas.",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    try {
      // Crear un nuevo documento PDF en orientación horizontal (landscape)
     const doc = new jsPDF({
  orientation: "landscape", // Formato horizontal
  unit: "mm",
  format: "a4",
})

      // Cargar el logo de Asertiva
      const logoUrl =
        "https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"

      // Función para añadir el logo y encabezado a cada página
      const addHeaderToPage = (doc) => {
        try {
          // Añadir logo
          doc.addImage(logoUrl, "PNG", 14, 10, 30, 15)

          // Añadir título
          const formattedStartDate = format(new Date(`${startDate}T12:00:00`), "dd/MM/yyyy", { locale: es })
          const formattedEndDate = format(new Date(`${endDate}T12:00:00`), "dd/MM/yyyy", { locale: es })
          doc.setFontSize(16)
          doc.text(`Envíos del ${formattedStartDate} al ${formattedEndDate}`, 50, 18)
        } catch (error) {
          console.error("Error adding header to PDF:", error)
          // Fallback simple si hay error
          doc.setFontSize(16)
          doc.text("Plantilla de Envíos", 50, 18)
        }
      }

      // Añadir logo y título a la primera página
      addHeaderToPage(doc)

      // Preparar datos para la tabla
      const tableData = shipments.map((shipment) => [
        shipment.shipmentNumber,
        safeFormatDate(shipment.date, "dd/MM/yyyy"),
        shipment.clientCode || "-", // Código Cliente antes que Cliente
        shipment.client || "-",
        shipment.transport || "-",
        formatPalletsAndPackages(shipment.pallets, shipment.packages), // Formato actualizado
        (shipment.weight ? safeFormatNumber(shipment.weight) : "0.00") + " kg",
        "$ " + (shipment.declaredValue ? safeFormatNumber(shipment.declaredValue) : "0.00"),
        "$ " + (shipment.shippingCost ? safeFormatNumber(shipment.shippingCost) : "0.00"), // Nuevo campo
        shipment.invoiceNumber || "-", // Add invoice number
        shipment.remitNumber || "-",
        shipment.deliveryNote || "Sin nota", // Nueva columna para nota de entrega
        shipment.orderNote || "Sin nota", // Nueva columna para nota de pedido
        shipment.status === "sent" ? "ENVIADO" : "PENDIENTE", // Estado en MAYÚSCULAS
        shipment.remitoTriplicado ? "Recibido" : "Pendiente", // Remito Triplicado con primera letra mayúscula
        shipment.notes || "-",
      ])

      // Definir cabeceras de la tabla
      const headers = [
        "Nº Envío",
        "Fecha",
        "Código Cliente", // Código Cliente antes que Cliente
        "Cliente",
        "Transporte",
        "Pallets/Bultos", // Actualizado
        "Peso",
        "Valor",
        "Costo Envío", // Nueva columna
        "Factura",
        "Remito",
        "Nota Entrega", // Nueva columna
        "Nota Pedido", // Nueva columna
        "Estado",
        "Remito Triplicado", // Nueva columna
        "Observaciones",
      ]

      // Calcular el ancho total de la página en mm
      const pageWidth = doc.internal.pageSize.getWidth()

      // Calcular el ancho total de la tabla (suma de todos los anchos de columna)
      const totalTableWidth = 18 + 18 + 18 + 30 + 22 + 18 + 18 + 18 + 18 + 18 + 18 + 20 + 20 + 18 + 22 + 30

      // Calcular los márgenes laterales para centrar la tabla
      const leftMargin = (pageWidth - totalTableWidth) / 2

      // Generar la tabla - ajustando anchos para que quepa en A4 horizontal y use todo el ancho disponible
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 30, // Empezar más abajo para dejar espacio al logo
        styles: {
          fontSize: 6,
          cellPadding: 1,
          halign: "center", // Centrar horizontalmente todo el texto
          valign: "middle", // Centrar verticalmente todo el texto
        },
        columnStyles: {
          0: { cellWidth: 18 }, // Nº Envío
          1: { cellWidth: 18 }, // Fecha
          2: { cellWidth: 18 }, // Código Cliente
          3: { cellWidth: 30 }, // Cliente
          4: { cellWidth: 22 }, // Transporte
          5: { cellWidth: 18 }, // Pallets/Bultos
          6: { cellWidth: 18 }, // Peso
          7: { cellWidth: 18 }, // Valor
          8: { cellWidth: 18 }, // Costo Envío
          9: { cellWidth: 18 }, // Factura
          10: { cellWidth: 18 }, // Remito
          11: { cellWidth: 20 }, // Nota Entrega
          12: { cellWidth: 20 }, // Nota Pedido
          13: { cellWidth: 18 }, // Estado
          14: { cellWidth: 22 }, // Remito Triplicado
          15: { cellWidth: 30 }, // Observaciones
        },
        margin: {
          top: 30,
          left: leftMargin, // Centrar la tabla horizontalmente
          right: leftMargin, // Centrar la tabla horizontalmente
          bottom: 15,
        },
        didDrawPage: (data) => {
          // Si no es la primera página, añadir logo y encabezado
          if (data.pageNumber > 1) {
            addHeaderToPage(doc)
          }
        },
      })

      // Convertir el PDF a base64
      const pdfBase64 = doc.output("datauristring").split(",")[1]

      // Formatear las fechas para el asunto del correo
      const formattedStartDate = format(new Date(`${startDate}T12:00:00`), "dd/MM/yyyy", { locale: es })
      const formattedEndDate = format(new Date(`${endDate}T12:00:00`), "dd/MM/yyyy", { locale: es })

      // Prepare email subject and body text based on date selection
      let emailSubject = ""
      let emailBodyText = ""

      if (startDate === endDate) {
        // Single day
        emailSubject = `PLANTILLA DE ENVIOS - ${formattedStartDate}`
        emailBodyText = `Adjunto encontrará la plantilla de envíos del ${formattedStartDate}.`
      } else {
        // Date range
        emailSubject = `PLANTILLA DE ENVIOS - FECHAS COMPRENDIDAS ${formattedStartDate} al ${formattedEndDate}`
        emailBodyText = `Adjunto encontrará la plantilla de envíos de las fechas comprendidas entre el ${formattedStartDate} y el ${formattedEndDate}.`
      }

      // Preparar los datos para enviar al endpoint
      const emailData = {
        to: [
          "ventas@asertiva.com.ar",
          "equipo@asertiva.com.ar",
          "soporte@asertiva.com.ar",
          "deposito@asertiva.com.ar",
          "nicolasmartincossi@gmail.com",
        ],
        subject: emailSubject,
        html: `
          <h2>Plantilla de Envíos</h2>
          <p>${emailBodyText}</p>
          <p>Este correo ha sido generado automáticamente desde el sistema de gestión de envíos de Asertiva.</p>
        `,
        pdfBase64: pdfBase64,
        pdfFilename:
          startDate === endDate
            ? `Plantilla Envios-${startDate.replace(/-/g, "")}.pdf`
            : `Plantilla Envios-${startDate.replace(/-/g, "")}-${endDate.replace(/-/g, "")}.pdf`,
      }

      // Enviar el correo electrónico usando la API existente
      const response = await fetch("/api/send-email-plantilla", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al enviar el correo electrónico")
      }

      toast({
        title: "Correo enviado",
        description: `La plantilla de envíos ha sido enviada a los destinatarios especificados.`,
        duration: 5000,
      })
    } catch (error) {
      console.error("Error al enviar el PDF por correo:", error)
      toast({
        title: "Error",
        description: `No se pudo enviar el correo: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleExportExcel = async () => {
    if (shipments.length === 0) return

    // Validar fechas antes de proceder
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      toast({
        title: "Error",
        description: "No se puede exportar con fechas inválidas. Por favor, corrija las fechas.",
        variant: "destructive",
      })
      return
    }

    try {
      // Prepare data for Excel with the requested formatting
      const data = shipments.map((shipment) => ({
        "Número de Envío": shipment.shipmentNumber,
        Fecha: safeFormatDate(shipment.date, "dd/MM/yyyy", { locale: es }),
        "Código Cliente": shipment.clientCode || "-",
        Cliente: shipment.client || "-",
        Transporte: shipment.transport || "-",
        "Pallets/Bultos": formatPalletsAndPackages(shipment.pallets, shipment.packages),
        "Peso (kg)": shipment.weight ? Number(shipment.weight).toFixed(2) : "0.00",
        "Valor Declarado ($)": shipment.declaredValue ? "$ " + Number(shipment.declaredValue).toFixed(2) : "$ 0.00",
        "Costo de Envío ($)": shipment.shippingCost ? "$ " + Number(shipment.shippingCost).toFixed(2) : "$ 0.00", // Nuevo campo
        Factura: shipment.invoiceNumber || "-",
        Remito: shipment.remitNumber || "-",
        "Nota de Entrega": shipment.deliveryNote || "Sin nota", // Nueva columna
        "Nota de Pedido": shipment.orderNote || "Sin nota", // Nueva columna
        // Estado en MAYÚSCULAS
        Estado: shipment.status === "sent" ? "ENVIADO" : "PENDIENTE",
        // Remito Triplicado con primera letra mayúscula
        "Remito Triplicado": shipment.remitoTriplicado ? "Recibido" : "Pendiente",
        Observaciones: shipment.notes || "-",
      }))

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data)

      // Aplicar estilos para reducir el tamaño de la fuente
      // Definir un estilo con fuente pequeña
      const smallFontStyle = { font: { sz: 8 } } // Tamaño de fuente 8pt

      // Obtener el rango de celdas (todas las celdas con datos)
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1")

      // Si no existe la propiedad !cols, crearla
      if (!ws["!cols"]) ws["!cols"] = []

      // Aplicar ancho automático a todas las columnas
      for (let i = range.s.c; i <= range.e.c; i++) {
        ws["!cols"][i] = { wch: 12 } // Ancho predeterminado
      }

      // Ajustar anchos específicos para algunas columnas
      ws["!cols"][3] = { wch: 20 } // Cliente
      ws["!cols"][4] = { wch: 20 } // Transporte
      ws["!cols"][11] = { wch: 20 } // Nota de Entrega
      ws["!cols"][12] = { wch: 20 } // Nota de Pedido
      ws["!cols"][15] = { wch: 25 } // Observaciones

      // Si no existe la propiedad !rows, crearla
      if (!ws["!rows"]) ws["!rows"] = []

      // Aplicar altura reducida a todas las filas
      for (let i = range.s.r; i <= range.e.r; i++) {
        ws["!rows"][i] = { hpt: 12 } // Altura reducida
      }

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Envíos")

      // Generate Excel file
      const formattedStartDate = startDate.replace(/-/g, "")
      const formattedEndDate = endDate.replace(/-/g, "")
      let excelFileName = ""
      if (startDate === endDate) {
        // Single day
        excelFileName = `Plantilla Envios-${formattedStartDate}.xlsx`
      } else {
        // Date range
        excelFileName = `Plantilla Envios-${formattedStartDate}-${formattedEndDate}.xlsx`
      }
      XLSX.writeFile(wb, excelFileName)
    } catch (error) {
      console.error("Error al generar el Excel:", error)
      toast({
        title: "Error",
        description: "Error al generar el Excel. Por favor, intente de nuevo.",
        variant: "destructive",
      })
    }
  }

  // Función mejorada para filtrar envíos con búsqueda optimizada
  const filteredShipments = useMemo(() => {
    if (!Array.isArray(shipments)) {
      console.warn("filteredShipments recibió un valor no iterable:", shipments)
      return []
    }

    if (!searchTerm || searchTerm.trim() === "") {
      return shipments
    }

    const searchTermTrimmed = searchTerm.trim()
    const searchTermLower = searchTermTrimmed.toLowerCase()

    // Si el término de búsqueda es solo números, buscar coincidencias numéricas más flexibles
    const isNumericSearch = /^\d+$/.test(searchTermTrimmed)

    return shipments.filter((shipment) => {
      // Función helper para buscar en campos de texto
      const searchInField = (field: string | undefined | null) => {
        if (!field) return false

        const fieldStr = String(field)

        if (isNumericSearch) {
          // Para búsquedas numéricas, remover espacios, guiones y otros caracteres especiales
          const cleanField = fieldStr.replace(/[-\s_.]/g, "")
          return cleanField.includes(searchTermTrimmed)
        } else {
          // Para búsquedas de texto, usar el método normal
          return fieldStr.toLowerCase().includes(searchTermLower)
        }
      }

      // Buscar en todos los campos relevantes
      return (
        searchInField(shipment.client) ||
        searchInField(shipment.transport) ||
        searchInField(shipment.shipmentNumber) ||
        searchInField(shipment.clientCode) ||
        searchInField(shipment.invoiceNumber) ||
        searchInField(shipment.remitNumber) ||
        searchInField(shipment.deliveryNote) ||
        searchInField(shipment.orderNote)
      )
    })
  }, [shipments, searchTerm])

  // Debounce para la búsqueda
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value)
    }, 300),
    [],
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetSearchTerm(e.target.value)
  }

  // Función para limpiar la búsqueda
  const clearSearch = () => {
    setSearchTerm("")
    // También limpiar el campo de entrada
    const searchInput = document.getElementById("search-input") as HTMLInputElement
    if (searchInput) {
      searchInput.value = ""
    }
  }

  const dateRangeText = useCallback(() => {
    try {
      if (startDate === endDate) {
        return safeFormatDate(new Date(`${startDate}T12:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: es })
      } else {
        const formattedStartDate = safeFormatDate(new Date(`${startDate}T12:00:00`), "dd 'de' MMMM 'de' yyyy", {
          locale: es,
        })
        const formattedEndDate = safeFormatDate(new Date(`${endDate}T12:00:00`), "dd 'de' MMMM 'de' yyyy", {
          locale: es,
        })
        return `${formattedStartDate} al ${formattedEndDate}`
      }
    } catch (error) {
      console.error("Error formatting date range text:", error)
      return "Rango de fechas seleccionado"
    }
  }, [startDate, endDate])

  return (
    <div className="w-full p-4 px-[100px] pt-[50px]">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="print:hidden">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
        </Button>
        <h1 className="text-2xl font-bold">Envíos por Fecha</h1>
      </div>

      {dateError && (
        <Alert variant="destructive" className="mb-4 mx-4">
          <AlertTitle>Error de fecha</AlertTitle>
          <AlertDescription>{dateError}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle>Seleccionar Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <Label htmlFor="startDate">Fecha Inicial</Label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="pl-8 mt-1"
                />
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="endDate">Fecha Final</Label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="endDate" type="date" value={endDate} onChange={handleEndDateChange} className="pl-8 mt-1" />
              </div>
            </div>
            <div className="flex items-end space-x-2">
              <Button
                onClick={handleSendPdfByEmail}
                disabled={shipments.length === 0 || isSending || dateError !== null}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" /> Enviar por Email
                  </>
                )}
              </Button>

              <Button
                onClick={handleExportPDF}
                disabled={shipments.length === 0 || dateError !== null || isExporting}
                variant="outline"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exportando...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" /> Exportar PDF
                  </>
                )}
              </Button>

              <Button
                onClick={handleExportExcel}
                disabled={shipments.length === 0 || dateError !== null}
                variant="outline"
              >
                <FileDown className="mr-2 h-4 w-4" /> Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="print:hidden mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Buscar por cliente, transporte, factura, remito, nota de entrega, nota de pedido..."
            className="pl-8 pr-10"
            defaultValue={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-9 w-9 p-0"
              onClick={clearSearch}
              title="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-muted-foreground">
            Mostrando resultados para: <span className="font-medium">{searchTerm}</span>
            {Array.isArray(filteredShipments) && (
              <span className="ml-2">
                ({filteredShipments.length} de {shipments.length} envíos)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="print:mb-4">
        <h2 className="text-xl font-bold mb-4 print:text-center">Envíos del {dateRangeText()}</h2>

        {isLoading ? (
          <div className="text-center py-8">Cargando envíos...</div>
        ) : !Array.isArray(shipments) || shipments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg text-muted-foreground">No hay envíos para este rango de fechas.</p>
          </div>
        ) : (
          <Tabs defaultValue="todos" className="w-full">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
              <TabsTrigger value="recibidos">Recibidos</TabsTrigger>
            </TabsList>
            <TabsContent value="todos">
              <ShipmentList
                shipments={filteredShipments}
                showRemitoTriplicado={true}
                onUpdateShipment={handleShipmentUpdate}
                onDeleteShipment={handleShipmentDelete}
                searchTerm={searchTerm}
              />
            </TabsContent>

            <TabsContent value="pendientes">
              <ShipmentList
                shipments={filteredShipments.filter(
                  (shipment) => !shipment.remitoTriplicado || shipment.remitoTriplicado === false,
                )}
                showRemitoTriplicado={true}
                onUpdateShipment={handleShipmentUpdate}
                onDeleteShipment={handleShipmentDelete}
                searchTerm={searchTerm}
              />
            </TabsContent>

            <TabsContent value="recibidos">
              <ShipmentList
                shipments={filteredShipments.filter((shipment) => shipment.remitoTriplicado === true)}
                showRemitoTriplicado={true}
                onUpdateShipment={handleShipmentUpdate}
                onDeleteShipment={handleShipmentDelete}
                searchTerm={searchTerm}
              />
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-4 text-right print:hidden">
          <p className="text-sm text-muted-foreground">
            Total de envíos: {Array.isArray(filteredShipments) ? filteredShipments.length : 0}
          </p>
        </div>

        <div className="mt-8 print:block hidden">
          <div className="flex justify-between border-t pt-4">
            <div>
              <p>Fecha de impresión: {safeFormatDate(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            </div>
            <div>
              <p>Total de envíos: {Array.isArray(filteredShipments) ? filteredShipments.length : 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
