import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Hassas ayar anahtarları — sadece ADMIN görebilir
const SENSITIVE_KEYS = ["aiApiKey", "aiApiUrl", "aiProvider", "aiModel"]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const settings = await prisma.appSetting.findMany()

  // ADMIN değilse hassas anahtarları gizle
  if (session.user.role !== "ADMIN") {
    const filtered = settings.filter(s => !SENSITIVE_KEYS.includes(s.key))
    return NextResponse.json(filtered)
  }

  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()

  for (const [key, value] of Object.entries(body)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  return NextResponse.json({ success: true })
}
