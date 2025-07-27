import type React from "react"
export default function PrintLabelsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-white text-black min-h-screen">{children}</div>
}
