"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ImportClients from "./import-clients"
import type { Client } from "@/lib/types"

interface ImportClientsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (clients: Client[]) => void
}

export default function ImportClientsModal({ isOpen, onClose, onImportComplete }: ImportClientsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Importar Clientes</DialogTitle>
        </DialogHeader>
        <ImportClients
          onImportComplete={(clients) => {
            onImportComplete(clients)
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
