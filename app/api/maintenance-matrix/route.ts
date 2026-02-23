import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ periods: [], partRows: [], laborRows: [], periodTotals: [] }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const brandId    = searchParams.get("brandId")
  const modelId    = searchParams.get("modelId")
  const subModelId = searchParams.get("subModelId")

  if (!brandId) return NextResponse.json({ periods: [], partRows: [], laborRows: [], periodTotals: [] })

  const whereClause: any = { brandId }

  if (subModelId && subModelId !== "ALL") {
    whereClause.subModelId = subModelId
  } else if (modelId && modelId !== "ALL") {
    whereClause.modelId = modelId
  }

  const templates = await prisma.maintenanceTemplate.findMany({
    where: whereClause,
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { periodKm: "asc" },
  })

  if (templates.length === 0) {
    return NextResponse.json({ periods: [], partRows: [], laborRows: [], periodTotals: [] })
  }

  // Build periods
  const periods = templates.map((t) => ({
    km: t.periodKm,
    month: t.periodMonth,
    name: t.name || `${t.periodKm ? t.periodKm.toLocaleString() + " km" : ""} ${t.periodMonth ? t.periodMonth + " ay" : ""}`.trim(),
    templateId: t.id,
  }))

  // Collect all unique part codes and labor codes across all templates
  const allPartCodes = new Set<string>()
  const allLaborCodes = new Set<string>()

  for (const t of templates) {
    for (const item of t.items) {
      if (item.itemType === "PART") allPartCodes.add(item.referenceCode)
      else allLaborCodes.add(item.referenceCode)
    }
  }

  // Fetch part and labor details
  const [parts, laborOps] = await Promise.all([
    allPartCodes.size > 0
      ? prisma.part.findMany({
          where: { brandId, partNo: { in: Array.from(allPartCodes) } },
        })
      : [],
    allLaborCodes.size > 0
      ? prisma.laborOperation.findMany({
          where: { brandId, operationCode: { in: Array.from(allLaborCodes) } },
        })
      : [],
  ])

  const partMap = new Map(parts.map((p) => [p.partNo, p]))
  const laborMap = new Map(laborOps.map((l) => [l.operationCode, l]))

  // Build part rows
  const partRows = Array.from(allPartCodes).map((code) => {
    const part = partMap.get(code)
    const cells = templates.map((t) => {
      const item = t.items.find((i) => i.itemType === "PART" && i.referenceCode === code)
      return { included: !!item, quantity: item?.quantity ?? 0 }
    })
    return {
      referenceCode: code,
      name: part?.name ?? code,
      unitPrice: part?.unitPrice ?? 0,
      cells,
    }
  })

  // Build labor rows
  const laborRows = Array.from(allLaborCodes).map((code) => {
    const labor = laborMap.get(code)
    const totalPrice = labor?.totalPrice ?? (labor ? labor.durationHours * labor.hourlyRate : 0)
    const cells = templates.map((t) => {
      const item = t.items.find((i) => i.itemType === "LABOR" && i.referenceCode === code)
      return { included: !!item, quantity: item?.quantity ?? 0 }
    })
    return {
      referenceCode: code,
      name: labor?.name ?? code,
      totalPrice,
      durationHours: labor?.durationHours ?? 0,
      cells,
    }
  })

  // Calculate period totals
  const periodTotals = templates.map((_, periodIdx) => {
    let partsTotal = 0
    let laborTotal = 0

    for (const row of partRows) {
      if (row.cells[periodIdx].included) {
        partsTotal += row.unitPrice * row.cells[periodIdx].quantity
      }
    }
    for (const row of laborRows) {
      if (row.cells[periodIdx].included) {
        laborTotal += row.totalPrice
      }
    }

    return {
      partsTotal,
      laborTotal,
      grandTotal: partsTotal + laborTotal,
    }
  })

  return NextResponse.json({ periods, partRows, laborRows, periodTotals })
}
