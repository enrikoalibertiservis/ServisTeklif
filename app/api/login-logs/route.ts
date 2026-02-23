import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q        = searchParams.get("q") || ""
  const success  = searchParams.get("success")
  const from     = searchParams.get("from")
  const to       = searchParams.get("to")
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30")))

  const where: any = {}

  if (success === "true")  where.success = true
  if (success === "false") where.success = false

  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from + "T00:00:00")
    if (to)   where.createdAt.lte = new Date(to   + "T23:59:59")
  }

  if (q) {
    where.OR = [
      { email:   { contains: q, mode: "insensitive" } },
      { ip:      { contains: q } },
      { city:    { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.loginLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { name: true } } },
    }),
    prisma.loginLog.count({ where }),
  ])

  return NextResponse.json({ items, total })
}
