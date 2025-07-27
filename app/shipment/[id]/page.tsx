"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Shipment } from "@/lib/types"

export default function ShipmentDetailPage() {
  const params = useParams()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get shipment from localStorage
    const shipmentId = params.id as string
    const shipmentsJSON = localStorage.getItem("shipments")

    if (shipmentsJSON) {
      const shipments: Shipment[] = JSON.parse(shipmentsJSON)
      const foundShipment = shipments.find((s) => s.id === shipmentId)

      if (foundShipment) {
        setShipment(foundShipment)
      }
    }

    setLoading(false)
  }, [params.id])

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>
  }

  if (!shipment) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Envío no encontrado</h1>
        <p>El envío que está buscando no existe o ha sido eliminado.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Detalles del Envío
            <Badge className="ml-2" variant={shipment.status === "delivered" ? "default" : "secondary"}>
              {shipment.status === "delivered" ? "Entregado" : "Pendiente"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Número de Envío</p>
              <p className="text-lg font-semibold">{shipment.shipmentNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Despacho</p>
              <p className="text-lg font-semibold">{format(new Date(shipment.date), "dd/MM/yyyy", { locale: es })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="text-lg font-semibold">{shipment.client}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transporte</p>
              <p className="text-lg font-semibold">{shipment.transport}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cantidad de Bultos</p>
              <p className="text-lg font-semibold">{shipment.packages}</p>
            </div>
          </div>

          {shipment.invoiceFile && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Factura/Remito</p>
              <p>{shipment.invoiceFile}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
