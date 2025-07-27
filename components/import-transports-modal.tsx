"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ImportTransports from "./import-transports"
import type { Transport } from "@/lib/types"

interface ImportTransportsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: (transports: Transport[]) => void
}

export default function ImportTransportsModal({ isOpen, onClose, onImportComplete }: ImportTransportsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Importar Transportes</DialogTitle>
        </DialogHeader>
        <ImportTransports
          onImportComplete={(transports) => {
            onImportComplete(transports)
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
