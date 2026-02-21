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
    ...(q ? { OR: [{ partNo: { contains: q } }, { name: { contains: q } }] } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.part.findMany({
      where,
      orderBy: { partNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.part.count({ where }),
  ])

  return NextResponse.json({ items, total })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = await req.json()
  const { brandId, partNo, name, unitPrice } = body as { brandId: string; partNo: string; name: string; unitPrice: number }

  if (!brandId || !partNo?.trim() || !name?.trim() || typeof unitPrice !== "number") {
    return NextResponse.json({ error: "brandId, partNo, name ve unitPrice zorunludur" }, { status: 400 })
  }

  const existing = await prisma.part.findUnique({
    where: { brandId_partNo: { brandId, partNo: partNo.trim() } },
  })
  if (existing) return NextResponse.json({ error: `'${partNo}' parça kodu zaten kayıtlı` }, { status: 409 })

  const created = await prisma.part.create({
    data: { brandId, partNo: partNo.trim(), name: toUpperTR(name.trim()), unitPrice },
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

  const result = await prisma.part.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
  const body = await req.json()
  const { id, partNo, name, unitPrice } = body as { id: string; partNo?: string; name?: string; unitPrice?: number }

  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 })

  const updated = await prisma.part.update({
    where: { id },
    data: {
      ...(partNo    !== undefined ? { partNo }                                        : {}),
      ...(name      !== undefined ? { name: toUpperTR(name) }                         : {}),
      ...(unitPrice !== undefined ? { unitPrice, validFrom: new Date() }              : {}),
    },
  })

  return NextResponse.json(updated)
}
