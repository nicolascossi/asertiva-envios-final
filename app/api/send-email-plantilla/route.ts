import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { to, subject, html, pdfBase64, pdfFilename } = data

    // Validar los datos recibidos
    if (!to || !subject || !html || !pdfBase64 || !pdfFilename) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Configurar los datos para el correo
    const emailData = {
      sender: {
        name: "Equipo Gemico",
        email: process.env.NEXT_PUBLIC_SENDER_EMAIL || "envios@gemico.shop",
      },
      to: Array.isArray(to)
        ? to.map((email) => ({ email, name: "Equipo Gemico" }))
        : [{ email: to, name: "Equipo Gemico" }],
      subject,
      htmlContent: html,
      attachment: [
        {
          content: pdfBase64,
          name: pdfFilename,
          type: "application/pdf",
        },
      ],
    }

    // Enviar el correo usando la API de Brevo
    const API_KEY = process.env.BREVO_API_KEY
    const API_URL = "https://api.brevo.com/v3/smtp/email"

    if (!API_KEY) {
      console.error("BREVO_API_KEY no está configurada")
      throw new Error("API key no configurada")
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailData),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("Error de la API de Brevo:", responseData)
      throw new Error(`Error de la API de Brevo: ${JSON.stringify(responseData)}`)
    }

    return NextResponse.json({
      success: true,
      messageId: responseData.messageId || "Email enviado",
      message: "Correo enviado correctamente",
    })
  } catch (error) {
    console.error("Error al enviar el correo:", error)
    return NextResponse.json(
      {
        error: "Error al enviar el correo",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
