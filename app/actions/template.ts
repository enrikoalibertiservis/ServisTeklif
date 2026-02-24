"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { toUpperTR } from "@/lib/utils"

export async function getTemplatesForVehicle(brandId: string, modelId?: string, subModelId?: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Yetkisiz")

  const where: any = { brandId }
  if (subModelId) {
    where.subModelId = subModelId
  } else if (modelId) {
    where.modelId = modelId
  }

  const templates = await prisma.maintenanceTemplate.findMany({
    where,
    include: {
      model: { select: { name: true } },
      subModel: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ periodKm: "asc" }, { serviceType: "asc" }],
  })

  // Deduplicate by periodKm+serviceType when no subModel is selected
  if (!subModelId && modelId) {
    const unique = new Map<string, typeof templates[0]>()
    for (const t of templates) {
      const key = `${t.periodKm ?? -1}_${t.serviceType ?? ""}`
      if (!unique.has(key)) {
        unique.set(key, t)
      }
    }
    return Array.from(unique.values())
  }

  return templates
}

export async function getTemplateDetails(templateId: string) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Yetkisiz")

  const template = await prisma.maintenanceTemplate.findUnique({
    where: { id: templateId },
    include: {
      brand: { select: { id: true, name: true } },
      model: { select: { id: true, name: true } },
      subModel: { select: { id: true, name: true } },
      items: { orderBy: { sortOrder: "asc" } },
    },
  })

  if (!template) throw new Error("Şablon bulunamadı")

  // Enrich items with part/labor details
  const enrichedItems = await Promise.all(
    template.items.map(async (item) => {
      if (item.itemType === "PART") {
        const part = await prisma.part.findFirst({
          where: { brandId: template.brandId, partNo: item.referenceCode },
          select: { name: true, unitPrice: true },
        })
        return { ...item, name: part?.name || item.referenceCode, unitPrice: part?.unitPrice || 0 }
      } else {
        const labor = await prisma.laborOperation.findFirst({
          where: { brandId: template.brandId, operationCode: item.referenceCode },
          select: { name: true, durationHours: true, hourlyRate: true, totalPrice: true },
        })
        return {
          ...item,
          name: labor?.name || item.referenceCode,
          unitPrice: labor?.totalPrice ?? ((labor?.durationHours || 0) * (labor?.hourlyRate || 0)),
          durationHours: labor?.durationHours,
          hourlyRate: labor?.hourlyRate,
        }
      }
    })
  )

  return { ...template, items: enrichedItems }
}

export async function addItemToTemplate(
  templateId: string,
  itemType: "PART" | "LABOR",
  referenceCode: string,
  quantity: number = 1
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const template = await prisma.maintenanceTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { sortOrder: "desc" }, take: 1 } },
  })
  if (!template) throw new Error("Şablon bulunamadı")

  const refUpper = toUpperTR(referenceCode)
  const existing = await prisma.maintenanceTemplateItem.findFirst({
    where: { templateId, itemType, referenceCode: refUpper },
  })
  if (existing) {
    return prisma.maintenanceTemplateItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    })
  }

  const maxSort = template.items[0]?.sortOrder ?? 0

  return prisma.maintenanceTemplateItem.create({
    data: {
      templateId,
      itemType,
      referenceCode: refUpper,
      quantity,
      sortOrder: maxSort + 1,
    },
  })
}

export async function removeItemFromTemplate(itemId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  return prisma.maintenanceTemplateItem.delete({ where: { id: itemId } })
}

export async function updateTemplateItemQuantity(itemId: string, quantity: number) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  if (quantity <= 0) throw new Error("Adet 0'dan büyük olmalı")

  return prisma.maintenanceTemplateItem.update({
    where: { id: itemId },
    data: { quantity },
  })
}

export async function copyTemplateItems(sourceTemplateId: string, targetTemplateIds: string[]) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const source = await prisma.maintenanceTemplate.findUnique({
    where: { id: sourceTemplateId },
    include: { items: true },
  })
  if (!source || source.items.length === 0) throw new Error("Kaynak şablonda kopyalanacak kalem yok")

  let copied = 0
  for (const targetId of targetTemplateIds) {
    if (targetId === sourceTemplateId) continue

    // Clear existing items in target
    await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: targetId } })

    // Copy source items to target
    for (const item of source.items) {
      await prisma.maintenanceTemplateItem.create({
        data: {
          templateId: targetId,
          itemType: item.itemType,
          referenceCode: item.referenceCode,
          quantity: item.quantity,
          durationOverride: item.durationOverride,
          sortOrder: item.sortOrder,
        },
      })
      copied++
    }
  }

  return { copied, targetCount: targetTemplateIds.length }
}

export async function clearTemplateItems(templateId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const result = await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId } })
  return result.count
}

export async function createTemplate(data: {
  brandId: string
  modelId?: string
  subModelId?: string
  periodKm?: number | null
  periodMonth?: number | null
  serviceType?: string | null
  name?: string | null
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  // Aynı kombinasyon zaten varsa engelle
  const existing = await prisma.maintenanceTemplate.findFirst({
    where: {
      brandId: data.brandId,
      modelId: data.modelId ?? null,
      subModelId: data.subModelId ?? null,
      periodKm: data.periodKm ?? null,
      serviceType: data.serviceType ?? null,
    },
  })
  if (existing) throw new Error("Bu periyod için zaten bir şablon mevcut.")

  return prisma.maintenanceTemplate.create({ data })
}

export async function deleteTemplate(templateId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId } })
  return prisma.maintenanceTemplate.delete({ where: { id: templateId } })
}

export async function approveTemplate(templateId: string, approve: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  return prisma.maintenanceTemplate.update({
    where: { id: templateId },
    data: {
      isApproved:   approve,
      approvedAt:   approve ? new Date() : null,
      approvedById: approve ? session.user.id : null,
    },
  })
}

/** Mükerrer bakım şablonlarını siler (aynı araç + periyot). Kalem sayısı en fazla olan bırakılır. */
export async function dedupeMaintenanceTemplates(): Promise<{ deleted: number }> {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  const templates = await prisma.maintenanceTemplate.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ createdAt: "asc" }],
  })

  function key(t: {
    brandId: string
    modelId: string | null
    subModelId: string | null
    periodKm: number | null
    periodMonth: number | null
    serviceType: string | null
  }) {
    const vehicle = t.subModelId ?? t.modelId ?? ""
    const serviceNorm = t.serviceType === "AGIR" ? "NORMAL" : (t.serviceType ?? "")
    return [t.brandId, vehicle, t.periodKm ?? "", t.periodMonth ?? "", serviceNorm].join("|")
  }

  const groups = new Map<string, typeof templates>()
  for (const t of templates) {
    const k = key(t)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(t)
  }

  const toDelete: string[] = []
  Array.from(groups.values()).forEach((list) => {
    if (list.length <= 1) return
    const keep = list.reduce((a, b) => (a._count.items >= b._count.items ? a : b))
    for (const t of list) {
      if (t.id !== keep.id) toDelete.push(t.id)
    }
  })

  if (toDelete.length === 0) return { deleted: 0 }

  await prisma.maintenanceTemplate.deleteMany({ where: { id: { in: toDelete } } })
  return { deleted: toDelete.length }
}
