"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Shipment } from "@/lib/types"
import { db } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import Image from "next/image"

export default function ShipmentDetailPage() {
  const params = useParams()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShipment = async () => {
      const shipmentNumber = params.shipmentNumber as string
      const shipmentsRef = ref(db, "shipments")

      try {
        const snapshot = await get(shipmentsRef)
        if (snapshot.exists()) {
          const shipmentsData = snapshot.val()
          const foundShipment = Object.values(shipmentsData).find((s: any) => s.shipmentNumber === shipmentNumber) as
            | Shipment
            | undefined

          if (foundShipment) {
            setShipment(foundShipment)
          } else {
            console.log("No se encontró el envío")
          }
        } else {
          console.log("No hay envíos en la base de datos")
        }
      } catch (error) {
        console.error("Error al obtener el envío:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchShipment()
  }, [params.shipmentNumber])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles del envío...</p>
        </div>
      </div>
    )
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
        <CardHeader className="flex flex-col items-center space-y-4">
          <Image
            src="https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"
            alt="Asertiva"
            width={150}
            height={75}
            className="object-contain"
            priority
          />
          <CardTitle className="text-2xl">Detalles del Envío</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Número de Remito - Destacado */}
          {shipment.remitNumber && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-600 mb-1">Número de Remito</p>
              <p className="text-xl font-bold text-blue-900">{shipment.remitNumber}</p>
            </div>
          )}

          {/* Valor Declarado - Destacado */}
          {shipment.declaredValue && shipment.declaredValue > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600 mb-1">Valor Declarado</p>
              <p className="text-xl font-bold text-green-900">${shipment.declaredValue.toLocaleString()}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Despacho</p>
              <p className="text-lg font-semibold">{format(new Date(shipment.date), "dd/MM/yyyy", { locale: es })}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="text-lg font-semibold">{shipment.client}</p>
              {shipment.clientPhone && <p className="text-sm">{shipment.clientPhone}</p>}
              <p className="text-sm">{shipment.clientAddress}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transporte</p>
              <p className="text-lg font-semibold">{shipment.transport}</p>
              {shipment.transportPhone && <p className="text-sm">{shipment.transportPhone}</p>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cantidad de Bultos</p>
              <p className="text-lg font-semibold">{shipment.packages}</p>
            </div>
            {shipment.pallets && shipment.pallets > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Pallets</p>
                <p className="text-lg font-semibold">{shipment.pallets}</p>
              </div>
            )}
            {shipment.weight && shipment.weight > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Peso</p>
                <p className="text-lg font-semibold">{shipment.weight} kg</p>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="space-y-3">
            {shipment.invoiceNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Número de Factura</p>
                <p className="text-base font-medium">{shipment.invoiceNumber}</p>
              </div>
            )}

            {shipment.deliveryNote && (
              <div>
                <p className="text-sm text-muted-foreground">Nota de Entrega</p>
                <p className="text-base font-medium">{shipment.deliveryNote}</p>
              </div>
            )}

            {shipment.orderNote && (
              <div>
                <p className="text-sm text-muted-foreground">Nota de Pedido</p>
                <p className="text-base font-medium">{shipment.orderNote}</p>
              </div>
            )}
          </div>

          {shipment.attachments && shipment.attachments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Archivos adjuntos</h3>
              <div className="space-y-2">
                {shipment.attachments.map((url, index) => (
                  <Button key={index} asChild variant="outline" className="w-full bg-transparent">
                    <a href={url} target="_blank" rel="noopener noreferrer" download>
                      Descargar archivo {index + 1}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(shipment.hasColdChain || shipment.isUrgent) && (
            <div className="mt-4 text-center font-bold text-xl">
              {shipment.hasColdChain && <div className="text-blue-600">CADENA DE FRÍO</div>}
              {shipment.isUrgent && <div className="text-red-600">URGENTE</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
