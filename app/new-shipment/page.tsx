import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import NewShipmentForm from "@/components/new-shipment-form"

export default function NewShipment() {
  const cookieStore = cookies()
  const isAuthenticated = cookieStore.get("authenticated")

  if (isAuthenticated?.value !== "true") {
    redirect("/")
  }

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold mb-6">Nuevo Envío</h1>
        <NewShipmentForm />
      </div>
    </main>
  )
}
