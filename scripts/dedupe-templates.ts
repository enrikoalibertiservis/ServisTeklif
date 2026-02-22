/**
 * Veritabanındaki mükerrer bakım şablonlarını SİLER (kalıcı).
 * Aynı araç + periyot için birden fazla kayıt varsa, kalem sayısı en fazla olan bırakılır,
 * diğerleri MaintenanceTemplate tablosundan DELETE edilir.
 *
 * Kullanım: npm run db:dedupe
 * (veya: npx tsx scripts/dedupe-templates.ts)
 */

import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
if (existsSync(resolve(process.cwd(), ".env"))) {
  const env = readFileSync(resolve(process.cwd(), ".env"), "utf8")
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
  }
}

import { prisma } from "../lib/prisma"

/** Aynı araç (marka + alt model veya model) ve aynı periyot = tekilleştirme grubu */
function key(t: { brandId: string; modelId: string | null; subModelId: string | null; periodKm: number | null; periodMonth: number | null; serviceType: string | null }) {
  const vehicle = t.subModelId ?? t.modelId ?? ""
  return [t.brandId, vehicle, t.periodKm ?? "", t.periodMonth ?? "", t.serviceType ?? ""].join("|")
}

async function main() {
  const templates = await prisma.maintenanceTemplate.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: [{ createdAt: "asc" }],
  })

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

  if (toDelete.length === 0) {
    console.log("Mükerrer şablon bulunamadı.")
    return
  }

  // Önce kalemleri sil (cascade zaten siliyor ama açık olması için), sonra şablonları sil
  const deleted = await prisma.maintenanceTemplate.deleteMany({
    where: { id: { in: toDelete } },
  })
  console.log(`${deleted.count} mükerrer şablon silindi. Toplam ${toDelete.length} id işlendi.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
