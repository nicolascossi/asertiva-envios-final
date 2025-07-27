"use client"

import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Shipment } from "@/lib/types"
import { useEffect, useState } from "react"
import QRCode from "qrcode"
import Image from "next/image"

interface ShipmentLabelProps {
  shipment: Shipment
  labelNumber: number
  totalLabels: number
  isLast: boolean
  labelType?: "numbered" | "bulk"
}

export default function ShipmentLabel({
  shipment,
  labelNumber,
  totalLabels,
  isLast,
  labelType = "numbered",
}: ShipmentLabelProps) {
  const [qrCode, setQrCode] = useState<string>("")

  useEffect(() => {
    const generateQR = async () => {
      try {
        const qrUrl = `${window.location.origin}/pedido/${shipment.shipmentNumber}`
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
          margin: 1,
          width: 120,
        })
        setQrCode(qrCodeDataUrl)
      } catch (err) {
        console.error("Error generating QR code:", err)
      }
    }
    generateQR()
  }, [shipment.shipmentNumber])

  // Determine what text to display for pallets and packages on separate lines
  const getPackageLines = () => {
    const hasPallets = shipment.pallets && shipment.pallets > 0
    let palletsLine = ""
    let packagesLine = ""

    // Set pallets line if there are pallets
    if (hasPallets) {
      palletsLine = `${shipment.pallets} Pallets`
    }

    // Set packages line based on label type
    if (labelType === "numbered") {
      packagesLine = `Bulto ${labelNumber}/${totalLabels}`
    } else {
      packagesLine = `${totalLabels} Bultos`
    }

    // Add ampersand to the beginning of packages line if there are pallets
    if (hasPallets) {
      packagesLine = `& ${packagesLine}`
    }

    return { palletsLine, packagesLine }
  }

  // Separar la dirección y la localidad
  const getAddressParts = () => {
    if (!shipment.clientAddress) return { street: "", city: "" }

    // Intentar separar por coma
    const parts = shipment.clientAddress.split(",")

    if (parts.length > 1) {
      // Si hay coma, la primera parte es la calle y el resto es la localidad
      const street = parts[0].trim()
      // Unir el resto de partes por si hay más de una coma
      const city = parts.slice(1).join(",").trim()
      return { street, city }
    } else {
      // Si no hay coma, intentar buscar un título entre corchetes
      const titleMatch = shipment.clientAddress.match(/\[(.*?)\]/)
      if (titleMatch) {
        // Si hay título, quitar el título y usar todo como calle
        const street = shipment.clientAddress.replace(/\[.*?\]/, "").trim()
        return { street, city: titleMatch[1] }
      }
      // Si no hay coma ni título, usar todo como calle
      return { street: shipment.clientAddress, city: "" }
    }
  }

  const addressParts = getAddressParts()
  const { palletsLine, packagesLine } = getPackageLines()

  return (
    <Card
      className={`border border-border w-[15cm] h-[10cm] mx-auto overflow-hidden bg-white text-black ${!isLast ? "print:break-after-page" : ""}`}
    >
      <CardContent className="p-3 flex flex-col h-full justify-between">
        {/* Sección superior - Encabezado y datos principales */}
        <div className="flex flex-col gap-2">
          {/* Encabezado - Fila superior */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/asertiva-68861.firebasestorage.app/o/LOGO%20ASERTIVA.png?alt=media&token=b8a415b0-f670-44c4-ac59-f53cc77ed3a8"
                alt="Asertiva Logo"
                width={100}
                height={50}
                className="object-contain"
                priority
              />
              <div>
                <h2 className="text-lg font-bold leading-tight">ASERTIVA S.A.</h2>
                <p className="text-sm text-gray-600 leading-tight">Vicente Lopez 749, Bahía Blanca</p>
                <p className="text-sm text-gray-600 leading-tight">Tel: 291-4521744</p>
              </div>
            </div>
            <div className="text-right">
              {palletsLine && <p className="text-2xl font-bold leading-tight">{palletsLine}</p>}
              <p className="text-2xl font-bold leading-tight">{packagesLine}</p>
              <p className="text-sm leading-tight">Peso: {shipment.weight || 0} kg</p>
              <p className="text-xs leading-tight">{format(new Date(shipment.date), "dd/MM/yyyy", { locale: es })}</p>
            </div>
          </div>

          {/* Contenido principal - Dos columnas */}
          <div className="flex gap-3">
            {/* Columna izquierda - Información del envío */}
            <div className="flex-1 flex flex-col gap-2">
              {/* Cliente */}
              <div>
                <p className="text-xs text-gray-600 mb-0">Cliente</p>
                <p className="text-xl font-bold mb-2">{shipment.client}</p>

                <p className="text-xs text-gray-600 mb-0">Dirección</p>
                <div className="mb-2">
                  <p className="text-lg">{addressParts.street}</p>
                  {addressParts.city && <p className="text-lg">{addressParts.city}</p>}

                  {/* Si el título no está incluido en clientAddress pero existe en clientAddressTitle, mostrarlo */}
                  {!shipment.clientAddress.includes("[") && shipment.clientAddressTitle && (
                    <p className="text-lg">[{shipment.clientAddressTitle}]</p>
                  )}
                </div>

                {/* Si el título no está incluido en clientAddress pero existe en clientAddressTitle, mostrarlo */}
                {/* {!shipment.clientAddress.includes("[") && shipment.clientAddressTitle && (
                  <p className="text-lg mb-3">[{shipment.clientAddressTitle}]</p>
                )} */}
              </div>

              {/* Transporte */}
              <div className="border-t pt-2">
                <p className="text-xs text-gray-600 mb-0">Transporte</p>
                <p className="text-base font-semibold leading-tight">{shipment.transport}</p>
              </div>

              {/* Número de Remito o Nota de Entrega */}
              {shipment.remitNumber && (
                <div>
                  <p className="text-xs text-gray-600 mb-0">Número de Remito</p>
                  <p className="text-sm font-semibold">{shipment.remitNumber}</p>
                </div>
              )}

              {shipment.deliveryNote && !shipment.remitNumber && (
                <div>
                  <p className="text-xs text-gray-600 mb-0">Nota de Entrega</p>
                  <p className="text-sm font-semibold">{shipment.deliveryNote}</p>
                </div>
              )}

              {/* Nota de Entrega */}
              {shipment.deliveryNote && (
                <div>
                  <p className="text-xs text-gray-600 mb-0">Nota de Entrega</p>
                  <p className="text-sm font-semibold">{shipment.deliveryNote}</p>
                </div>
              )}
            </div>

            {/* Columna derecha - QR */}
            <div className="w-[5cm] flex flex-col items-center justify-start">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center mb-2">
                {qrCode && <img src={qrCode || "/placeholder.svg"} alt="QR Code" className="w-28 h-28" />}
                <p className="text-center text-xs text-gray-600 mt-1">Escanee para ver detalles</p>
              </div>

              {/* Indicators stacked vertically */}
              <div className="w-full flex flex-col gap-1">
                {/* Texto de medicamentos - condicional según cadena de frío */}
                {shipment.hasColdChain ? (
                  <div className="w-full text-center font-bold text-[0.65rem] bg-blue-100 border border-blue-400 p-0.5 rounded">
                    MEDICAMENTOS CON CADENA DE FRIO (DE 2° A 8°)
                  </div>
                ) : (
                  <div className="w-full text-center font-bold text-[0.65rem] bg-yellow-100 border border-yellow-400 p-0.5 rounded">
                    MEDICAMENTOS{" "}
                    <span className="text-[0.65rem] font-normal">(MANTENER EN AMBIENTE CONTROLADO DE 15° A 25°)</span>
                  </div>
                )}

                {/* Indicadores condicionales */}
                {shipment.isUrgent && (
                  <div className="w-full text-center font-bold text-[0.65rem] bg-red-100 border border-red-400 p-0.5 rounded">
                    URGENTE
                  </div>
                )}

                {shipment.isFragile && (
                  <div className="w-full text-center font-extrabold text-base bg-purple-100 border-2 border-purple-500 p-1 rounded">
                    MUY FRÁGIL
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sección inferior - Advertencias */}
        <div className="mt-auto"></div>
      </CardContent>
    </Card>
  )
}
