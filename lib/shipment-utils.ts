import { ref, get, runTransaction } from "firebase/database"
import { db } from "./firebase"

// Function to get the next shipment number without incrementing the counter
export async function getNextShipmentNumber(): Promise<string> {
  const counterRef = ref(db, "shipmentCounter")
  const snapshot = await get(counterRef)
  const counter = snapshot.exists() ? snapshot.val() : 0
  return `ENV-${(counter + 1).toString().padStart(6, "0")}`
}

// Function to generate and increment the shipment number (only when saving)
export async function generateShipmentNumber(): Promise<string> {
  const counterRef = ref(db, "shipmentCounter")

  // Use a transaction to safely increment the counter
  const result = await runTransaction(counterRef, (currentCounter) => {
    // If counter doesn't exist, start at 0
    const counter = currentCounter === null ? 0 : currentCounter
    return counter + 1
  })

  // Format the shipment number with leading zeros
  return `ENV-${result.snapshot.val().toString().padStart(6, "0")}`
}
