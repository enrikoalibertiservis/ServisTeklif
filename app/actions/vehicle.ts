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
  const select = { id: true, periodKm: true, periodMonth: true, name: true, serviceType: true } as const
  const order  = { periodKm: "asc" } as const

  // Kademeli arama: subModel → model (herhangi subModel) → brand
  let candidates: any[] = []

  if (subModelId) {
    candidates = await prisma.maintenanceTemplate.findMany({ where: { brandId, subModelId }, select, orderBy: order })
  }

  if (!candidates.length && modelId) {
    // subModelId kısıtı olmadan: model'e ait TÜM şablonlar (null veya başka bir subModel)
    candidates = await prisma.maintenanceTemplate.findMany({ where: { brandId, modelId }, select, orderBy: order })
  }

  if (!candidates.length) {
    candidates = await prisma.maintenanceTemplate.findMany({ where: { brandId, modelId: null, subModelId: null }, select, orderBy: order })
  }

  // periodKm bazında tekilleştir
  const unique = new Map<number, typeof candidates[0]>()
  for (const t of candidates) {
    const key = t.periodKm ?? -1
    if (!unique.has(key)) unique.set(key, t)
  }
  return Array.from(unique.values())
}

export async function getServiceTypes(brandId: string, modelId?: string, subModelId?: string, periodKm?: number) {
  const km     = periodKm ?? 0
  const select = { id: true, serviceType: true, name: true, periodKm: true, periodMonth: true } as const
  const order  = { serviceType: "asc" } as const

  // Kademeli arama: subModel → model → brand (getMaintenancePeriods ile aynı mantık)
  let templates: any[] = []

  if (subModelId) {
    templates = await prisma.maintenanceTemplate.findMany({ where: { brandId, subModelId, periodKm: km }, select, orderBy: order })
  }

  if (!templates.length && modelId) {
    // subModelId kısıtı olmadan: model'e ait TÜM periodKm eşleşmeleri
    templates = await prisma.maintenanceTemplate.findMany({ where: { brandId, modelId, periodKm: km }, select, orderBy: order })
  }

  if (!templates.length) {
    templates = await prisma.maintenanceTemplate.findMany({ where: { brandId, modelId: null, subModelId: null, periodKm: km }, select, orderBy: order })
  }

  // Tekilleştir — AGIR gösterilmez
  const unique = new Map<string | null, typeof templates[0]>()
  for (const t of templates) {
    if (t.serviceType === "AGIR") continue
    if (!unique.has(t.serviceType)) unique.set(t.serviceType, t)
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
