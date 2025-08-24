import { NextResponse } from "next/server"
import { sendEmailNotification } from "@/lib/email-notification"
import type { Shipment } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const shipment: Shipment = await request.json()
    console.log("Received shipment data:", JSON.stringify(shipment, null, 2))

    if (!shipment.clientEmail) {
      throw new Error("Client email is missing")
    }

    const result = await sendEmailNotification(shipment)
    console.log("Email notification result:", JSON.stringify(result, null, 2))

    return NextResponse.json({
      message: "Email sent successfully",
      result,
      senderEmail: process.env.NEXT_PUBLIC_SENDER_EMAIL || "deposito@asertiva.site",
      attachmentsSent: shipment.attachments?.length || 0,
    })
  } catch (error) {
    console.error("Error in send-email route:", error)
    return NextResponse.json(
      {
        message: "Failed to send email",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        details: error.response?.data || "No additional details available",
      },
      { status: 500 },
    )
  }
}
