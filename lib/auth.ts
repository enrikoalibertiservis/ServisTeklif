import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

function getIp(req: any): string | null {
  try {
    const forwarded = req?.headers?.["x-forwarded-for"]
    if (forwarded) return String(forwarded).split(",")[0].trim()
    return req?.headers?.["x-real-ip"] ?? req?.socket?.remoteAddress ?? null
  } catch { return null }
}

function getUA(req: any): string | null {
  try { return req?.headers?.["user-agent"] ?? null } catch { return null }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email ?? ""
        const ip    = getIp(req)
        const ua    = getUA(req)

        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({ where: { email } })

        // Başarısız — kullanıcı yok
        if (!user) {
          await prisma.loginLog.create({ data: { email, success: false, ip, userAgent: ua } }).catch(() => {})
          return null
        }

        // Başarısız — hesap pasif
        if (!user.active) {
          await prisma.loginLog.create({ data: { userId: user.id, email, success: false, ip, userAgent: ua } }).catch(() => {})
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)

        // Başarısız — şifre yanlış
        if (!valid) {
          await prisma.loginLog.create({ data: { userId: user.id, email, success: false, ip, userAgent: ua } }).catch(() => {})
          return null
        }

        // Başarılı giriş
        await prisma.loginLog.create({ data: { userId: user.id, email, success: true, ip, userAgent: ua } }).catch(() => {})

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
}
