"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import type { Client, ClientAddress } from "@/lib/types"

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onAddClient: (client: Omit<Client, "id">) => void
}

export default function AddClientModal({ isOpen, onClose, onAddClient }: AddClientModalProps) {
  const [newClient, setNewClient] = useState<Omit<Client, "id">>({
    clientCode: "",
    businessName: "",
    cuit: "",
    email: "",
    phone: "",
    addresses: [],
  })

  // Asegurarse de que el campo title se incluya en el objeto newAddress
  const [newAddress, setNewAddress] = useState<Omit<ClientAddress, "id">>({
    street: "",
    city: "",
    isDefault: true,
    title: "",
  })

  // Modificar la función handleAddAddress para incluir correctamente el título
  const handleAddAddress = () => {
    if (!newAddress.street) return

    const tempId = Date.now().toString()
    const newAddresses = [...newClient.addresses]

    // If this is the first address, make it default
    const isDefault = newClient.addresses.length === 0 ? true : newAddress.isDefault

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

    setNewClient({ ...newClient, addresses: newAddresses })
    setNewAddress({ street: "", city: "", isDefault: false, title: "" })
  }

  const handleRemoveAddress = (id: string) => {
    const newAddresses = newClient.addresses.filter((a) => a.id !== id)

    // If we removed the default address and there are other addresses, make the first one default
    if (newClient.addresses.find((a) => a.id === id)?.isDefault && newAddresses.length > 0) {
      newAddresses[0].isDefault = true
    }

    setNewClient({ ...newClient, addresses: newAddresses })
  }

  const handleSetDefaultAddress = (id: string) => {
    const newAddresses = newClient.addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }))

    setNewClient({ ...newClient, addresses: newAddresses })
  }

  // Update the handleSubmit function to make addresses optional
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields - only businessName and clientCode are required now
    if (!newClient.businessName || !newClient.clientCode) {
      alert("Por favor complete la razón social y código de cliente")
      return
    }

    onAddClient(newClient)
    setNewClient({
      clientCode: "",
      businessName: "",
      cuit: "",
      email: "",
      phone: "",
      addresses: [],
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clientCode" className="text-right">
                Código de Cliente
              </Label>
              <Input
                id="clientCode"
                value={newClient.clientCode}
                onChange={(e) => setNewClient({ ...newClient, clientCode: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="businessName" className="text-right">
                Razón Social
              </Label>
              <Input
                id="businessName"
                value={newClient.businessName}
                onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cuit" className="text-right">
                CUIT
              </Label>
              <Input
                id="cuit"
                value={newClient.cuit}
                onChange={(e) => setNewClient({ ...newClient, cuit: e.target.value })}
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
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfonos
              </Label>
              <Input
                id="phone"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                className="col-span-3"
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-medium mb-2">Direcciones</h3>
              {newClient.addresses.length > 0 && (
                <div className="mb-4 space-y-2">
                  {newClient.addresses.map((address) => (
                    <div key={address.id} className="flex items-center justify-between p-2 border rounded">
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
                  ))}
                </div>
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
            {/* Update the submit button to not be disabled when there are no addresses */}
            <Button type="submit" disabled={false}>
              Agregar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
