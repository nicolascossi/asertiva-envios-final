import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { to, subject, text, html, attachments } = data

    // Validar los datos recibidos
    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Configurar el transporte de correo
    const transporter = nodemailer.createTransport({
      service: "Brevo", // Usar Brevo (anteriormente Sendinblue)
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.BREVO_API_KEY,
      },
    })

    // Configurar las opciones del correo
    const mailOptions = {
      from: process.env.SENDER_EMAIL || "deposito@asertiva.site",
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
      attachments,
    }

    // Enviar el correo
    const info = await transporter.sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
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
