import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const LOANER_OPERATORS  = ["serdar güler", "handan özçetin", "özgür zavalsız"]
const LOAN_EDITORS      = ["serdar güler"]

function normName(n: string) {
  return n.toLowerCase().trim().replace(/İ/g, "i").replace(/I/g, "ı")
}
function canOperate(name: string) {
  return LOANER_OPERATORS.some(op => normName(op) === normName(name))
}
function canEdit(name: string) {
  return LOAN_EDITORS.some(op => normName(op) === normName(name))
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const active = searchParams.get("active") === "true"

  const loans = await prisma.loanerCarLoan.findMany({
    where: active ? { isReturned: false } : undefined,
    include: {
      loanerCar: {
        select: { plate: true, brand: true, specs: true, modelYear: true },
      },
      createdByUser: { select: { name: true } },
    },
    orderBy: { deliveryDate: "desc" },
  })

  return NextResponse.json({ loans })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const body = await req.json()
  const {
    loanerCarId, advisorName, customerPlate, jobCardNo, jobCardDate,
    deliveryDate, deliveryKm, deliveryNotes, userName, registrationOwner,
  } = body

  if (!loanerCarId || !advisorName || !customerPlate || !jobCardNo || !jobCardDate ||
      !deliveryDate || !deliveryKm || !deliveryNotes || !userName || !registrationOwner)
    return NextResponse.json({ error: "Tüm alanlar zorunludur." }, { status: 400 })

  // Check if car is already on loan
  const existing = await prisma.loanerCarLoan.findFirst({
    where: { loanerCarId, isReturned: false },
  })
  if (existing)
    return NextResponse.json({ error: "Bu araç şu an başka müşteride." }, { status: 409 })

  const loan = await prisma.loanerCarLoan.create({
    data: {
      loanerCarId,
      createdById: session.user.id,
      advisorName: advisorName.trim(),
      customerPlate: customerPlate.toUpperCase().trim(),
      jobCardNo: jobCardNo.trim(),
      jobCardDate: new Date(jobCardDate),
      deliveryDate: new Date(deliveryDate),
      deliveryKm: parseInt(deliveryKm),
      deliveryNotes: deliveryNotes.trim(),
      userName: userName.trim(),
      registrationOwner: registrationOwner.trim(),
    },
    include: {
      loanerCar: { select: { plate: true, brand: true, specs: true } },
    },
  })

  return NextResponse.json({ loan }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canOperate(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const body = await req.json()
  const { id, action, returnDate, returnKm, ...rest } = body

  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

  // Dönüş işlemi
  if (action === "return" || returnDate) {
    if (!returnDate || !returnKm)
      return NextResponse.json({ error: "Dönüş tarihi ve km zorunludur." }, { status: 400 })
    const loan = await prisma.loanerCarLoan.update({
      where: { id },
      data: {
        returnDate: new Date(returnDate),
        returnKm: parseInt(returnKm),
        returnedAt: new Date(),
        isReturned: true,
      },
    })
    return NextResponse.json({ loan })
  }

  // Kayıt düzenleme — edit yetkisi kontrolü
  if (!canEdit(session.user.name ?? ""))
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 })

  const data: Record<string, unknown> = {}
  if (rest.advisorName)       data.advisorName       = rest.advisorName.trim()
  if (rest.customerPlate)     data.customerPlate     = rest.customerPlate.toUpperCase().trim()
  if (rest.jobCardNo)         data.jobCardNo         = rest.jobCardNo.trim()
  if (rest.jobCardDate)       data.jobCardDate       = new Date(rest.jobCardDate)
  if (rest.deliveryDate)      data.deliveryDate      = new Date(rest.deliveryDate)
  if (rest.deliveryKm)        data.deliveryKm        = parseInt(rest.deliveryKm)
  if (rest.deliveryNotes !== undefined) data.deliveryNotes = rest.deliveryNotes.trim()
  if (rest.userName)          data.userName          = rest.userName.trim()
  if (rest.registrationOwner) data.registrationOwner = rest.registrationOwner.trim()

  const loan = await prisma.loanerCarLoan.update({ where: { id }, data })
  return NextResponse.json({ loan })
}
