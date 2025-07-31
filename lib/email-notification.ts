import axios from "axios"
import type { Shipment } from "@/lib/types"

const API_KEY = process.env.BREVO_API_KEY
const API_URL = "https://api.brevo.com/v3/smtp/email"
const SENDER_EMAIL = process.env.NEXT_PUBLIC_SENDER_EMAIL || "envios@asertiva.com.ar"

export async function sendEmailNotification(shipment: Shipment): Promise<any> {
  console.log("Starting email notification process")
  console.log("API_KEY:", API_KEY ? "Configured" : "Not configured")
  console.log("SENDER_EMAIL:", SENDER_EMAIL)

  if (!API_KEY) {
    console.error("BREVO_API_KEY no está configurada")
    throw new Error("API key no configurada")
  }

  // Verificar y asignar valores por defecto si es necesario
  const safeShipment = {
    ...shipment,
    clientEmail: shipment.clientEmail || "cliente@example.com",
    client: shipment.client || "Cliente",
    shipmentNumber: shipment.shipmentNumber || "N/A",
    date: shipment.date || new Date().toISOString(),
    packages: shipment.packages || 0,
    transport: shipment.transport || "N/A",
    transportPhone: shipment.transportPhone || "N/A",
  }

  console.log("Safe shipment data:", JSON.stringify(safeShipment, null, 2))

  const emailData: any = {
    sender: {
      name: "Asertiva",
      email: SENDER_EMAIL,
    },
    to: [
      {
        email: safeShipment.clientEmail,
        name: safeShipment.client,
      },
    ],
    subject: `Su envío ${safeShipment.shipmentNumber} ha sido despachado`,
    htmlContent: `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #0066cc; }
            .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Su envío ha sido despachado</h1>
            <p>Estimado/a ${safeShipment.client},</p>
            <p>Nos complace informarle que su envío con número ${safeShipment.shipmentNumber} ha sido despachado el ${new Date(safeShipment.date).toLocaleDateString()}.</p>
            <div class="details">
              <h2>Detalles del envío:</h2>
              <ul>
                <li><strong>Número de envío:</strong> ${safeShipment.shipmentNumber}</li>
                <li><strong>Fecha de despacho:</strong> ${new Date(safeShipment.date).toLocaleDateString()}</li>
                <li><strong>Cantidad de bultos:</strong> ${safeShipment.packages}</li>
                <li><strong>Ver detalles del envío:</strong> <a href="https://asertiva-app.vercel.app/pedido/${safeShipment.shipmentNumber}" target="_blank">CLICK ACA</a></li>
              </ul>
              <h2>Información del transporte:</h2>
              <ul>
                <li><strong>Nombre del transporte:</strong> ${safeShipment.transport}</li>
                <li><strong>Teléfono del transporte:</strong> ${safeShipment.transportPhone}</li>
              </ul>
            </div>
            <p>Para más detalles o consultas sobre su envío, por favor escanee el código QR en la etiqueta del envío o contáctenos directamente.</p>
            <p>Gracias por confiar en Equipo Asertiva.</p>
            <div class="footer">
              <p>Este es un mensaje automático, por favor no responda a este correo.</p>
              <p>Si necesita asistencia, contáctenos a través de nuestros canales oficiales de atención al cliente.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }

  try {
    console.log("Sending email with data:", JSON.stringify(emailData, null, 2))
    const response = await axios.post(API_URL, emailData, {
      headers: {
        accept: "application/json",
        "api-key": API_KEY,
        "content-type": "application/json",
      },
    })

    console.log("Email sent successfully:", response.data)
    return response.data
  } catch (error) {
    console.error("Error sending email:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message)
    if (error.response) {
      console.error("Error status:", error.response.status)
      console.error("Error headers:", error.response.headers)
    }
    throw new Error(`Failed to send email: ${error.response ? JSON.stringify(error.response.data) : error.message}`)
  }
}
