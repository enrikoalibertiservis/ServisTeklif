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
  const success  = searchParams.get("success")       // "true" | "false" | null
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "30")))

  const where: any = {}
  if (success === "true")  where.success = true
  if (success === "false") where.success = false
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { ip:    { contains: q } },
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
