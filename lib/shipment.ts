import { db } from "./firebase"
import { ref, get, push, set, remove, update } from "firebase/database"
import type { Shipment } from "./types"

export async function createShipment(shipmentData: Omit<Shipment, "id">): Promise<string> {
  try {
    const shipmentsRef = ref(db, "shipments")
    const newShipmentRef = push(shipmentsRef)
    await set(newShipmentRef, shipmentData)
    return newShipmentRef.key!
  } catch (error) {
    console.error("Error creating shipment:", error)
    throw error
  }
}

export async function getShipments(): Promise<Shipment[]> {
  try {
    const shipmentsRef = ref(db, "shipments")
    const snapshot = await get(shipmentsRef)

    if (snapshot.exists()) {
      const shipmentsData = snapshot.val()
      return Object.entries(shipmentsData).map(([id, data]) => ({
        id,
        ...data,
      })) as Shipment[]
    }

    return []
  } catch (error) {
    console.error("Error fetching shipments:", error)
    return []
  }
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  try {
    const shipmentRef = ref(db, `shipments/${id}`)
    const snapshot = await get(shipmentRef)

    if (snapshot.exists()) {
      return { id, ...snapshot.val() } as Shipment
    }

    return null
  } catch (error) {
    console.error("Error fetching shipment:", error)
    return null
  }
}

export async function getShipmentByNumber(shipmentNumber: string): Promise<Shipment | null> {
  try {
    const shipmentsRef = ref(db, "shipments")
    const snapshot = await get(shipmentsRef)

    if (snapshot.exists()) {
      const shipmentsData = snapshot.val()
      const foundShipment = Object.entries(shipmentsData).find(
        ([_, shipment]: [string, any]) => shipment.shipmentNumber === shipmentNumber,
      )

      if (foundShipment) {
        const [id, shipmentData] = foundShipment
        return { id, ...shipmentData } as Shipment
      }
    }

    return null
  } catch (error) {
    console.error("Error fetching shipment by number:", error)
    return null
  }
}

export async function updateShipment(id: string, updates: Partial<Shipment>): Promise<void> {
  try {
    const shipmentRef = ref(db, `shipments/${id}`)
    await update(shipmentRef, updates)
  } catch (error) {
    console.error("Error updating shipment:", error)
    throw error
  }
}

export async function deleteShipment(id: string): Promise<void> {
  try {
    const shipmentRef = ref(db, `shipments/${id}`)
    await remove(shipmentRef)
  } catch (error) {
    console.error("Error deleting shipment:", error)
    throw error
  }
}

export async function getShipmentsByDateRange(startDate: string, endDate: string): Promise<Shipment[]> {
  try {
    const shipments = await getShipments()
    return shipments.filter((shipment) => {
      const shipmentDate = new Date(shipment.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return shipmentDate >= start && shipmentDate <= end
    })
  } catch (error) {
    console.error("Error fetching shipments by date range:", error)
    return []
  }
}

export async function searchShipments(query: string): Promise<Shipment[]> {
  try {
    const shipments = await getShipments()
    const searchTerm = query.toLowerCase()

    return shipments.filter(
      (shipment) =>
        shipment.client.toLowerCase().includes(searchTerm) ||
        shipment.transport.toLowerCase().includes(searchTerm) ||
        shipment.shipmentNumber.toLowerCase().includes(searchTerm) ||
        (shipment.clientCode && shipment.clientCode.toLowerCase().includes(searchTerm)) ||
        (shipment.invoiceNumber && shipment.invoiceNumber.toLowerCase().includes(searchTerm)) ||
        (shipment.remitNumber && shipment.remitNumber.toLowerCase().includes(searchTerm)) ||
        (shipment.deliveryNote && shipment.deliveryNote.toLowerCase().includes(searchTerm)) ||
        (shipment.orderNote && shipment.orderNote.toLowerCase().includes(searchTerm)),
    )
  } catch (error) {
    console.error("Error searching shipments:", error)
    return []
  }
}
