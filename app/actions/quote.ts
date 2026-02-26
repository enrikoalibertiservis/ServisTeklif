"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { generateQuoteNo, toUpperTR } from "@/lib/utils"

interface CreateQuoteInput {
  brandId: string
  modelId: string
  subModelId?: string
  templateId: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  plateNo?: string
}

export async function createQuoteFromTemplate(input: CreateQuoteInput) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Yetkisiz erişim")

  const [brand, model, subModel, template] = await Promise.all([
    prisma.brand.findUnique({ where: { id: input.brandId } }),
    prisma.vehicleModel.findUnique({ where: { id: input.modelId } }),
    input.subModelId ? prisma.subModel.findUnique({
      where: { id: input.subModelId },
      include: { specs: true },
    }) : null,
    prisma.maintenanceTemplate.findUnique({
      where: { id: input.templateId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ])

  if (!brand || !model || !template) throw new Error("Geçersiz seçim")

  const partCodes = template.items.filter(i => i.itemType === "PART").map(i => i.referenceCode)
  const laborCodes = template.items.filter(i => i.itemType === "LABOR").map(i => i.referenceCode)

  const [parts, laborOps] = await Promise.all([
    prisma.part.findMany({ where: { brandId: input.brandId, partNo: { in: partCodes } } }),
    prisma.laborOperation.findMany({ where: { brandId: input.brandId, operationCode: { in: laborCodes } } }),
  ])

  const partMap = new Map(parts.map(p => [p.partNo, p]))
  const laborMap = new Map(laborOps.map(l => [l.operationCode, l]))

  const quoteItems: {
    itemType: string
    referenceCode: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    durationHours: number | null
    hourlyRate: number | null
    sortOrder: number
  }[] = []

  let partsSubtotal = 0
  let laborSubtotal = 0

  for (const item of template.items) {
    if (item.itemType === "PART") {
      const part = partMap.get(item.referenceCode)
      if (!part) continue
      const qty = item.quantity
      const total = qty * part.unitPrice
      partsSubtotal += total
      quoteItems.push({
        itemType: "PART",
        referenceCode: part.partNo,
        name: part.name,
        quantity: qty,
        unitPrice: part.unitPrice,
        totalPrice: total,
        durationHours: null,
        hourlyRate: null,
        sortOrder: item.sortOrder,
      })
    } else {
      const labor = laborMap.get(item.referenceCode)
      if (!labor) continue
      const duration = item.durationOverride ?? labor.durationHours
      const total = labor.totalPrice ?? (duration * labor.hourlyRate)
      laborSubtotal += total
      quoteItems.push({
        itemType: "LABOR",
        referenceCode: labor.operationCode,
        name: labor.name,
        quantity: item.quantity,
        unitPrice: labor.totalPrice ?? labor.hourlyRate,
        totalPrice: total,
        durationHours: duration,
        hourlyRate: labor.hourlyRate,
        sortOrder: item.sortOrder,
      })
    }
  }

  const subtotal = partsSubtotal + laborSubtotal
  const defaultTaxRate = await prisma.appSetting.findUnique({ where: { key: "defaultTaxRate" } })
  const taxRate = defaultTaxRate ? parseFloat(defaultTaxRate.value) : 20
  const taxAmount = subtotal * (taxRate / 100)
  const grandTotal = subtotal + taxAmount

  const specsJson = subModel?.specs
    ? JSON.stringify(subModel.specs.reduce((acc, s) => ({ ...acc, [s.specKey]: s.specValue }), {}))
    : null

  const quote = await prisma.quote.create({
    data: {
      quoteNo: generateQuoteNo(),
      brandName: brand.name,
      modelName: model.name,
      subModelName: subModel?.name,
      vehicleSpecs: specsJson,
      periodKm: template.periodKm,
      periodMonth: template.periodMonth,
      serviceType: template.serviceType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      plateNo: input.plateNo,
      partsSubtotal,
      laborSubtotal,
      subtotal,
      taxRate,
      taxAmount,
      grandTotal,
      createdById: session.user.id,
      items: { create: quoteItems },
    },
  })

  return quote
}

export async function getQuote(id: string) {
  return prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true, email: true } },
    },
  })
}

