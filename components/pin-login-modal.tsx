"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface PinLoginModalProps {
  isOpen: boolean
  onSubmit: (pin: string) => void
}

export default function PinLoginModal({ isOpen, onSubmit }: PinLoginModalProps) {
  const [pin, setPin] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(pin)
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ingresa el PIN</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              id="pin"
              placeholder="Ingresa el PIN"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit">Enviar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
