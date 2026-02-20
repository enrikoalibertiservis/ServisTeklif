import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
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

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { ids } = body as { ids: string[] }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids gerekli" }, { status: 400 })
  }

  const result = await prisma.part.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, partNo, name, unitPrice } = body as { id: string; partNo?: string; name?: string; unitPrice?: number }

  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 })

  const updated = await prisma.part.update({
    where: { id },
    data: {
      ...(partNo    !== undefined ? { partNo }                        : {}),
      ...(name      !== undefined ? { name }                          : {}),
      ...(unitPrice !== undefined ? { unitPrice, validFrom: new Date() } : {}),
    },
  })

  return NextResponse.json(updated)
}
