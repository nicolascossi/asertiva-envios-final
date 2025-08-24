import { db } from "./firebase"
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore"
import type { Shipment, Client, Transport } from "./types"

export async function createShipment(shipment: Omit<Shipment, "id">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "shipments"), shipment)
    return docRef.id
  } catch (error) {
    console.error("Error creating shipment:", error)
    throw error
  }
}

export async function getShipments(): Promise<Shipment[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "shipments"))
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Shipment,
    )
  } catch (error) {
    console.error("Error getting shipments:", error)
    throw error
  }
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  try {
    const docRef = doc(db, "shipments", id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Shipment
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting shipment:", error)
    throw error
  }
}

export async function getShipmentByNumber(shipmentNumber: string): Promise<Shipment | null> {
  try {
    const q = query(collection(db, "shipments"), where("shipmentNumber", "==", shipmentNumber), limit(1))
    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
      } as Shipment
    } else {
      return null
    }
  } catch (error) {
    console.error("Error getting shipment by number:", error)
    throw error
  }
}

export async function updateShipment(id: string, shipment: Partial<Shipment>): Promise<void> {
  try {
    const docRef = doc(db, "shipments", id)
    await updateDoc(docRef, shipment)
  } catch (error) {
    console.error("Error updating shipment:", error)
    throw error
  }
}

export async function deleteShipment(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "shipments", id))
  } catch (error) {
    console.error("Error deleting shipment:", error)
    throw error
  }
}

export async function getClients(): Promise<Client[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "clients"))
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Client,
    )
  } catch (error) {
    console.error("Error getting clients:", error)
    throw error
  }
}

export async function getTransports(): Promise<Transport[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "transports"))
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Transport,
    )
  } catch (error) {
    console.error("Error getting transports:", error)
    throw error
  }
}

export async function getNextShipmentNumber(): Promise<string> {
  try {
    const q = query(collection(db, "shipments"), orderBy("shipmentNumber", "desc"), limit(1))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      return "1"
    }

    const lastShipment = querySnapshot.docs[0].data()
    const lastNumber = Number.parseInt(lastShipment.shipmentNumber) || 0
    return (lastNumber + 1).toString()
  } catch (error) {
    console.error("Error getting next shipment number:", error)
    return "1"
  }
}