export async function getQuotes(userId?: string) {
  return prisma.quote.findMany({
    where: userId ? { createdById: userId } : {},
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  })
}

export async function addQuoteItem(
  quoteId: string,
  item: {
    itemType: string
    referenceCode: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    durationHours?: number
    hourlyRate?: number
  }
) {
  const maxSort = await prisma.quoteItem.findFirst({
    where: { quoteId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const newItem = await prisma.quoteItem.create({
    data: {
      quoteId,
      ...item,
      referenceCode: toUpperTR(item.referenceCode),
      name: toUpperTR(item.name),
      discountPct: 0,
      discountAmount: 0,
      durationHours: item.durationHours ?? null,
      hourlyRate: item.hourlyRate ?? null,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  })

  await recalculateQuote(quoteId)
  return newItem
}

export async function removeQuoteItem(itemId: string, quoteId: string) {
  await prisma.quoteItem.delete({ where: { id: itemId } })
  await recalculateQuote(quoteId)
}

export async function updateQuoteItem(
  itemId: string,
  quoteId: string,
  data: { quantity?: number; unitPrice?: number; discountPct?: number; durationHours?: number }
) {
  const item = await prisma.quoteItem.findUnique({ where: { id: itemId } })
  if (!item) return

  const quantity      = data.quantity      ?? item.quantity
  const unitPrice     = data.unitPrice     ?? item.unitPrice
  const discountPct   = data.discountPct   !== undefined ? data.discountPct   : (item.discountPct   ?? 0)
  const durationHours = data.durationHours !== undefined ? data.durationHours : item.durationHours

  // Brüt fiyat: işçilikte süre × saat ücreti, parçada adet × birim fiyat
  const basePrice = item.itemType === "LABOR" && durationHours
    ? durationHours * (item.hourlyRate ?? unitPrice ?? 0)
    : quantity * unitPrice

  const discountAmount = basePrice * (discountPct / 100)
  const totalPrice     = basePrice - discountAmount

  await prisma.quoteItem.update({
    where: { id: itemId },
    data: { quantity, unitPrice, discountPct, discountAmount, totalPrice, durationHours },
  })

  await recalculateQuote(quoteId)
}

export async function updateQuoteDiscount(
  quoteId: string,
  discountType: string | null,
  discountValue: number
) {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) return

  let discountAmount = 0
  if (discountType === "PERCENT") {
    discountAmount = quote.subtotal * (discountValue / 100)
  } else if (discountType === "AMOUNT") {
    discountAmount = discountValue
  }

  const afterDiscount = quote.subtotal - discountAmount
  const taxAmount = afterDiscount * (quote.taxRate / 100)
  const grandTotal = afterDiscount + taxAmount

  await prisma.quote.update({
    where: { id: quoteId },
    data: { discountType, discountValue, discountAmount, taxAmount, grandTotal },
  })
}

export async function updateQuoteCustomer(
  quoteId: string,
  data: { customerName?: string; customerPhone?: string; customerEmail?: string; plateNo?: string; notes?: string }
) {
  await prisma.quote.update({ where: { id: quoteId }, data })
}

export async function finalizeQuote(quoteId: string) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: "FINALIZED" },
  })
}

/** CRM İndirimi: Parça kalemleri %10, İşçilik kalemleri %15 indirim uygular */
export async function applyCrmDiscount(quoteId: string) {
  return applyCustomDiscount(quoteId, 10, 15)
}

/** Özel indirim: verilen yüzdelerle tüm satırlara indirim uygular */
export async function applyCustomDiscount(quoteId: string, partsPct: number, laborPct: number) {
  const session = await getServerSession(authOptions)
  if (!session) throw new Error("Yetkisiz erişim")

  const items = await prisma.quoteItem.findMany({ where: { quoteId } })

  await prisma.$transaction(
    items.map(item => {
      const discountPct = item.itemType === "PART" ? partsPct : laborPct
      const basePrice =
        item.itemType === "LABOR" && item.durationHours
          ? item.durationHours * (item.hourlyRate ?? 0)
          : item.quantity * item.unitPrice
      const discountAmount = basePrice * (discountPct / 100)
      const totalPrice = basePrice - discountAmount
      return prisma.quoteItem.update({
        where: { id: item.id },
        data: { discountPct, discountAmount, totalPrice },
      })
    })
  )

  await recalculateQuote(quoteId)
}

