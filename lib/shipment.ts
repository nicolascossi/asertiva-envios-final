export interface Shipment {
  id: string
  shipmentNumber: string
  client: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  transport: string
  transportEmail: string
  transportPhone: string
  date: string
  packages: number
  status: "pending" | "sent"
  attachments?: string[]
  createdAt?: string
  invoiceNumber: string
  remitNumber: string
  notes: string
  hasColdChain: boolean
  isUrgent: boolean
}
