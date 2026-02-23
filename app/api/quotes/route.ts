import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const isAdmin = session.user.role === "ADMIN"
  const { searchParams } = new URL(req.url)
  const q        = searchParams.get("q") || ""
  const status   = searchParams.get("status") || "ALL"
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")))
  const all      = searchParams.get("all") === "true"

  const where: any = isAdmin ? {} : { createdById: session.user.id }

  if (status && status !== "ALL") {
    where.status = status
  }

  if (q) {
    where.OR = [
      { quoteNo:      { contains: q, mode: "insensitive" } },
      { plateNo:      { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { brandName:    { contains: q, mode: "insensitive" } },
      { modelName:    { contains: q, mode: "insensitive" } },
      { subModelName: { contains: q, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
      ...(all ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
    }),
    prisma.quote.count({ where }),
  ])

  return NextResponse.json({ items, total })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { ids } = await req.json() as { ids: string[] }
  if (!ids?.length) return NextResponse.json({ error: "ids gerekli" }, { status: 400 })

  const result = await prisma.quote.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ deleted: result.count })
}
