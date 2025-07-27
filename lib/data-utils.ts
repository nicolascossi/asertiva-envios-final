import type { Client, Transport, ClientAddress } from "./types"
import { ref, get, set, push, update as firebaseUpdate, remove } from "firebase/database"
import { db } from "./firebase"

// Get clients from Firebase
export async function getClients(): Promise<Client[]> {
  const clientsRef = ref(db, "clients")
  const snapshot = await get(clientsRef)

  if (snapshot.exists()) {
    const clientsData = snapshot.val()
    const clients = Object.entries(clientsData).map(([id, data]) => {
      const clientData = data as Omit<Client, "id">

      // Ensure addresses is an array (convert from object if needed)
      let addresses: ClientAddress[] = []
      if (clientData.addresses) {
        if (Array.isArray(clientData.addresses)) {
          addresses = clientData.addresses
        } else {
          // Convert from object to array if stored as object
          addresses = Object.entries(clientData.addresses).map(([addressId, address]) => ({
            id: addressId,
            ...(address as Omit<ClientAddress, "id">),
            title: (address as any).title || "", // Asegurarse de que el título se incluya
          }))
        }
      }

      return {
        id,
        ...clientData,
        addresses: addresses,
      }
    })

    // Sort clients alphabetically by businessName
    return clients.sort((a, b) => a.businessName.localeCompare(b.businessName))
  }

  return []
}

// Get transports from Firebase
export async function getTransports(): Promise<Transport[]> {
  const transportsRef = ref(db, "transports")
  const snapshot = await get(transportsRef)

  if (snapshot.exists()) {
    const transportsData = snapshot.val()
    return Object.entries(transportsData).map(([firebaseId, data]) => {
      // Usar el ID de Firebase como el ID principal del transporte
      // y guardar el ID interno como un campo separado si es necesario
      const transportData = data as any
      return {
        id: firebaseId,
        internalId: transportData.id || "",
        name: transportData.name || "",
        email: transportData.email || "",
        phone: transportData.phone || "",
      } as Transport
    })
  }

  return []
}

// Add a new client to Firebase
export async function addClient(client: Omit<Client, "id">): Promise<string> {
  const clientsRef = ref(db, "clients")
  const newClientRef = push(clientsRef)

  // Ensure addresses have proper IDs and titles
  const addresses = client.addresses.map((addr) => {
    // If the address doesn't have an ID, generate one
    if (!addr.id) {
      return {
        ...addr,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: addr.title || "", // Asegurarse de que el título siempre esté presente
      }
    }
    return {
      ...addr,
      title: addr.title || "", // Asegurarse de que el título siempre esté presente
    }
  })

  await set(newClientRef, { ...client, addresses })
  return newClientRef.key as string
}

// Update an existing client in Firebase
export async function updateClient(id: string, updates: Partial<Client>): Promise<void> {
  const clientRef = ref(db, `clients/${id}`)

  // Si hay actualizaciones de direcciones, asegurarse de que cada dirección tenga un título
  if (updates.addresses) {
    updates.addresses = updates.addresses.map((addr) => ({
      ...addr,
      title: addr.title || "", // Asegurarse de que el título siempre esté presente
    }))
  }

  await firebaseUpdate(clientRef, updates)
}

// Delete a client from Firebase
export async function deleteClient(id: string): Promise<void> {
  if (!id) {
    throw new Error("Invalid client ID provided for deletion")
  }

  console.log(`Attempting to delete client with ID: ${id}`)
  const clientRef = ref(db, `clients/${id}`)

  try {
    // First check if the client exists
    const snapshot = await get(clientRef)
    if (!snapshot.exists()) {
      throw new Error(`Client with ID ${id} not found`)
    }

    // Then remove it
    await remove(clientRef)
    console.log(`Client with ID ${id} successfully deleted`)
  } catch (error) {
    console.error(`Error deleting client with ID ${id}:`, error)
    throw error // Re-throw to handle in the UI
  }
}

// Add a new transport to Firebase
export async function addTransport(transport: Omit<Transport, "id">): Promise<string> {
  const transportsRef = ref(db, "transports")
  const newTransportRef = push(transportsRef)

  // Asegurarse de que el transporte tenga un ID interno si no lo tiene
  const transportToSave = {
    ...transport,
    id: transport.internalId || Date.now().toString(), // Usar internalId si existe, o generar uno nuevo
  }

  // Eliminar internalId para no duplicar datos
  if ("internalId" in transportToSave) {
    delete (transportToSave as any).internalId
  }

  await set(newTransportRef, transportToSave)
  return newTransportRef.key as string
}

// Update an existing transport in Firebase
export async function updateTransport(id: string, updates: Partial<Transport>): Promise<void> {
  const transportRef = ref(db, `transports/${id}`)

  // Preparar las actualizaciones para la estructura de la base de datos
  const updatesToSave = { ...updates }

  // Si hay un internalId, moverlo a id para la estructura de la base de datos
  if ("internalId" in updatesToSave) {
    updatesToSave.id = updatesToSave.internalId
    delete updatesToSave.internalId
  }

  await firebaseUpdate(transportRef, updatesToSave)
}

// Delete a transport from Firebase
export async function deleteTransport(id: string): Promise<void> {
  if (!id) {
    throw new Error("Invalid transport ID provided for deletion")
  }

  console.log(`Attempting to delete transport with Firebase ID: ${id}`)
  const transportRef = ref(db, `transports/${id}`)

  try {
    // First check if the transport exists
    const snapshot = await get(transportRef)
    if (!snapshot.exists()) {
      throw new Error(`Transport with Firebase ID ${id} not found`)
    }

    // Then remove it
    await remove(transportRef)
    console.log(`Transport with Firebase ID ${id} successfully deleted`)
  } catch (error) {
    console.error(`Error deleting transport with Firebase ID ${id}:`, error)
    throw error // Re-throw to handle in the UI
  }
}
