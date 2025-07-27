"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Transport } from "@/lib/types"
import PinLoginModal from "./pin-login-modal"

interface EditTransportModalProps {
  isOpen: boolean
  onClose: () => void
  transport: Transport
  onUpdateTransport: (transport: Transport) => void
}

export default function EditTransportModal({ isOpen, onClose, transport, onUpdateTransport }: EditTransportModalProps) {
  const [editedTransport, setEditedTransport] = useState<Transport>({ ...transport })
  const [isFieldsUnlocked, setIsFieldsUnlocked] = useState(false)
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

  useEffect(() => {
    setEditedTransport({ ...transport })
    setIsFieldsUnlocked(false)
  }, [transport, isOpen])

  const handlePinSubmit = (pin: string) => {
    if (pin === "3636") {
      setIsFieldsUnlocked(true)
      setIsPinModalOpen(false)
    } else {
      alert("PIN incorrecto")
      setIsPinModalOpen(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!editedTransport.name || !editedTransport.transportCode) {
      alert("Por favor complete el nombre y código del transporte")
      return
    }

    onUpdateTransport(editedTransport)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Transporte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transportCode" className="text-right">
                Código
              </Label>
              <Input
                id="transportCode"
                value={editedTransport.transportCode}
                onChange={(e) => setEditedTransport({ ...editedTransport, transportCode: e.target.value })}
                className="col-span-3"
                required
                disabled={!isFieldsUnlocked}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={editedTransport.name}
                onChange={(e) => setEditedTransport({ ...editedTransport, name: e.target.value })}
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
              <Label htmlFor="email" className="text-right">
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={editedTransport.email || ""}
                onChange={(e) => setEditedTransport({ ...editedTransport, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Teléfonos
              </Label>
              <Input
                id="phone"
                value={editedTransport.phone || ""}
                onChange={(e) => setEditedTransport({ ...editedTransport, phone: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">
                Dirección
              </Label>
              <Input
                id="address"
                value={editedTransport.address || ""}
                onChange={(e) => setEditedTransport({ ...editedTransport, address: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">
                Ciudad
              </Label>
              <Input
                id="city"
                value={editedTransport.city || ""}
                onChange={(e) => setEditedTransport({ ...editedTransport, city: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Guardar Cambios</Button>
          </DialogFooter>
        </form>
        <PinLoginModal isOpen={isPinModalOpen} onSubmit={handlePinSubmit} />
      </DialogContent>
    </Dialog>
  )
}
