"use server"

import { prisma } from "@/lib/prisma"

export async function getBrands() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } })
}

export async function getModelsByBrand(brandId: string) {
  return prisma.vehicleModel.findMany({
    where: { brandId },
    orderBy: { name: "asc" },
  })
}

export async function getSubModelsByModel(modelId: string) {
  return prisma.subModel.findMany({
    where: { modelId },
    orderBy: { name: "asc" },
  })
}

export async function getSpecsBySubModel(subModelId: string) {
  return prisma.vehicleSpec.findMany({
    where: { subModelId },
    orderBy: { specKey: "asc" },
  })
}

export async function getMaintenancePeriods(brandId: string, modelId?: string, subModelId?: string) {
  const where: any = { brandId }

  if (subModelId) {
    where.subModelId = subModelId
  } else if (modelId) {
    where.modelId = modelId
  }

  const templates = await prisma.maintenanceTemplate.findMany({
    where,
    select: { id: true, periodKm: true, periodMonth: true, name: true, serviceType: true },
    orderBy: { periodKm: "asc" },
  })

  if (templates.length === 0 && (subModelId || modelId)) {
    const fallback = await prisma.maintenanceTemplate.findMany({
      where: { brandId, modelId: null, subModelId: null },
      select: { id: true, periodKm: true, periodMonth: true, name: true, serviceType: true },
      orderBy: { periodKm: "asc" },
    })
    return fallback
  }

  // periodKm bazında tekilleştir (servis tiplerini görmezden gel)
  const unique = new Map<number | null, typeof templates[0]>()
  for (const t of templates) {
    const key = t.periodKm ?? -1
    if (!unique.has(key)) {
      unique.set(key, t)
    }
  }
  return Array.from(unique.values())
}

export async function getServiceTypes(brandId: string, modelId?: string, subModelId?: string, periodKm?: number) {
  const where: any = { brandId, periodKm: periodKm ?? 0 }

  if (subModelId) {
    where.subModelId = subModelId
  } else if (modelId) {
    where.modelId = modelId
  }

  const templates = await prisma.maintenanceTemplate.findMany({
    where,
    select: { id: true, serviceType: true, name: true, periodKm: true, periodMonth: true },
    orderBy: { serviceType: "asc" },
  })

  // Tekilleştir (serviceType bazında) — AGIR gösterilmez
  const unique = new Map<string | null, typeof templates[0]>()
  for (const t of templates) {
    if (t.serviceType === "AGIR") continue
    if (!unique.has(t.serviceType)) {
      unique.set(t.serviceType, t)
    }
  }
  return Array.from(unique.values())
}

export async function getTemplatePeriod(templateId: string): Promise<number | null> {
  const t = await prisma.maintenanceTemplate.findUnique({
    where: { id: templateId },
    select: { periodKm: true },
  })
  return t?.periodKm ?? null
}

// Admin operations
export async function createBrand(name: string) {
  return prisma.brand.create({ data: { name } })
}

export async function deleteBrand(id: string) {
  return prisma.brand.delete({ where: { id } })
}

export async function updateBrand(id: string, name: string) {
  return prisma.brand.update({ where: { id }, data: { name } })
}

export async function createModel(brandId: string, name: string) {
  return prisma.vehicleModel.create({ data: { brandId, name } })
}

export async function deleteModel(id: string) {
  return prisma.vehicleModel.delete({ where: { id } })
}

export async function updateModel(id: string, name: string) {
  return prisma.vehicleModel.update({ where: { id }, data: { name } })
}

export async function createSubModel(modelId: string, name: string) {
  return prisma.subModel.create({ data: { modelId, name } })
}

export async function deleteSubModel(id: string) {
  return prisma.subModel.delete({ where: { id } })
}

export async function updateSubModel(id: string, name: string) {
  return prisma.subModel.update({ where: { id }, data: { name } })
}

export async function upsertSpec(subModelId: string, specKey: string, specValue: string) {
  return prisma.vehicleSpec.upsert({
    where: { subModelId_specKey: { subModelId, specKey } },
    update: { specValue },
    create: { subModelId, specKey, specValue },
  })
}

export async function deleteSpec(id: string) {
  return prisma.vehicleSpec.delete({ where: { id } })
}
