import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/** Şifre doğrulama — 2FA gerekli mi? (session oluşturmaz) */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: "Eksik alan" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.active) return NextResponse.json({ error: "Geçersiz kimlik bilgileri" }, { status: 401 })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return NextResponse.json({ error: "Geçersiz kimlik bilgileri" }, { status: 401 })

  return NextResponse.json({ requires2fa: user.twoFactorEnabled })
}
