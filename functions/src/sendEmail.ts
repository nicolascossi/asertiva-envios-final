import * as functions from "firebase-functions"
import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"

const CLIENT_ID = "TU_CLIENT_ID"
const CLIENT_SECRET = "TU_CLIENT_SECRET"
const REDIRECT_URI = "https://developers.google.com/oauthplayground"
const REFRESH_TOKEN = "TU_REFRESH_TOKEN"

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

const gmail = google.gmail({ version: "v1", auth: oauth2Client })

export const sendShipmentNotification = functions.https.onCall(async (data, context) => {
  const { shipment } = data

  const subject = `Asertiva ya envió el pedido número ${shipment.shipmentNumber}`
  const to = shipment.clientEmail
  const from = "tu.email@gmail.com" // Tu dirección de Gmail

  const emailContent = `
    <h1>Su envío ha sido despachado</h1>
    <p>Estimado cliente,</p>
    <p>Nos complace informarle que su envío con número ${shipment.shipmentNumber} ha sido enviado el ${new Date(shipment.date).toLocaleDateString()}.</p>
    <h2>Detalles del envío:</h2>
    <ul>
      <li><strong>Número de envío:</strong> ${shipment.shipmentNumber}</li>
      <li><strong>Fecha de despacho:</strong> ${new Date(shipment.date).toLocaleDateString()}</li>
      <li><strong>Cantidad de bultos:</strong> ${shipment.packages}</li>
    </ul>
    <h2>Información del transporte:</h2>
    <ul>
      <li><strong>Nombre del transporte:</strong> ${shipment.transport}</li>
      <li><strong>Teléfono del transporte:</strong> ${shipment.transportPhone}</li>
      <li><strong>Email del transporte:</strong> ${shipment.transportEmail}</li>
    </ul>
    <p>Puede hacer seguimiento de su envío contactando directamente con el transporte.</p>
    <p>Gracias por confiar en Asertiva.</p>
  `

  const message = [
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    "",
    emailContent,
  ].join("\n")

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    })
    return { success: true, message: "Email sent successfully" }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: "Failed to send email" }
  }
})
