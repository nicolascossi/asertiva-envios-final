export interface Client {
  id: string
  name: string
  code?: string
  phone: string
  email: string
  address: string
  addressTitle?: string
}

export interface Transport {
  id: string
  name: string
  phone: string
  email: string
}

export interface Shipment {
  id: string
  shipmentNumber: string
  client: string
  clientCode?: string
  clientPhone: string
  clientEmail: string
  clientAddress: string
  clientAddressTitle?: string
  transport: string
  transportPhone: string
  transportEmail: string
  date: string
  packages: number
  pallets?: number
  weight?: number
  volume?: number
  status: "pending" | "sent"
  hasColdChain: boolean
  isUrgent: boolean
  isFragile?: boolean
  invoiceNumber?: string
  remitNumber?: string
  deliveryNote?: string
  orderNote?: string
  declaredValue?: number
  attachments?: string[]
  observations?: string
  notes?: string
}

export interface EmailLog {
  id: string
  to: string
  subject: string
  timestamp: string
  status: "sent" | "failed"
  error?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user"
}
