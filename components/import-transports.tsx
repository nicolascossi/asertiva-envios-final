"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, Check, X } from "lucide-react"
import { addTransport } from "@/lib/data-utils"
import type { Transport } from "@/lib/types"
import Papa from "papaparse"

interface ImportTransportsProps {
  onImportComplete: (transports: Transport[]) => void
  onCancel: () => void
}

export default function ImportTransports({ onImportComplete, onCancel }: ImportTransportsProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importStats, setImportStats] = useState<{ total: number; success: number; failed: number } | null>(null)
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "complete">("upload")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      // Parse CSV file
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length > 0) {
            setParsedData(results.data)
            // Get headers from the first row
            setHeaders(Object.keys(results.data[0]))
            // Initialize field mapping with empty values
            const initialMapping: Record<string, string> = {}
            Object.keys(results.data[0]).forEach((header) => {
              // Try to auto-map common field names
              if (
                header.toLowerCase().includes("name") ||
                header.toLowerCase().includes("nombre") ||
                header.toLowerCase().includes("empresa") ||
                header.toLowerCase().includes("company")
              ) {
                initialMapping[header] = "name"
              } else if (header.toLowerCase().includes("email") || header.toLowerCase().includes("correo")) {
                initialMapping[header] = "email"
              } else if (
                header.toLowerCase().includes("phone") ||
                header.toLowerCase().includes("telefono") ||
                header.toLowerCase().includes("teléfono") ||
                header.toLowerCase().includes("tel")
              ) {
                initialMapping[header] = "phone"
              } else {
                initialMapping[header] = "none"
              }
            })
            setFieldMapping(initialMapping)
            setStep("mapping")
          } else {
            setError("El archivo no contiene datos")
          }
        },
        error: (error) => {
          setError(`Error al procesar el archivo: ${error.message}`)
        },
      })
    }
  }

  const handleFieldMappingChange = (header: string, value: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [header]: value,
    }))
  }

  const generatePreview = () => {
    // Map the data according to the field mapping
    const mappedData = parsedData.slice(0, 5).map((row) => {
      const mappedRow: Record<string, any> = {}
      Object.entries(fieldMapping).forEach(([header, field]) => {
        if (field && field !== "none") {
          mappedRow[field] = row[header]
        }
      })
      return mappedRow
    })

    setPreviewData(mappedData)
    setStep("preview")
  }

  const validateTransport = (transport: any): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!transport.name) errors.push("Nombre es requerido")
    if (transport.email && !/\S+@\S+\.\S+/.test(transport.email)) errors.push("Email inválido")

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  const handleImport = async () => {
    setIsLoading(true)
    setStep("importing")
    setError(null)

    const stats = { total: parsedData.length, success: 0, failed: 0 }
    const importedTransports: Transport[] = []

    try {
      for (const row of parsedData) {
        // Map the data according to the field mapping
        const transportData: Partial<Transport> = {}
        Object.entries(fieldMapping).forEach(([header, field]) => {
          if (field && field !== "id" && field !== "none") {
            transportData[field as keyof Omit<Transport, "id">] = row[header]
          }
        })

        // Validate transport data
        const validation = validateTransport(transportData)

        if (validation.isValid) {
          try {
            // Add transport to database
            const id = await addTransport(transportData as Omit<Transport, "id">)
            importedTransports.push({ id, ...transportData } as Transport)
            stats.success++
          } catch (error) {
            console.error("Error adding transport:", error)
            stats.failed++
          }
        } else {
          stats.failed++
        }
      }

      setImportStats(stats)
      setStep("complete")
      onImportComplete(importedTransports)
    } catch (error) {
      console.error("Error during import:", error)
      setError(`Error durante la importación: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const resetImport = () => {
    setFile(null)
    setParsedData([])
    setHeaders([])
    setFieldMapping({})
    setPreviewData([])
    setError(null)
    setImportStats(null)
    setStep("upload")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Importar Transportes</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Seleccionar archivo CSV</Label>
              <Input id="file" type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>El archivo debe ser un CSV con encabezados. Recomendamos incluir las siguientes columnas:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Nombre del transporte</li>
                <li>Email</li>
                <li>Teléfono</li>
              </ul>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Mapeo de campos</h3>
            <p className="text-sm text-muted-foreground">
              Asigne cada columna del archivo CSV a un campo en el sistema.
            </p>

            <div className="grid gap-4">
              {headers.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                  <div className="font-medium">{header}</div>
                  <Select
                    value={fieldMapping[header]}
                    onValueChange={(value) => handleFieldMappingChange(header, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No importar</SelectItem>
                      <SelectItem value="name">Nombre</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Teléfono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={resetImport}>
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={generatePreview}>
                Continuar <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vista previa</h3>
            <p className="text-sm text-muted-foreground">
              Verifique que los datos se hayan mapeado correctamente antes de importar.
            </p>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name || "-"}</TableCell>
                      <TableCell>{row.email || "-"}</TableCell>
                      <TableCell>{row.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Mostrando {previewData.length} de {parsedData.length} registros.
            </p>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Volver
              </Button>
              <Button onClick={handleImport}>Importar {parsedData.length} transportes</Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Importando transportes...</p>
          </div>
        )}

        {step === "complete" && importStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-full">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h3 className="text-lg font-medium text-center">Importación completada</h3>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-md">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{importStats.total}</p>
              </div>
              <div className="p-4 border rounded-md bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-muted-foreground">Exitosos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importStats.success}</p>
              </div>
              <div className="p-4 border rounded-md bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-muted-foreground">Fallidos</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importStats.failed}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {step === "complete" && (
        <CardFooter className="flex justify-center">
          <Button onClick={resetImport}>Importar más transportes</Button>
        </CardFooter>
      )}
    </Card>
  )
}
