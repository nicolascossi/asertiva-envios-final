"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Save, X, Loader2, Upload, Search } from "lucide-react"
import type { Transport } from "@/lib/types"
import AddTransportModal from "./add-transport-modal"
import ImportTransportsModal from "./import-transports-modal"
import { getTransports, addTransport, updateTransport, deleteTransport } from "@/lib/data-utils"

interface TransportListProps {
  transports: Transport[]
  onTransportUpdate: (transports: Transport[]) => void
}

export default function TransportList({ transports: initialTransports, onTransportUpdate }: TransportListProps) {
  const [transports, setTransports] = useState<Transport[]>(initialTransports)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    setTransports(initialTransports)
  }, [initialTransports])

  useEffect(() => {
    loadTransports()
  }, [])

  const loadTransports = async () => {
    setIsLoading(true)
    try {
      console.log("Cargando transportes...")
      const transportsData = await getTransports()
      console.log("Transportes cargados:", transportsData)
      setTransports(transportsData)
      onTransportUpdate(transportsData)
    } catch (error) {
      console.error("Error loading transports:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTransport = async (newTransport: Omit<Transport, "id">) => {
    setIsLoading(true)
    try {
      console.log("Agregando nuevo transporte:", newTransport)
      const id = await addTransport(newTransport)
      console.log("Transporte agregado con ID:", id)
      await loadTransports()
      setIsAddModalOpen(false)
    } catch (error) {
      console.error("Error adding transport:", error)
      alert("Error al agregar el transporte. Por favor, inténtelo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportComplete = async (importedTransports: Transport[]) => {
    console.log("Transportes importados:", importedTransports)
    await loadTransports()
    setIsImportModalOpen(false)
  }

  const handleSave = async (transport: Transport) => {
    setIsLoading(true)
    try {
      console.log("Actualizando transporte:", transport)
      await updateTransport(transport.id, transport)
      console.log("Transporte actualizado")
      await loadTransports()
      setEditingId(null)
    } catch (error) {
      console.error("Error updating transport:", error)
      alert("Error al guardar el transporte. Por favor, inténtelo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (transport: Transport) => {
    if (window.confirm(`¿Está seguro que desea eliminar el transporte ${transport.name}?`)) {
      setIsLoading(true)
      try {
        console.log("Eliminando transporte:", transport)
        console.log("ID del transporte a eliminar:", transport.id)

        // Check if transport ID exists
        if (!transport.id) {
          throw new Error("Transport ID is missing")
        }

        // Attempt to delete the transport
        await deleteTransport(transport.id)

        // Update local state without reloading
        const updatedTransports = transports.filter((t) => t.id !== transport.id)
        setTransports(updatedTransports)
        onTransportUpdate(updatedTransports)
      } catch (error) {
        console.error("Error deleting transport:", error)
        alert(`Error al eliminar el transporte: ${error instanceof Error ? error.message : "Error desconocido"}`)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleEdit = (transport: Transport) => {
    setEditingId(transport.id)
  }

  const handleCancel = () => {
    setEditingId(null)
  }

  const filteredTransports = transports
    .filter((transport) => transport.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Transportes</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transportes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" /> Importar Transportes
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Transporte
          </Button>
        </div>
      </div>
      {isLoading && (
        <div className="flex justify-center my-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransports.map((transport) => (
            <TableRow key={transport.id}>
              <TableCell>
                {editingId === transport.id ? (
                  <Input
                    value={transport.name}
                    onChange={(e) =>
                      setTransports(transports.map((t) => (t.id === transport.id ? { ...t, name: e.target.value } : t)))
                    }
                  />
                ) : (
                  transport.name
                )}
              </TableCell>
              <TableCell>
                {editingId === transport.id ? (
                  <Input
                    value={transport.email}
                    onChange={(e) =>
                      setTransports(
                        transports.map((t) => (t.id === transport.id ? { ...t, email: e.target.value } : t)),
                      )
                    }
                  />
                ) : (
                  transport.email
                )}
              </TableCell>
              <TableCell>
                {editingId === transport.id ? (
                  <Input
                    value={transport.phone}
                    onChange={(e) =>
                      setTransports(
                        transports.map((t) => (t.id === transport.id ? { ...t, phone: e.target.value } : t)),
                      )
                    }
                  />
                ) : (
                  transport.phone
                )}
              </TableCell>
              <TableCell>
                {editingId === transport.id ? (
                  <>
                    <Button onClick={() => handleSave(transport)} size="sm" className="mr-2" disabled={isLoading}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleCancel} size="sm" variant="outline" disabled={isLoading}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div className="flex space-x-2">
                    <Button onClick={() => handleEdit(transport)} size="sm" disabled={isLoading}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(transport)}
                      size="sm"
                      variant="destructive"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {filteredTransports.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                No se encontraron transportes con ese nombre
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <AddTransportModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransport={handleAddTransport}
      />
      <ImportTransportsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
