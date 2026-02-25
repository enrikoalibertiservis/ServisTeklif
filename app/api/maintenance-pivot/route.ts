import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

const KDV = 0.20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({}, { status: 401 })

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get("brandId")
  const modelId = searchParams.get("modelId")

  if (!brandId) return NextResponse.json({ periods: [], rows: [] })

  const where: any = { brandId, isApproved: true }
  if (modelId && modelId !== "ALL") where.modelId = modelId

  const templates = await prisma.maintenanceTemplate.findMany({
    where,
    include: {
      items: true,
      subModel: { select: { id: true, name: true } },
      model:    { select: { id: true, name: true } },
    },
    orderBy: [{ periodKm: "asc" }, { periodMonth: "asc" }],
  })

  if (templates.length === 0) return NextResponse.json({ periods: [], rows: [] })

  // Tüm parça ve işçilik kodlarını topla
  const allPartCodes  = new Set<string>()
  const allLaborCodes = new Set<string>()
  for (const t of templates) {
    for (const item of t.items) {
      if (item.itemType === "PART")  allPartCodes.add(item.referenceCode)
      else                           allLaborCodes.add(item.referenceCode)
    }
  }

  const [parts, laborOps] = await Promise.all([
    allPartCodes.size > 0
      ? prisma.part.findMany({ where: { brandId, partNo: { in: Array.from(allPartCodes) } } })
      : [],
    allLaborCodes.size > 0
      ? prisma.laborOperation.findMany({ where: { brandId, operationCode: { in: Array.from(allLaborCodes) } } })
      : [],
  ])

  const partMap  = new Map(parts.map(p => [p.partNo, p]))
  const laborMap = new Map(laborOps.map(l => [l.operationCode, l]))

  // Her şablon için grand total hesapla
  function calcTotal(template: typeof templates[0]): number {
    let total = 0
    for (const item of template.items) {
      if (item.itemType === "PART") {
        const p = partMap.get(item.referenceCode)
        total += (p?.unitPrice ?? 0) * item.quantity
      } else {
        const l = laborMap.get(item.referenceCode)
        total += l?.totalPrice ?? (l ? l.durationHours * l.hourlyRate : 0)
      }
    }
    return total
  }

  // Benzersiz periyotları çıkar — sadece ay bilgisi OLMAYAN (saf km) periyotlar
  const periodSet = new Map<string, { km: number | null; month: number | null; label: string }>()
  for (const t of templates) {
    if (t.periodMonth) continue  // ay bilgisi olan periyotları gizle
    const key = `${t.periodKm ?? ""}_`
    if (!periodSet.has(key)) {
      const label = t.periodKm ? `${t.periodKm.toLocaleString("tr-TR")} km` : "—"
      periodSet.set(key, { km: t.periodKm, month: null, label })
    }
  }
  const periods = Array.from(periodSet.entries()).map(([key, val]) => ({ key, ...val }))

  // Satırlar: subModel bazlı grupla
  const rowMap = new Map<string, {
    subModelId: string
    subModelName: string
    modelName: string
    totals: Record<string, { grandTotal: number; withKdv: number } | null>
  }>()

  for (const t of templates) {
    if (t.periodMonth) continue  // ay bilgisi olan şablonları dahil etme
    const smId   = t.subModelId ?? t.modelId ?? "unknown"
    const smName = t.subModel?.name ?? t.model?.name ?? "—"
    const mName  = t.model?.name ?? "—"
    const pKey   = `${t.periodKm ?? ""}_`
    const grand  = calcTotal(t)

    if (!rowMap.has(smId)) {
      rowMap.set(smId, { subModelId: smId, subModelName: smName, modelName: mName, totals: {} })
    }
    const row = rowMap.get(smId)!
    // Aynı submodel+period için birden fazla şablon varsa topla
    if (row.totals[pKey]) {
      row.totals[pKey]!.grandTotal += grand
      row.totals[pKey]!.withKdv    = row.totals[pKey]!.grandTotal * (1 + KDV)
    } else {
      row.totals[pKey] = { grandTotal: grand, withKdv: grand * (1 + KDV) }
    }
  }

  const rows = Array.from(rowMap.values())
    .sort((a, b) => a.modelName.localeCompare(b.modelName, "tr") || a.subModelName.localeCompare(b.subModelName, "tr"))

  return NextResponse.json({ periods, rows })
}
