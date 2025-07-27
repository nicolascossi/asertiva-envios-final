"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Save, X } from "lucide-react"
import type { Client, ClientAddress } from "@/lib/types"
import PinLoginModal from "./pin-login-modal"

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onUpdateClient: (client: Client) => void
}

export default function EditClientModal({ isOpen, onClose, client, onUpdateClient }: EditClientModalProps) {
  const [editedClient, setEditedClient] = useState<Client>({ ...client })
  const [newAddress, setNewAddress] = useState<Omit<ClientAddress, "id">>({
    street: "",
    city: "",
    isDefault: false,
    title: "",
  })
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editingAddress, setEditingAddress] = useState<ClientAddress | null>(null)
  const [isFieldsUnlocked, setIsFieldsUnlocked] = useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

  const handlePinSubmit = (pin: string) => {
    if (pin === "3636") {
      setIsFieldsUnlocked(true)
      setIsPinModalOpen(false)
    } else {
      alert("PIN incorrecto")
      setIsPinModalOpen(false)
    }
  }

  // Añadir un useEffect para actualizar el estado cuando cambia el cliente seleccionado
  useEffect(() => {
    // Actualizar el estado editedClient cuando cambia la prop client
    setEditedClient({ ...client })

    // Resetear el estado de nueva dirección
    setNewAddress({
      street: "",
      city: "",
      isDefault: false,
      title: "",
    })

    // Resetear el estado de edición de dirección
    setEditingAddressId(null)
    setEditingAddress(null)

    // Reset unlocked state
    setIsFieldsUnlocked(false)
  }, [client, isOpen]) // Dependencias: client e isOpen para que se actualice cuando se abre el modal

  // Modificar la función handleAddAddress para incluir correctamente el título
  const handleAddAddress = () => {
    if (!newAddress.street) return

    const tempId = Date.now().toString()
    const newAddresses = [...editedClient.addresses]

    // If this is the first address, make it default
    const isDefault = editedClient.addresses.length === 0 ? true : newAddress.isDefault

    // If this address is default, make all others non-default
    if (isDefault) {
      newAddresses.forEach((addr) => (addr.isDefault = false))
    }

    newAddresses.push({
      id: tempId,
      street: newAddress.street,
      city: newAddress.city,
      isDefault,
      title: newAddress.title || "", // Asegurarse de que el título se incluya, incluso si es vacío
    })

    setEditedClient({ ...editedClient, addresses: newAddresses })
    setNewAddress({ street: "", city: "", isDefault: false, title: "" })
  }

  const handleRemoveAddress = (id: string) => {
    const newAddresses = editedClient.addresses.filter((a) => a.id !== id)

    // If we removed the default address and there are other addresses, make the first one default
    if (editedClient.addresses.find((a) => a.id === id)?.isDefault && newAddresses.length > 0) {
      newAddresses[0].isDefault = true
    }

    setEditedClient({ ...editedClient, addresses: newAddresses })

    // Si estábamos editando esta dirección, cancelar la edición
    if (editingAddressId === id) {
      setEditingAddressId(null)
      setEditingAddress(null)
    }
  }

  const handleSetDefaultAddress = (id: string) => {
    const newAddresses = editedClient.addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }))

    setEditedClient({ ...editedClient, addresses: newAddresses })
  }

  const handleEditAddress = (address: ClientAddress) => {
    setEditingAddressId(address.id)
    setEditingAddress({ ...address })
  }

  const handleSaveEditedAddress = () => {
    if (!editingAddress || !editingAddressId) return

    const newAddresses = editedClient.addresses.map((addr) =>
      addr.id === editingAddressId ? { ...editingAddress } : addr,
    )

    setEditedClient({ ...editedClient, addresses: newAddresses })
    setEditingAddressId(null)
    setEditingAddress(null)
  }

  const handleCancelEditAddress = () => {
    setEditingAddressId(null)
    setEditingAddress(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields - only businessName and clientCode are required now
    if (!editedClient.businessName || !editedClient.clientCode) {
      alert("Por favor complete la razón social y código de cliente")
      return
    }

    onUpdateClient(editedClient)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientCode" className="text-right">
                Código de Cliente
              </Label>
              <Input
                id="clientCode"
                value={editedClient.clientCode}
                onChange={(e) => setEditedClient({ ...editedClient, clientCode: e.target.value })}
                className="col-span-3"
                required
                disabled={!isFieldsUnlocked}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="businessName" className="text-right">
                Razón Social
              </Label>
              <Input
                id="businessName"
                value={editedClient.businessName}
                onChange={(e) => setEditedClient({ ...editedClient, businessName: e.target.value })}
                className="col-span-3"
                required
                disabled={!isFieldsUnlocked}
              />
            </div>
            {!isFieldsUnlocked && (
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPinModalOpen(true)}
                  className="text-xs"
                >
                  Desbloquear campos
                </Button>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cuit" className="text-right">
                CUIT
              </Label>
              <Input
                id="cuit"
                value={editedClient.cuit}
                onChange={(e) => setEditedClient({ ...editedClient, cuit: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={editedClient.email}
                onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfonos
              </Label>
              <Input
                id="phone"
                value={editedClient.phone}
                onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-medium mb-2">Direcciones</h3>
              {editedClient.addresses.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium">Direcciones existentes ({editedClient.addresses.length})</h4>
                  </div>
                  <div className="mb-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                    {editedClient.addresses.map((address) => (
                      <div key={address.id} className="p-2 border rounded">
                        {editingAddressId === address.id ? (
                          // Formulario de edición de dirección
                          <div className="space-y-2">
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor={`edit-title-${address.id}`} className="text-right text-xs">
                                Título
                              </Label>
                              <Input
                                id={`edit-title-${address.id}`}
                                value={editingAddress?.title || ""}
                                onChange={(e) => setEditingAddress({ ...editingAddress!, title: e.target.value })}
                                className="col-span-3"
                                placeholder="Ej: Casa Matriz, Sucursal, Depósito"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor={`edit-street-${address.id}`} className="text-right text-xs">
                                Domicilio
                              </Label>
                              <Input
                                id={`edit-street-${address.id}`}
                                value={editingAddress?.street || ""}
                                onChange={(e) => setEditingAddress({ ...editingAddress!, street: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-2">
                              <Label htmlFor={`edit-city-${address.id}`} className="text-right text-xs">
                                Localidad
                              </Label>
                              <Input
                                id={`edit-city-${address.id}`}
                                value={editingAddress?.city || ""}
                                onChange={(e) => setEditingAddress({ ...editingAddress!, city: e.target.value })}
                                className="col-span-3"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={handleCancelEditAddress}>
                                <X className="h-4 w-4 mr-1" /> Cancelar
                              </Button>
                              <Button type="button" size="sm" onClick={handleSaveEditedAddress}>
                                <Save className="h-4 w-4 mr-1" /> Guardar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // Vista normal de dirección
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {address.street}
                                {address.city ? `, ${address.city}` : ""}
                                {address.title ? ` [${address.title.toUpperCase()}]` : ""}
                              </p>
                              {address.isDefault && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                  Predeterminada
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditAddress(address)}
                              >
                                <Edit className="h-4 w-4 mr-1" /> Editar
                              </Button>
                              {!address.isDefault && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                >
                                  Predeterminada
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveAddress(address.id)}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  id="title"
                  value={newAddress.title || ""}
                  onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                  className="col-span-3"
                  placeholder="Ej: Casa Matriz, Sucursal, Depósito"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="street" className="text-right">
                  Domicilio
                </Label>
                <Input
                  id="street"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <Label htmlFor="city" className="text-right">
                  Localidad
                </Label>
                <Input
                  id="city"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleAddAddress}
                  disabled={!newAddress.street}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar dirección
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={false}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <PinLoginModal isOpen={isPinModalOpen} onSubmit={handlePinSubmit} />
    </Dialog>
  )
}
