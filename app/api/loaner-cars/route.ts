import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const LOANER_OPERATORS = ["serdar güler", "handan özçetin", "özgür zavalsız"]

function canOperate(name: string) {
  return LOANER_OPERATORS.includes(name.toLowerCase())
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const cars = await prisma.loanerCar.findMany({
    where: { isActive: true },
    include: {
      loans: {
        where: { isReturned: false },
        orderBy: { deliveryDate: "desc" },
        take: 1,
      },
    },
    orderBy: { plate: "asc" },
  })

  return NextResponse.json({ cars })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const body = await req.json()
  const {
    plate, usagePurpose, taxNo, registrationDate, inspectionDate,
    trafficInsDate, kaskoDate, brand, modelYear, specs,
    registrationNo, engineNo, chassisNo,
  } = body

  if (!plate || !taxNo || !registrationDate || !inspectionDate || !trafficInsDate ||
      !kaskoDate || !brand || !modelYear || !registrationNo || !engineNo || !chassisNo)
    return NextResponse.json({ error: "Tüm zorunlu alanlar doldurulmalıdır." }, { status: 400 })

  const car = await prisma.loanerCar.create({
    data: {
      plate: plate.toUpperCase().trim(),
      usagePurpose: usagePurpose || "YEDEK ARAÇ/İKAME",
      taxNo,
      registrationDate: new Date(registrationDate),
      inspectionDate: new Date(inspectionDate),
      trafficInsDate: new Date(trafficInsDate),
      kaskoDate: new Date(kaskoDate),
      brand: brand.toUpperCase().trim(),
      modelYear: parseInt(modelYear),
      specs: specs?.trim() || null,
      registrationNo,
      engineNo,
      chassisNo,
    },
  })

  return NextResponse.json({ car }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

  const updateData: Record<string, unknown> = {}
  if (data.plate)            updateData.plate = data.plate.toUpperCase().trim()
  if (data.usagePurpose)     updateData.usagePurpose = data.usagePurpose
  if (data.taxNo)            updateData.taxNo = data.taxNo
  if (data.registrationDate) updateData.registrationDate = new Date(data.registrationDate)
  if (data.inspectionDate)   updateData.inspectionDate = new Date(data.inspectionDate)
  if (data.trafficInsDate)   updateData.trafficInsDate = new Date(data.trafficInsDate)
  if (data.kaskoDate)        updateData.kaskoDate = new Date(data.kaskoDate)
  if (data.brand)            updateData.brand = data.brand.toUpperCase().trim()
  if (data.modelYear)        updateData.modelYear = parseInt(data.modelYear)
  if (data.specs !== undefined) updateData.specs = data.specs?.trim() || null
  if (data.registrationNo)   updateData.registrationNo = data.registrationNo
  if (data.engineNo)         updateData.engineNo = data.engineNo
  if (data.chassisNo)        updateData.chassisNo = data.chassisNo
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  const car = await prisma.loanerCar.update({ where: { id }, data: updateData })
  return NextResponse.json({ car })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

  // Soft delete
  await prisma.loanerCar.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
