import * as functions from "firebase-functions"
import * as nodemailer from "nodemailer"

const gmailEmail = functions.config().gmail.email
const gmailPassword = functions.config().gmail.password

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailEmail,
    pass: gmailPassword,
  },
})

export const sendEmail = functions.https.onRequest(async (request, response) => {
  const corsHandler = require("cors")({ origin: true })

  corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed")
      return
    }

    try {
      const { to, subject, text, html } = request.body

      if (!to || !subject || (!text && !html)) {
        throw new Error("Missing required email parameters")
      }

      const mailOptions = {
        from: gmailEmail,
        to,
        subject,
        text,
        html,
      }

      await transporter.sendMail(mailOptions)

      response.status(200).send({ success: true, message: "Email sent successfully" })
    } catch (error) {
      console.error("Error sending email:", error)
      response.status(500).send({ success: false, error: error.message })
    }
  })
})
