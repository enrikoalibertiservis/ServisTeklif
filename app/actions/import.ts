"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { toUpperTR } from "@/lib/utils"

interface ImportResult {
  added: number
  updated: number
  errors: number
  errorDetails: string[]
}

export async function importParts(
  brandName: string,
  rows: Array<{ partNo: string; name: string; unitPrice: number }>
): Promise<ImportResult> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const brand = await prisma.brand.findUnique({ where: { name: brandName } })
  if (!brand) throw new Error(`Marka bulunamadı: ${brandName}`)

  const result: ImportResult = { added: 0, updated: 0, errors: 0, errorDetails: [] }

  const validRows: Array<{ idx: number; partNo: string; name: string; unitPrice: number }> = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.partNo?.trim()) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: Parça numarası boş`)
      continue
    }
    if (typeof row.unitPrice !== "number" || isNaN(row.unitPrice)) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: Fiyat geçersiz (${row.unitPrice})`)
      continue
    }
    validRows.push({ idx: i, partNo: row.partNo.trim(), name: toUpperTR(row.name?.trim() || "İSİMSİZ PARÇA"), unitPrice: row.unitPrice })
  }

  const BATCH = 200
  for (let b = 0; b < validRows.length; b += BATCH) {
    const batch = validRows.slice(b, b + BATCH)
    const partNos = batch.map(r => r.partNo)

    const existingParts = await prisma.part.findMany({
      where: { brandId: brand.id, partNo: { in: partNos } },
      select: { id: true, partNo: true, name: true },
    })
    const existingMap = new Map(existingParts.map(p => [p.partNo, p]))

    const toCreate: Array<{ brandId: string; partNo: string; name: string; unitPrice: number }> = []
    const updateOps: Array<ReturnType<typeof prisma.part.update>> = []

    for (const row of batch) {
      const ex = existingMap.get(row.partNo)
      if (ex) {
        updateOps.push(
          prisma.part.update({
            where: { id: ex.id },
            data: { name: toUpperTR(row.name || ex.name), unitPrice: row.unitPrice, validFrom: new Date() },
          })
        )
        result.updated++
      } else {
        toCreate.push({ brandId: brand.id, partNo: row.partNo, name: row.name, unitPrice: row.unitPrice })
        result.added++
      }
    }

    await prisma.$transaction([
      ...(toCreate.length > 0 ? [prisma.part.createMany({ data: toCreate, skipDuplicates: true })] : []),
      ...updateOps,
    ])
  }

  await prisma.priceListVersion.create({
    data: {
      type: "PART",
      brandName,
      fileName: "excel-import",
      recordCount: rows.length,
      added: result.added,
      updated: result.updated,
      errors: result.errors,
      errorDetails: result.errorDetails.length > 0 ? JSON.stringify(result.errorDetails) : null,
      uploadedById: session.user.id,
    },
  })

  return result
}

export async function importLabor(
  brandName: string,
  rows: Array<{ operationCode: string; name: string; durationHours: number; hourlyRate: number; totalPrice?: number }>
): Promise<ImportResult> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const brand = await prisma.brand.findUnique({ where: { name: brandName } })
  if (!brand) throw new Error(`Marka bulunamadı: ${brandName}`)

  const result: ImportResult = { added: 0, updated: 0, errors: 0, errorDetails: [] }

  const validRows: Array<{ idx: number; operationCode: string; name: string; durationHours: number; hourlyRate: number; totalPrice?: number }> = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.operationCode?.trim()) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: Operasyon kodu boş`)
      continue
    }
    if (typeof row.durationHours !== "number" || isNaN(row.durationHours)) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: Süre geçersiz`)
      continue
    }
    validRows.push({
      idx: i,
      operationCode: row.operationCode.trim(),
      name: toUpperTR(row.name?.trim() || "İSİMSİZ OPERASYON"),
      durationHours: row.durationHours,
      hourlyRate: row.hourlyRate,
      totalPrice: row.totalPrice,
    })
  }

  const BATCH = 200
  for (let b = 0; b < validRows.length; b += BATCH) {
    const batch = validRows.slice(b, b + BATCH)
    const codes = batch.map(r => r.operationCode)

    const existingOps = await prisma.laborOperation.findMany({
      where: { brandId: brand.id, operationCode: { in: codes } },
      select: { id: true, operationCode: true, name: true },
    })
    const existingMap = new Map(existingOps.map(o => [o.operationCode, o]))

    const toCreate: Array<{ brandId: string; operationCode: string; name: string; durationHours: number; hourlyRate: number; totalPrice: number | null }> = []
    const updateOps: Array<ReturnType<typeof prisma.laborOperation.update>> = []

    for (const row of batch) {
      const ex = existingMap.get(row.operationCode)
      if (ex) {
        updateOps.push(
          prisma.laborOperation.update({
            where: { id: ex.id },
            data: {
              name: toUpperTR(row.name || ex.name),
              durationHours: row.durationHours,
              hourlyRate: row.hourlyRate,
              totalPrice: row.totalPrice ?? null,
              validFrom: new Date(),
            },
          })
        )
        result.updated++
      } else {
        toCreate.push({
          brandId: brand.id,
          operationCode: row.operationCode,
          name: row.name,
          durationHours: row.durationHours,
          hourlyRate: row.hourlyRate,
          totalPrice: row.totalPrice ?? null,
        })
        result.added++
      }
    }

    await prisma.$transaction([
      ...(toCreate.length > 0 ? [prisma.laborOperation.createMany({ data: toCreate, skipDuplicates: true })] : []),
      ...updateOps,
    ])
  }

  await prisma.priceListVersion.create({
    data: {
      type: "LABOR",
      brandName,
      fileName: "excel-import",
      recordCount: rows.length,
      added: result.added,
      updated: result.updated,
      errors: result.errors,
      errorDetails: result.errorDetails.length > 0 ? JSON.stringify(result.errorDetails) : null,
      uploadedById: session.user.id,
    },
  })

  return result
}

