import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const namesOnly = searchParams.get("namesOnly") === "true"

  // Sadece isim listesi için tüm kullanıcılar erişebilir (ikame danışman dropdown)
  if (namesOnly) {
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json({ users })
  }

  // Tam liste sadece admin
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, twoFactorEnabled: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users)
  } catch {
    // twoFactorEnabled kolonu henüz DB'de yoksa — SQL çalıştırılmamış
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(users.map(u => ({ ...u, twoFactorEnabled: false })))
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Tüm alanlar gereklidir" }, { status: 400 })
  }

  // Güçlü şifre kuralları
  const pwdErrors: string[] = []
  if (password.length < 8)                      pwdErrors.push("En az 8 karakter")
  if (!/[A-Z]/.test(password))                  pwdErrors.push("En az 1 büyük harf")
  if (!/[a-z]/.test(password))                  pwdErrors.push("En az 1 küçük harf")
  if (!/[0-9]/.test(password))                  pwdErrors.push("En az 1 rakam")
  if (!/[^A-Za-z0-9]/.test(password))           pwdErrors.push("En az 1 özel karakter (!@#$... vb.)")
  if (pwdErrors.length > 0) {
    return NextResponse.json({ error: `Şifre gereksinimleri: ${pwdErrors.join(", ")}` }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Bu e-posta adresi zaten kullanılıyor" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: role || "ADVISOR" },
  })

  return NextResponse.json({ id: user.id, name: user.name, email: user.email })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  }

  const body = await req.json()
  const { id, active, password, role } = body

  if (password !== undefined) {
    // Şifre güncelleme
    const pwdErrors: string[] = []
    if (password.length < 8)           pwdErrors.push("En az 8 karakter")
    if (!/[A-Z]/.test(password))       pwdErrors.push("En az 1 büyük harf")
    if (!/[a-z]/.test(password))       pwdErrors.push("En az 1 küçük harf")
    if (!/[0-9]/.test(password))       pwdErrors.push("En az 1 rakam")
    if (!/[^A-Za-z0-9]/.test(password)) pwdErrors.push("En az 1 özel karakter")
    if (pwdErrors.length > 0) {
      return NextResponse.json({ error: `Şifre gereksinimleri: ${pwdErrors.join(", ")}` }, { status: 400 })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id }, data: { passwordHash } })
    return NextResponse.json({ success: true })
  }

  if (role !== undefined) {
    // Rol değiştirme
    if (!["ADMIN", "ADVISOR"].includes(role)) {
      return NextResponse.json({ error: "Geçersiz rol." }, { status: 400 })
    }
    await prisma.user.update({ where: { id }, data: { role } })
    return NextResponse.json({ success: true })
  }

  await prisma.user.update({ where: { id }, data: { active } })
  return NextResponse.json({ success: true })
}
