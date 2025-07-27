import { TestEmailButton } from "./TestEmailButton"

export function AdminDashboard() {
  return (
    <div>
      <h1>Panel de Administración</h1>
      {/* Other components and functionalities */}
      <div className="mt-4">
        <h2>Prueba de Envío de Email</h2>
        <TestEmailButton />
      </div>
    </div>
  )
}
