import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { toUpperTR } from "@/lib/utils"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get("brandId")
  const q = searchParams.get("q") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")))

  if (!brandId) return NextResponse.json({ items: [], total: 0 })

  const where = {
    brandId,
    ...(q ? { OR: [{ operationCode: { contains: q } }, { name: { contains: q } }] } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.laborOperation.findMany({
      where,
      orderBy: { operationCode: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.laborOperation.count({ where }),
  ])

  return NextResponse.json({ items, total })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = await req.json()
  const { brandId, operationCode, name, durationHours, hourlyRate } = body as {
    brandId: string; operationCode: string; name: string; durationHours: number; hourlyRate: number
  }

  if (!brandId || !operationCode?.trim() || !name?.trim() || typeof hourlyRate !== "number") {
    return NextResponse.json({ error: "brandId, operationCode, name ve hourlyRate zorunludur" }, { status: 400 })
  }

  const existing = await prisma.laborOperation.findUnique({
    where: { brandId_operationCode: { brandId, operationCode: operationCode.trim() } },
  })
  if (existing) return NextResponse.json({ error: `'${operationCode}' kodu zaten kayıtlı` }, { status: 409 })

  const created = await prisma.laborOperation.create({
    data: {
      brandId,
      operationCode: operationCode.trim(),
      name: toUpperTR(name.trim()),
      durationHours: durationHours ?? 1,
      hourlyRate,
      totalPrice: hourlyRate * (durationHours ?? 1),
    },
  })
  return NextResponse.json(created, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = await req.json()
  const { ids } = body as { ids: string[] }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids gerekli" }, { status: 400 })
  }

  const result = await prisma.laborOperation.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = await req.json()
  const { id, name, hourlyRate, totalPrice } = body as { id: string; name?: string; hourlyRate?: number; totalPrice?: number }

  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 })

  const updated = await prisma.laborOperation.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: toUpperTR(name) } : {}),
      ...(hourlyRate !== undefined ? { hourlyRate, validFrom: new Date() } : {}),
      ...(totalPrice !== undefined ? { totalPrice } : {}),
    },
  })

  return NextResponse.json(updated)
}
