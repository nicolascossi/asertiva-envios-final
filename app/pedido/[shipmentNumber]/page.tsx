import { notFound } from "next/navigation"
import { getShipmentByNumber } from "@/lib/shipment"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Package,
  MapPin,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  ClipboardList,
  Snowflake,
  AlertTriangle,
  File as Fragile,
} from "lucide-react"

interface PageProps {
  params: {
    shipmentNumber: string
  }
}

export default async function ShipmentDetailsPage({ params }: PageProps) {
  const shipment = await getShipmentByNumber(params.shipmentNumber)

  if (!shipment) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Detalles del Envío</h1>
          <p className="text-gray-600">Información completa del envío</p>
        </div>

        {/* Main Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Información del Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Número de Remito - Destacado */}
            {shipment.remitNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Número de Remito</span>
                </div>
                <p className="text-lg font-bold text-blue-900">{shipment.remitNumber}</p>
              </div>
            )}

            {/* Valor Declarado - Destacado */}
            {shipment.declaredValue && shipment.declaredValue > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Valor Declarado</span>
                </div>
                <p className="text-lg font-bold text-green-900">${shipment.declaredValue.toLocaleString()}</p>
              </div>
            )}

            {/* Cliente */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Cliente</span>
              </div>
              <p className="text-lg font-semibold">{shipment.client}</p>
            </div>

            {/* Dirección */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Dirección de Entrega</span>
              </div>
              <p className="text-gray-900">{shipment.clientAddress}</p>
              {shipment.clientAddressTitle && <p className="text-gray-600 text-sm">[{shipment.clientAddressTitle}]</p>}
            </div>

            {/* Transporte */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Transporte</span>
              </div>
              <p className="text-gray-900">{shipment.transport}</p>
            </div>

            {/* Fecha */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Fecha de Envío</span>
              </div>
              <p className="text-gray-900">
                {format(new Date(shipment.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>

            {/* Número de Factura */}
            {shipment.invoiceNumber && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Número de Factura</span>
                </div>
                <p className="text-gray-900">{shipment.invoiceNumber}</p>
              </div>
            )}

            {/* Nota de Entrega */}
            {shipment.deliveryNote && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Nota de Entrega</span>
                </div>
                <p className="text-gray-900">{shipment.deliveryNote}</p>
              </div>
            )}

            {/* Nota de Pedido */}
            {shipment.orderNote && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Nota de Pedido</span>
                </div>
                <p className="text-gray-900">{shipment.orderNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Package Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Paquete</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cantidad de Bultos</p>
              <p className="text-xl font-semibold">{shipment.packages}</p>
            </div>
            {shipment.pallets && shipment.pallets > 0 && (
              <div>
                <p className="text-sm text-gray-600">Pallets</p>
                <p className="text-xl font-semibold">{shipment.pallets}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Peso Total</p>
              <p className="text-xl font-semibold">{shipment.weight || 0} kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Volumen</p>
              <p className="text-xl font-semibold">{shipment.volume || 0} m³</p>
            </div>
          </CardContent>
        </Card>

        {/* Special Conditions */}
        {(shipment.hasColdChain || shipment.isUrgent || shipment.isFragile) && (
          <Card>
            <CardHeader>
              <CardTitle>Condiciones Especiales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {shipment.hasColdChain && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 p-2">
                  <Snowflake className="h-4 w-4 mr-2" />
                  Cadena de Frío (2° a 8°)
                </Badge>
              )}
              {shipment.isUrgent && (
                <Badge variant="secondary" className="bg-red-100 text-red-800 p-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Envío Urgente
                </Badge>
              )}
              {shipment.isFragile && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 p-2">
                  <Fragile className="h-4 w-4 mr-2" />
                  Frágil
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2024 Asertiva- Sistema de Seguimiento</p>
        </div>
      </div>
    </div>
  )
}