export async function importTemplates(
  brandName: string,
  rows: Array<{
    periodKm?: number
    periodMonth?: number
    name?: string
    modelName?: string
    subModelName?: string
    itemType: string
    referenceCode: string
    quantity?: number
    durationOverride?: number
  }>
): Promise<ImportResult> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const brand = await prisma.brand.findUnique({ where: { name: brandName } })
  if (!brand) throw new Error(`Marka bulunamadı: ${brandName}`)

  const result: ImportResult = { added: 0, updated: 0, errors: 0, errorDetails: [] }

  const grouped = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = `${row.periodKm}-${row.modelName || ""}-${row.subModelName || ""}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const allModels = await prisma.vehicleModel.findMany({
    where: { brandId: brand.id },
    select: { id: true, name: true },
  })
  const modelMap = new Map(allModels.map(m => [m.name, m.id]))

  const allSubModels = await prisma.subModel.findMany({
    where: { model: { brandId: brand.id } },
    select: { id: true, name: true, modelId: true },
  })
  const subModelMap = new Map(allSubModels.map(s => [`${s.modelId}:${s.name}`, s.id]))

  for (const [, items] of Array.from(grouped.entries())) {
    try {
      const first = items[0]

      let modelId: string | null = null
      let subModelId: string | null = null

      if (first.modelName) {
        modelId = modelMap.get(first.modelName) ?? null
        if (modelId && first.subModelName) {
          subModelId = subModelMap.get(`${modelId}:${first.subModelName}`) ?? null
        }
      }

      const existing = await prisma.maintenanceTemplate.findFirst({
        where: {
          brandId: brand.id,
          periodKm: first.periodKm ?? null,
          ...(subModelId ? { subModelId } : modelId ? { modelId } : {}),
        },
      })

      const itemData = items.map((item, idx) => ({
        itemType: item.itemType,
        referenceCode: item.referenceCode,
        quantity: item.quantity ?? 1,
        durationOverride: item.durationOverride ?? null,
        sortOrder: idx + 1,
      }))

      if (existing) {
        await prisma.$transaction([
          prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: existing.id } }),
          ...itemData.map(d => prisma.maintenanceTemplateItem.create({ data: { ...d, templateId: existing.id } })),
        ])
        result.updated++
      } else {
        await prisma.maintenanceTemplate.create({
          data: {
            brandId: brand.id,
            modelId,
            subModelId,
            periodKm: first.periodKm ?? null,
            periodMonth: first.periodMonth ?? null,
            name: first.name ?? `${first.periodKm ? first.periodKm + " km" : ""} Bakım`,
            items: { create: itemData },
          },
        })
        result.added++
      }
    } catch (err: any) {
      result.errors++
      result.errorDetails.push(err.message)
    }
  }

  return result
}

export async function getImportHistory() {
  return prisma.priceListVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { uploadedBy: { select: { name: true } } },
  })
}
