"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
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

      const existing = await prisma.part.findUnique({
        where: { brandId_partNo: { brandId: brand.id, partNo: row.partNo.trim() } },
      })

      if (existing) {
        await prisma.part.update({
          where: { id: existing.id },
          data: { name: row.name?.trim() || existing.name, unitPrice: row.unitPrice, validFrom: new Date() },
        })
        result.updated++
      } else {
        await prisma.part.create({
          data: {
            brandId: brand.id,
            partNo: row.partNo.trim(),
            name: row.name?.trim() || "İsimsiz Parça",
            unitPrice: row.unitPrice,
          },
        })
        result.added++
      }
    } catch (err: any) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: ${err.message}`)
    }
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
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

      const existing = await prisma.laborOperation.findUnique({
        where: { brandId_operationCode: { brandId: brand.id, operationCode: row.operationCode.trim() } },
      })

      if (existing) {
        await prisma.laborOperation.update({
          where: { id: existing.id },
          data: {
            name: row.name?.trim() || existing.name,
            durationHours: row.durationHours,
            hourlyRate: row.hourlyRate,
            totalPrice: row.totalPrice ?? null,
            validFrom: new Date(),
          },
        })
        result.updated++
      } else {
        await prisma.laborOperation.create({
          data: {
            brandId: brand.id,
            operationCode: row.operationCode.trim(),
            name: row.name?.trim() || "İsimsiz Operasyon",
            durationHours: row.durationHours,
            hourlyRate: row.hourlyRate,
            totalPrice: row.totalPrice ?? null,
          },
        })
        result.added++
      }
    } catch (err: any) {
      result.errors++
      result.errorDetails.push(`Satır ${i + 2}: ${err.message}`)
    }
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

  for (const [, items] of Array.from(grouped.entries())) {
    try {
      const first = items[0]

      let modelId: string | null = null
      let subModelId: string | null = null

      if (first.modelName) {
        const model = await prisma.vehicleModel.findFirst({
          where: { brandId: brand.id, name: first.modelName },
        })
        modelId = model?.id ?? null

        if (model && first.subModelName) {
          const subModel = await prisma.subModel.findFirst({
            where: { modelId: model.id, name: first.subModelName },
          })
          subModelId = subModel?.id ?? null
        }
      }

      // Try to find existing template
      const existing = await prisma.maintenanceTemplate.findFirst({
        where: {
          brandId: brand.id,
          periodKm: first.periodKm ?? null,
          ...(subModelId ? { subModelId } : modelId ? { modelId } : {}),
        },
      })

      if (existing) {
        // Add items to existing template (clear old items first)
        await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: existing.id } })
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx]
          await prisma.maintenanceTemplateItem.create({
            data: {
              templateId: existing.id,
              itemType: item.itemType,
              referenceCode: item.referenceCode,
              quantity: item.quantity ?? 1,
              durationOverride: item.durationOverride ?? null,
              sortOrder: idx + 1,
            },
          })
        }
        result.updated++
      } else {
        // Create new template with items
        await prisma.maintenanceTemplate.create({
          data: {
            brandId: brand.id,
            modelId,
            subModelId,
            periodKm: first.periodKm ?? null,
            periodMonth: first.periodMonth ?? null,
            name: first.name ?? `${first.periodKm ? first.periodKm + " km" : ""} Bakım`,
            items: {
              create: items.map((item, idx) => ({
                itemType: item.itemType,
                referenceCode: item.referenceCode,
                quantity: item.quantity ?? 1,
                durationOverride: item.durationOverride ?? null,
                sortOrder: idx + 1,
              })),
            },
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
