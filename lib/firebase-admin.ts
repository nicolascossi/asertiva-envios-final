import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getDatabase } from "firebase-admin/database"

const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!, "base64").toString())

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  })
}

export const adminDb = getFirestore()
export const adminRtdb = getDatabase()
