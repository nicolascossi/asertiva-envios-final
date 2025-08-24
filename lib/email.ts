import { Resend } from "resend"
import type { Shipment } from "@/lib/types"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendShipmentNotification(shipment: Shipment) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Tu Nombre <tu.email@gmail.com>", // Reemplaza con tu nombre y dirección de Gmail
      to: [shipment.clientEmail],
      subject: `Equipo Gemico ya envió el pedido número ${shipment.shipmentNumber}`,
      html: `
        <h1>Su envío ha sido despachado</h1>
        <p>Estimado cliente,</p>
        <p>Nos complace informarle que su envío con número ${shipment.shipmentNumber} ha sido enviado el ${new Date(shipment.date).toLocaleDateString()}.</p>
        <h2>Detalles del envío:</h2>
        <ul>
          <li><strong>Número de envío:</strong> ${shipment.shipmentNumber}</li>
          <li><strong>Fecha de despacho:</strong> ${new Date(shipment.date).toLocaleDateString()}</li>
          <li><strong>Cantidad de bultos:</strong> ${shipment.packages}</li>
          <li><strong>Ver detalles del envío:</strong> <a href="https://v0-gemico-app.vercel.app/pedido/${shipment.shipmentNumber}" target="_blank">CLICK ACA</a></li>
        </ul>
        <h2>Información del transporte:</h2>
        <ul>
          <li><strong>Nombre del transporte:</strong> ${shipment.transport}</li>
          <li><strong>Teléfono del transporte:</strong> ${shipment.transportPhone}</li>
          <li><strong>Email del transporte:</strong> ${shipment.transportEmail}</li>
        </ul>
        <h2>Recuerde que puede DESCARGAR factura/remito escaneando el QR en los bultos</h2>
        <p>Puede hacer seguimiento de su envío contactando directamente con el transporte.</p>
        
        <p>Gracias por confiar en Equipo Gemico.</p>
      `,
    })

    if (error) {
      console.error("Error sending email:", error)
      throw new Error("Failed to send email")
    }

    console.log("Email sent successfully:", data)
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}
