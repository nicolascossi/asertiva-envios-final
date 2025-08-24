import type { Shipment } from "@/lib/types"

export async function sendEmail(to: string, subject: string, body: string) {
  // En un entorno de producción, aquí se integraría con un servicio de correo electrónico real
  // Por ahora, solo simularemos el envío imprimiendo en la consola
  console.log(`Enviando correo a: ${to}`)
  console.log(`Asunto: ${subject}`)
  console.log(`Cuerpo: ${body}`)

  // Simular un retraso de envío
  await new Promise((resolve) => setTimeout(resolve, 1000))

  console.log("Correo enviado con éxito")
}

export function generateEmailBody(shipment: Shipment): string {
  let body = `Estimado cliente,

Su envío con número ${shipment.shipmentNumber} ha sido enviado el ${new Date(shipment.date).toLocaleDateString()}.

Detalles del envío:
- Cliente: ${shipment.client}
- Transporte: ${shipment.transport}
- Cantidad de bultos: ${shipment.packages}`

  if (shipment.attachments && shipment.attachments.length > 0) {
    body += `

Documentos adjuntos:
${shipment.attachments.map((url, index) => `- Documento ${index + 1}: ${url}`).join("\n")}`
  }

  body += `

Gracias por confiar en nuestros servicios.

Atentamente,
Asertiva  

  return body
}