async function recalculateQuote(quoteId: string) {
  const items = await prisma.quoteItem.findMany({ where: { quoteId } })
  const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
  if (!quote) return

  let partsSubtotal = 0
  let laborSubtotal = 0

  for (const item of items) {
    if (item.itemType === "PART") partsSubtotal += item.totalPrice
    else laborSubtotal += item.totalPrice
  }

  const subtotal = partsSubtotal + laborSubtotal

  let discountAmount = 0
  if (quote.discountType === "PERCENT") {
    discountAmount = subtotal * (quote.discountValue / 100)
  } else if (quote.discountType === "AMOUNT") {
    discountAmount = quote.discountValue
  }

  const afterDiscount = subtotal - discountAmount
  const taxAmount = afterDiscount * (quote.taxRate / 100)
  const grandTotal = afterDiscount + taxAmount

  await prisma.quote.update({
    where: { id: quoteId },
    data: { partsSubtotal, laborSubtotal, subtotal, discountAmount, taxAmount, grandTotal },
  })
}

export async function previewTemplatePrice(templateId: string, brandId: string) {
  const template = await prisma.maintenanceTemplate.findUnique({
    where: { id: templateId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  })
  if (!template) throw new Error("Şablon bulunamadı")

  const partCodes  = template.items.filter(i => i.itemType === "PART").map(i => i.referenceCode)
  const laborCodes = template.items.filter(i => i.itemType === "LABOR").map(i => i.referenceCode)

  const [parts, laborOps] = await Promise.all([
    prisma.part.findMany({ where: { brandId, partNo: { in: partCodes } } }),
    prisma.laborOperation.findMany({ where: { brandId, operationCode: { in: laborCodes } } }),
  ])

  const partMap  = new Map(parts.map(p => [p.partNo, p]))
  const laborMap = new Map(laborOps.map(l => [l.operationCode, l]))

  type PreviewItem = {
    itemType: string
    referenceCode: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    durationHours: number | null
  }

  const items: PreviewItem[] = []
  let partsSubtotal = 0
  let laborSubtotal = 0

  for (const item of template.items) {
    if (item.itemType === "PART") {
      const part = partMap.get(item.referenceCode)
      if (!part) continue
      const total = item.quantity * part.unitPrice
      partsSubtotal += total
      items.push({ itemType: "PART", referenceCode: part.partNo, name: part.name, quantity: item.quantity, unitPrice: part.unitPrice, totalPrice: total, durationHours: null })
    } else {
      const labor = laborMap.get(item.referenceCode)
      if (!labor) continue
      const duration = item.durationOverride ?? labor.durationHours
      const total = labor.totalPrice ?? (duration * labor.hourlyRate)
      laborSubtotal += total
      items.push({ itemType: "LABOR", referenceCode: labor.operationCode, name: labor.name, quantity: item.quantity, unitPrice: labor.totalPrice ?? labor.hourlyRate, totalPrice: total, durationHours: duration })
    }
  }

  const subtotal = partsSubtotal + laborSubtotal
  const setting = await prisma.appSetting.findUnique({ where: { key: "defaultTaxRate" } })
  const taxRate = setting ? parseFloat(setting.value) : 20
  const taxAmount = subtotal * (taxRate / 100)
  const grandTotal = subtotal + taxAmount

  return { items, partsSubtotal, laborSubtotal, subtotal, taxRate, taxAmount, grandTotal }
}

export async function searchParts(brandName: string, query: string) {
  if (!query || query.length < 2) return []

  return prisma.part.findMany({
    where: {
      brand: { name: brandName },
      OR: [
        { partNo: { contains: query } },
        { name: { contains: query } },
      ],
    },
    take: 20,
    orderBy: { partNo: "asc" },
  })
}

export async function searchLabor(brandName: string, query: string) {
  if (!query || query.length < 2) return []

  return prisma.laborOperation.findMany({
    where: {
      brand: { name: brandName },
      OR: [
        { operationCode: { contains: query } },
        { name: { contains: query } },
      ],
    },
    take: 20,
    orderBy: { operationCode: "asc" },
  })
}
