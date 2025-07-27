import { NextResponse } from "next/server"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const shipmentNumber = formData.get("shipmentNumber") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!shipmentNumber) {
      return NextResponse.json({ error: "No shipment number provided" }, { status: 400 })
    }

    const fileRef = ref(storage, `shipments/${shipmentNumber}/${file.name}`)
    const fileBuffer = await file.arrayBuffer()

    await uploadBytes(fileRef, Buffer.from(fileBuffer), {
      contentType: file.type || "application/octet-stream",
    })

    const url = await getDownloadURL(fileRef)

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Error uploading file", details: error.message }, { status: 500 })
  }
}
