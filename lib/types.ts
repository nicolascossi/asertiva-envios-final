export interface Client {
  id: string
  businessName: string
  clientCode: string
  email: string
  phone: string
  addresses: ClientAddress[]
}

export interface ClientAddress {
  id: string
  street: string
  city?: string
  title?: string
  isDefault: boolean
}

export interface Transport {
  id: string
  name: string
  email: string
  phone: string
  transportCode: string
}

export interface Shipment {
  id: string
  shipmentNumber: string
  client: string
  clientEmail: string
  clientPhone: string
  clientAddress: string
  clientAddressId?: string
  clientAddressTitle?: string
  clientCode?: string
  transport: string
  transportEmail: string
  transportPhone: string
  date: string
  packages: number
  pallets?: number
  weight?: number
  declaredValue?: number
  status: "pending" | "sent"
  attachments?: string[]
  createdAt?: string
  invoiceNumber: string
  remitNumber: string
  deliveryNote: string // Campo para número de nota de entrega manual
  orderNote: string // Campo para nota de pedido
  notes: string
  hasColdChain: boolean
  isUrgent: boolean
  isFragile?: boolean
  remitoTriplicado?: boolean
  shippingCost?: number
}
