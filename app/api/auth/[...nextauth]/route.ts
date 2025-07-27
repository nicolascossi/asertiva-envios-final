import NextAuth, { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { FirestoreAdapter } from "@auth/firebase-adapter"
import { adminDb } from "@/lib/firebase-admin"

// Define el tipo correcto para las opciones de autenticación
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: FirestoreAdapter(adminDb) as any, // Usamos 'as any' para evitar problemas de tipo con el adaptador
  callbacks: {
    async session({ session, user }) {
      if (session?.user) {
        session.user.id = user.id
      }
      return session
    },
  },
}

// Creamos el handler con las opciones tipadas correctamente
const handler = NextAuth(authOptions)

// Exportamos los handlers GET y POST
export { handler as GET, handler as POST }
