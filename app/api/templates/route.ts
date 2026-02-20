import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get("brandId")
  const modelId = searchParams.get("modelId")
  const subModelId = searchParams.get("subModelId")

  if (!brandId) return NextResponse.json([])

  const where: any = { brandId }
  if (subModelId) where.subModelId = subModelId
  else if (modelId) where.modelId = modelId

  const templates = await prisma.maintenanceTemplate.findMany({
    where,
    include: {
      model: { select: { name: true } },
      subModel: { select: { name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ periodKm: "asc" }, { serviceType: "asc" }],
  })

  return NextResponse.json(templates)
}
