import type { Shipment } from "@/lib/types"

// In a real app, you would use a QR code generation library
// For this demo, we'll simulate it with a placeholder
export function generateQRValue(shipment: Shipment): string {
  return `https://asertiva-app.vercel.app/pedido/${shipment.shipmentNumber}`
}
