import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

const app = initializeApp(firebaseConfig)

export const db = getDatabase(app)
export const rtdb = getDatabase(app)
export const storage = getStorage(app)

// Initialize Functions and specify the region if necessary
const functions = getFunctions(app, "us-central1") // Reemplaza 'us-central1' con tu región si es diferente

// Si estás en desarrollo local, conecta al emulador de Functions
if (process.env.NODE_ENV === "development") {
  connectFunctionsEmulator(functions, "localhost", 5001)
}

export { functions }
