"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Printer, ArrowLeft } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { Shipment } from "@/lib/types"
import ShipmentLabel from "@/components/shipment-label"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase"

export default function PrintLabelsPage() {
  const params = useParams()
  const router = useRouter()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [labels, setLabels] = useState<number[]>([])
  const [labelType, setLabelType] = useState<"numbered" | "bulk">("numbered")
  const [labelCount, setLabelCount] = useState<number>(0)
  const [customLabelCount, setCustomLabelCount] = useState<number>(0)

  useEffect(() => {
    const fetchShipment = async () => {
      const shipmentId = params.id as string
      const shipmentRef = ref(db, `shipments/${shipmentId}`)
      const snapshot = await get(shipmentRef)

      if (snapshot.exists()) {
        const shipmentData = { id: snapshot.key, ...snapshot.val() } as Shipment
        setShipment(shipmentData)
        setLabelCount(shipmentData.packages)
        setCustomLabelCount(shipmentData.packages)
        setLabels(Array.from({ length: shipmentData.packages }, (_, i) => i + 1))
      }
    }

    fetchShipment()
  }, [params.id])

  const handlePrint = () => {
    window.print()
  }

  const handleLabelTypeChange = (value: string) => {
    setLabelType(value as "numbered" | "bulk")
  }

  const handleCustomLabelCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Number.parseInt(e.target.value)
    if (!isNaN(count) && count > 0) {
      setCustomLabelCount(count)
    }
  }

  const generateLabels = () => {
    if (labelType === "numbered") {
      return Array.from({ length: labelCount }, (_, i) => i + 1)
    } else {
      return Array.from({ length: customLabelCount }, (_, i) => 0)
    }
  }

  if (!shipment) {
    return <div className="p-8 text-center bg-white text-black">Cargando...</div>
  }

  const displayLabels = labelType === "numbered" ? labels : generateLabels()

  return (
    <div className="container mx-auto p-4 bg-white text-black">
      <div className="print:hidden mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => router.back()} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
          <h1 className="text-2xl font-bold">Etiquetas para Envío {shipment.shipmentNumber}</h1>
        </div>
      </div>

      <div className="print:hidden mb-6 border p-4 rounded-md">
        <h2 className="text-lg font-semibold mb-4">Opciones de impresión</h2>

        <RadioGroup defaultValue="numbered" value={labelType} onValueChange={handleLabelTypeChange} className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <RadioGroupItem value="numbered" id="numbered" />
            <Label htmlFor="numbered">
              Etiquetas numeradas (1/{shipment.packages}, 2/{shipment.packages}, etc.)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bulk" id="bulk" />
            <Label htmlFor="bulk">Etiquetas con total de bultos ({shipment.packages} bultos)</Label>
          </div>
        </RadioGroup>

        {labelType === "bulk" && (
          <div className="mb-4">
            <Label htmlFor="labelCount" className="block mb-2">
              Cantidad de etiquetas a imprimir:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="labelCount"
                type="number"
                min="1"
                value={customLabelCount}
                onChange={handleCustomLabelCountChange}
                className="w-24"
              />
              <span>de {shipment.packages} bultos totales</span>
            </div>
          </div>
        )}

        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir {displayLabels.length} etiqueta(s)
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 print:gap-0">
        {displayLabels.map((labelNumber, index) => (
          <ShipmentLabel
            key={index}
            shipment={shipment}
            labelNumber={labelNumber}
            totalLabels={shipment.packages}
            isLast={index === displayLabels.length - 1}
            labelType={labelType}
          />
        ))}
      </div>

      {/* Instrucciones de impresión */}
      <div className="print:hidden">
        <h2 className="text-lg font-semibold mt-6 mb-2">Instrucciones de impresión</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Asegúrese de que la impresora esté configurada para papel de 15cm x 10cm</li>
          <li>Desactive la opción "Ajustar a página" en su diálogo de impresión</li>
          <li>Configure los márgenes de impresión a 0 o "ninguno"</li>
          <li>Seleccione orientación "Horizontal" o "Landscape"</li>
        </ul>
      </div>
    </div>
  )
}
