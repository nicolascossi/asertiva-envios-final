"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { rtdb } from "@/lib/firebase"
import { ref, onValue, off } from "firebase/database"

interface EmailLog {
  id: string
  shipmentId: string
  shipmentNumber: string
  recipientEmail: string
  sentAt: string
  status: "sent" | "error"
  errorMessage?: string
}

export default function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([])

  useEffect(() => {
    const emailLogsRef = ref(rtdb, "emailLogs")
    const handleData = (snapshot: any) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const logsArray = Object.entries(data).map(([id, log]) => ({
          id,
          ...(log as Omit<EmailLog, "id">),
        }))
        setLogs(logsArray)
      } else {
        setLogs([])
      }
    }

    onValue(emailLogsRef, handleData)

    return () => {
      off(emailLogsRef, "value", handleData)
    }
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Registros de Correos Electrónicos</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número de Envío</TableHead>
            <TableHead>Destinatario</TableHead>
            <TableHead>Fecha de Envío</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{log.shipmentNumber}</TableCell>
              <TableCell>{log.recipientEmail}</TableCell>
              <TableCell>{new Date(log.sentAt).toLocaleString()}</TableCell>
              <TableCell>
                {log.status === "sent" ? (
                  <span className="text-green-600">Enviado</span>
                ) : (
                  <span className="text-red-600" title={log.errorMessage}>
                    Error
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
