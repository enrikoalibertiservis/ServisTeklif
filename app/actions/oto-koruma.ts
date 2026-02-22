"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type OtoKorumaProductData = {
  id: string
  name: string
  description: string | null
  price: number
  listPrice: number | null
  salesPoints: string | null
  category: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
}

export async function getOtoKorumaProducts(): Promise<OtoKorumaProductData[]> {
  return prisma.otoKorumaProduct.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function getActiveOtoKorumaProducts(): Promise<OtoKorumaProductData[]> {
  return prisma.otoKorumaProduct.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })
}

export async function createOtoKorumaProduct(data: {
  name: string
  description?: string
  price: number
  listPrice?: number
  salesPoints?: string
  category?: string
  sortOrder?: number
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  await prisma.otoKorumaProduct.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      listPrice: data.listPrice ?? null,
      salesPoints: data.salesPoints?.trim() || null,
      category: data.category?.trim() || null,
      sortOrder: data.sortOrder ?? 0,
      createdBy: session.user.name || session.user.email,
    },
  })
  revalidatePath("/dashboard/admin/oto-koruma")
}

export async function updateOtoKorumaProduct(id: string, data: {
  name: string
  description?: string
  price: number
  listPrice?: number
  salesPoints?: string
  category?: string
  isActive: boolean
  sortOrder: number
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  await prisma.otoKorumaProduct.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      listPrice: data.listPrice ?? null,
      salesPoints: data.salesPoints?.trim() || null,
      category: data.category?.trim() || null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  })
  revalidatePath("/dashboard/admin/oto-koruma")
}

export async function deleteOtoKorumaProduct(id: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  await prisma.otoKorumaProduct.delete({ where: { id } })
  revalidatePath("/dashboard/admin/oto-koruma")
}

export async function reorderOtoKorumaProducts(ids: string[]) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") throw new Error("Yetkisiz")

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.otoKorumaProduct.update({ where: { id }, data: { sortOrder: index } })
    )
  )
  revalidatePath("/dashboard/admin/oto-koruma")
}
