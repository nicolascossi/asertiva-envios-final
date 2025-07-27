"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import ShipmentList from "@/components/shipment-list"
import ClientList from "@/components/client-list"
import TransportList from "@/components/transport-list"
import NewShipmentModal from "@/components/new-shipment-modal"
import type { Shipment, Client, Transport } from "@/lib/types"
import { rtdb } from "@/lib/firebase"
import { ref, onValue, off } from "firebase/database"
import { getClients, getTransports } from "@/lib/data-utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DashboardContent() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [transports, setTransports] = useState<Transport[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("envios")
  const [todayShipments, setTodayShipments] = useState<Shipment[]>([])
  const [userName, setUserName] = useState<string | null>(null)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Use a ref to store the Firebase listener reference for cleanup
  const shipmentsListenerRef = useRef<any>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Load clients
      const clientsData = await getClients()
      console.log("Clientes cargados:", clientsData)
      setClients(clientsData)

      // Load transports
      const transportsData = await getTransports()
      console.log("Transportes cargados:", transportsData)
      setTransports(transportsData)

      // Set up real-time listener for shipments
      setupShipmentsListener()
    } catch (error) {
      console.error("Error loading data:", error)
      setIsLoading(false)
    }
  }, [])

  // Set up real-time listener for shipments
  const setupShipmentsListener = useCallback(() => {
    console.log("Setting up real-time listener for shipments...")

    // Clean up any existing listener
    if (shipmentsListenerRef.current) {
      off(shipmentsListenerRef.current)
    }

    const shipmentsRef = ref(rtdb, "shipments")
    shipmentsListenerRef.current = shipmentsRef

    onValue(
      shipmentsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val()
          console.log("Real-time data received from Firebase:", Object.keys(data).length, "envíos")

          const shipmentsArray = Object.entries(data).map(([id, shipment]) => ({
            id,
            ...(shipment as Shipment),
          }))

          // Sort shipments by shipment number in descending order (newest first)
          shipmentsArray.sort((a, b) => {
            // Extract the numeric part from the shipment number (ENV-XXXXXX)
            const numA = Number.parseInt(a.shipmentNumber.replace("ENV-", ""), 10)
            const numB = Number.parseInt(b.shipmentNumber.replace("ENV-", ""), 10)
            return numB - numA // Descending order (newest first)
          })

          console.log("Updating state with", shipmentsArray.length, "envíos")
          setShipments(shipmentsArray)
        } else {
          console.log("No se encontraron envíos en Firebase")
          setShipments([])
        }
        setIsLoading(false)
      },
      (error) => {
        console.error("Error fetching shipments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los envíos. Por favor, intente de nuevo.",
          variant: "destructive",
          duration: 5000,
        })
        setIsLoading(false)
      },
    )
  }, [toast])

  useEffect(() => {
    // Obtener el nombre de usuario del localStorage
    const storedUserName = localStorage.getItem("userName")
    setUserName(storedUserName)

    // Load data
    loadData()

    // Cleanup function to remove the listener when component unmounts
    return () => {
      console.log("Cleaning up shipments listener...")
      if (shipmentsListenerRef.current) {
        off(shipmentsListenerRef.current)
      }
    }
  }, [loadData])

  // Filter shipments based on search term
  const filteredShipments = shipments.filter(
    (shipment) =>
      shipment.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.transport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.shipmentNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Calculate pagination
  const totalItems = filteredShipments.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedShipments = filteredShipments.slice(startIndex, endIndex)

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  const handleClientUpdate = useCallback((newClients: Client[]) => {
    setClients(newClients)
  }, [])

  const handleTransportUpdate = useCallback((newTransports: Transport[]) => {
    setTransports(newTransports)
  }, [])

  // Modify the function handleShipmentCreate to close the modal
  const handleShipmentCreate = useCallback(
    (newShipment: Shipment) => {
      console.log("Nuevo envío creado, cerrando modal...", newShipment)
      // Close the modal
      setIsNewShipmentModalOpen(false)

      // No need to update state manually as the real-time listener will handle it

      // Show notification
      toast({
        title: "Envío creado",
        description: `El envío ${newShipment.shipmentNumber} ha sido creado correctamente.`,
        duration: 3000,
      })
    },
    [toast],
  )

  // Function to handle shipment updates - no longer needed to manually update state
  const handleShipmentUpdate = useCallback(
    (updatedShipment: Shipment) => {
      console.log("Envío actualizado:", updatedShipment)
      // No need to update state manually as the real-time listener will handle it

      // Show notification
      toast({
        title: "Envío actualizado",
        description: `El envío ${updatedShipment.shipmentNumber} ha sido actualizado correctamente.`,
        duration: 3000,
      })
    },
    [toast],
  )

  // Function to handle shipment deletion - no longer needed to manually update state
  const handleShipmentDelete = useCallback(
    (deletedShipmentId: string) => {
      console.log("Envío eliminado:", deletedShipmentId)
      // No need to update state manually as the real-time listener will handle it

      // Show notification
      toast({
        title: "Envío eliminado",
        description: `El envío ha sido eliminado correctamente.`,
        duration: 3000,
      })
    },
    [toast],
  )

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("userName")
    router.push("/")
  }

  const handleViewShipmentsByDate = () => {
    router.push("/envios-por-fecha")
  }

  // Pagination component
  const PaginationControls = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} envíos
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Mostrar:</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>

          <div className="flex items-center space-x-1">
            {/* Show first page */}
            {currentPage > 3 && (
              <>
                <Button
                  variant={1 === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>
                {currentPage > 4 && <span className="px-2">...</span>}
              </>
            )}

            {/* Show pages around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNumber = Math.max(1, currentPage - 2) + i
              if (pageNumber > totalPages) return null

              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                >
                  {pageNumber}
                </Button>
              )
            })}

            {/* Show last page */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && <span className="px-2">...</span>}
                <Button
                  variant={totalPages === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full px-[100px] pt-[50px]">
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-2xl font-bold">Gestion de Envíos - Asertiva</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push("/envios-por-fecha")}>
            Plantillas de Envios
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando datos...</span>
        </div>
      ) : (
        <Tabs defaultValue="shipments" className="w-full">
          <TabsList className="mb-4 px-4">
            <TabsTrigger value="shipments">Envíos</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="transports">Transportes</TabsTrigger>
          </TabsList>

          <TabsContent value="shipments">
            <div className="flex justify-between items-center mb-6 px-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, transporte, número de envío o código de cliente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={() => setIsNewShipmentModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo Envío
                </Button>
              </div>
            </div>

            {shipments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No hay envíos registrados.</p>
                <Button onClick={() => setIsNewShipmentModalOpen(true)} className="mt-4">
                  Crear primer envío
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="mb-4 px-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="pending">Pendientes</TabsTrigger>
                    <TabsTrigger value="sent">Enviados</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all">
                    <div className="space-y-4">
                      <ShipmentList
                        shipments={paginatedShipments}
                        showRemitoTriplicado={false}
                        onUpdateShipment={handleShipmentUpdate}
                        onDeleteShipment={handleShipmentDelete}
                      />
                      {totalPages > 1 && <PaginationControls />}
                    </div>
                  </TabsContent>
                  <TabsContent value="pending">
                    <div className="space-y-4">
                      <ShipmentList
                        shipments={paginatedShipments.filter((s) => s.status === "pending")}
                        showRemitoTriplicado={false}
                        onUpdateShipment={handleShipmentUpdate}
                        onDeleteShipment={handleShipmentDelete}
                      />
                      {totalPages > 1 && <PaginationControls />}
                    </div>
                  </TabsContent>
                  <TabsContent value="sent">
                    <div className="space-y-4">
                      <ShipmentList
                        shipments={paginatedShipments.filter((s) => s.status === "sent")}
                        showRemitoTriplicado={false}
                        onUpdateShipment={handleShipmentUpdate}
                        onDeleteShipment={handleShipmentDelete}
                      />
                      {totalPages > 1 && <PaginationControls />}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>

          <TabsContent value="clients">
            <ClientList clients={clients} onClientUpdate={handleClientUpdate} />
          </TabsContent>

          <TabsContent value="transports">
            <TransportList transports={transports} onTransportUpdate={handleTransportUpdate} />
          </TabsContent>
        </Tabs>
      )}

      <NewShipmentModal
        isOpen={isNewShipmentModalOpen}
        onClose={() => setIsNewShipmentModalOpen(false)}
        clients={clients}
        transports={transports}
        onClientUpdate={handleClientUpdate}
        onTransportUpdate={handleTransportUpdate}
        onShipmentCreate={handleShipmentCreate}
      />
    </div>
  )
}
