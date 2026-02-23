import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const brandName    = searchParams.get("brand") || "Fiat"
  const modelName    = searchParams.get("model") || "Egea"
  const subModelName = searchParams.get("subModel") || ""

  const brand = await prisma.brand.findFirst({ where: { name: { contains: brandName } } })
  if (!brand) return NextResponse.json({ error: `Marka bulunamadı: ${brandName}` })

  const model = await prisma.vehicleModel.findFirst({
    where: { brandId: brand.id, name: { contains: modelName } }
  })

  const subModel = subModelName
    ? await prisma.subModel.findFirst({ where: { name: { contains: subModelName } } })
    : null

  // Şablonları çeşitli koşullarla ara
  const [
    bySubModel,
    byModel,
    byModelAny,
    byBrand,
  ] = await Promise.all([
    subModel
      ? prisma.maintenanceTemplate.findMany({
          where: { brandId: brand.id, subModelId: subModel.id },
          select: { id: true, name: true, periodKm: true, serviceType: true, subModelId: true, modelId: true },
          orderBy: { periodKm: "asc" },
        })
      : [],
    model
      ? prisma.maintenanceTemplate.findMany({
          where: { brandId: brand.id, modelId: model.id, subModelId: null },
          select: { id: true, name: true, periodKm: true, serviceType: true, subModelId: true, modelId: true },
          orderBy: { periodKm: "asc" },
        })
      : [],
    model
      ? prisma.maintenanceTemplate.findMany({
          where: { brandId: brand.id, modelId: model.id },
          select: { id: true, name: true, periodKm: true, serviceType: true, subModelId: true, modelId: true },
          orderBy: { periodKm: "asc" },
        })
      : [],
    prisma.maintenanceTemplate.findMany({
      where: { brandId: brand.id, modelId: null, subModelId: null },
      select: { id: true, name: true, periodKm: true, serviceType: true },
      orderBy: { periodKm: "asc" },
      take: 5,
    }),
  ])

  return NextResponse.json({
    brand:    { id: brand.id, name: brand.name },
    model:    model    ? { id: model.id,    name: model.name    } : null,
    subModel: subModel ? { id: subModel.id, name: subModel.name } : null,
    results: {
      bySubModel_count:  bySubModel.length,
      byModel_null_sub:  byModel.length,
      byModel_any_sub:   byModelAny.length,
      byBrand_fallback:  byBrand.length,
    },
    templates: {
      bySubModel,
      byModel_nullSubModel: byModel,
      byModel_anySubModel:  byModelAny,
      byBrand_fallback:     byBrand,
    }
  })
}
