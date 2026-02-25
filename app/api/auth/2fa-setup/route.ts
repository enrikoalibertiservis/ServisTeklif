import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateSecret, keyuri, verifyTotp } from "@/lib/totp"
import QRCode from "qrcode"

/** Admin: belirli bir kullanıcı için QR kod + secret üret */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { userId } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 })

  const secret = generateSecret()
  const otpauth = keyuri(user.email, "Servis Teklif", secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth)

  return NextResponse.json({ secret, qrDataUrl, email: user.email })
}

/** Admin: secret doğrula ve 2FA'yı etkinleştir */
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { userId, secret, token } = await req.json()
  const isValid = verifyTotp(token, secret)
  if (!isValid) return NextResponse.json({ error: "Kod hatalı. Lütfen tekrar deneyin." }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: true },
  })

  return NextResponse.json({ success: true })
}

/** Admin: 2FA'yı devre dışı bırak */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { userId } = await req.json()
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  })

  return NextResponse.json({ success: true })
}
