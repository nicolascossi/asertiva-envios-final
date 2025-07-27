"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Edit, X, Loader2, Upload, Search } from "lucide-react"
import type { Client } from "@/lib/types"
import AddClientModal from "./add-client-modal"
import EditClientModal from "./edit-client-modal"
import ImportClientsModal from "./import-clients-modal"
import { getClients, addClient, updateClient, deleteClient } from "@/lib/data-utils"
import { useToast } from "@/components/ui/use-toast"

interface ClientListProps {
  clients: Client[]
  onClientUpdate: (clients: Client[]) => void
}

export default function ClientList({ clients: initialClients, onClientUpdate }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    setClients(initialClients)
  }, [initialClients])

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    setIsLoading(true)
    try {
      console.log("Cargando clientes...")
      const clientsData = await getClients()
      console.log("Clientes cargados:", clientsData)
      setClients(clientsData)
      onClientUpdate(clientsData)
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddClient = async (newClient: Omit<Client, "id">) => {
    setIsLoading(true)
    try {
      console.log("Agregando nuevo cliente:", newClient)
      const id = await addClient(newClient)
      console.log("Cliente agregado con ID:", id)
      await loadClients()
      setIsAddModalOpen(false)
      toast({
        title: "Cliente agregado",
        description: "El cliente se ha agregado correctamente.",
      })
    } catch (error) {
      console.error("Error adding client:", error)
      toast({
        title: "Error",
        description: "Error al agregar el cliente. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportComplete = async (importedClients: Client[]) => {
    console.log("Clientes importados:", importedClients)
    await loadClients()
    setIsImportModalOpen(false)
  }

  const handleEditClient = (client: Client) => {
    // Primero cerrar el modal si estaba abierto
    setIsEditModalOpen(false)

    // Luego establecer el cliente a editar y abrir el modal
    setTimeout(() => {
      setEditingClient(client)
      setIsEditModalOpen(true)
    }, 100) // Un pequeño retraso para asegurar que el estado se actualice correctamente
  }

  const handleUpdateClient = async (updatedClient: Client) => {
    setIsLoading(true)
    try {
      await updateClient(updatedClient.id, updatedClient)
      await loadClients()
      setIsEditModalOpen(false)
      toast({
        title: "Cliente actualizado",
        description: "El cliente se ha actualizado correctamente.",
      })
    } catch (error) {
      console.error("Error updating client:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el cliente. Por favor, inténtelo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleDeleteClient function to use toast instead of alert
  const handleDeleteClient = async (client: Client) => {
    if (window.confirm(`¿Está seguro que desea eliminar el cliente "${client.businessName}"?`)) {
      setIsLoading(true)
      try {
        console.log("Deleting client with ID:", client.id)

        // Check if client ID exists
        if (!client.id) {
          throw new Error("Client ID is missing")
        }

        // Delete the client from Firebase
        await deleteClient(client.id)
        console.log("Client deleted successfully")

        // Update the local state to remove the deleted client
        setClients((prevClients) => prevClients.filter((c) => c.id !== client.id))

        // Notify parent component about the update
        onClientUpdate(clients.filter((c) => c.id !== client.id))

        // Show success message with toast
        toast({
          title: "Cliente eliminado",
          description: "El cliente ha sido eliminado correctamente",
        })
      } catch (error) {
        console.error("Error deleting client:", error)
        toast({
          title: "Error",
          description: `Error al eliminar el cliente: ${error instanceof Error ? error.message : "Error desconocido"}`,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const filteredClients = clients
    .filter(
      (client) =>
        client.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.cuit.includes(searchTerm),
    )
    .sort((a, b) => a.businessName.localeCompare(b.businessName))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Clientes</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o CUIT..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" /> Importar Clientes
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Cliente
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
            <TableHead>Código</TableHead>
            <TableHead>Razón Social</TableHead>
            <TableHead>CUIT</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Dirección Predeterminada</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id} className="hover:bg-muted/50">
              <TableCell>{client.clientCode}</TableCell>
              <TableCell>{client.businessName}</TableCell>
              <TableCell>{client.cuit}</TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{client.phone}</TableCell>
              <TableCell>
                {client.addresses && client.addresses.length > 0 ? (
                  client.addresses.find((addr) => addr.isDefault) ? (
                    <>
                      <div>{client.addresses.find((addr) => addr.isDefault)?.street}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.addresses.find((addr) => addr.isDefault)?.city}
                        {client.addresses.find((addr) => addr.isDefault)?.title && (
                          <span className="font-medium">
                            {" "}
                            ({client.addresses.find((addr) => addr.isDefault)?.title})
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>{client.addresses[0].street}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.addresses[0].city}
                        {client.addresses[0].title && (
                          <span className="font-medium"> ({client.addresses[0].title})</span>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <span className="text-muted-foreground text-sm">Sin dirección</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button onClick={() => handleEditClient(client)} size="sm" disabled={isLoading}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteClient(client)}
                    size="sm"
                    variant="destructive"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filteredClients.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No se encontraron clientes con ese nombre
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AddClientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAddClient={handleAddClient} />

      {editingClient && (
        <EditClientModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          client={editingClient}
          onUpdateClient={handleUpdateClient}
        />
      )}

      <ImportClientsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
