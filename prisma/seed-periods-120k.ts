import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // ─── 1) Eski genel şablonları sil (subModelId=null, ilk seed'den kalanlar) ───
  const oldTemplates = await prisma.maintenanceTemplate.findMany({
    where: { subModelId: null },
    include: { items: true },
  })
  for (const t of oldTemplates) {
    await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: t.id } })
    await prisma.maintenanceTemplate.delete({ where: { id: t.id } })
  }
  console.log(`${oldTemplates.length} eski genel şablon silindi.\n`)

  // ─── 2) Mevcut araç bazlı şablonları al (yeni oluşturulanlar) ────────────────
  const baseTemplates = await prisma.maintenanceTemplate.findMany({
    include: {
      brand: { select: { name: true } },
      model: { select: { name: true } },
      subModel: { select: { name: true } },
    },
  })

  console.log(`${baseTemplates.length} araç bazlı temel şablon bulundu.`)
  console.log("120.000 km'ye kadar periyot katları oluşturuluyor...\n")

  let created = 0
  let skipped = 0

  for (const base of baseTemplates) {
    if (!base.periodKm || !base.periodMonth) continue

    const baseKm = base.periodKm
    const baseMonth = base.periodMonth
    const maxKm = 120000

    // Temel periyodun katlarını oluştur: 2x, 3x, 4x... 120k'ya kadar
    for (let multiplier = 2; multiplier * baseKm <= maxKm; multiplier++) {
      const km = multiplier * baseKm
      const month = multiplier * baseMonth

      // Zaten var mı kontrol et
      const exists = await prisma.maintenanceTemplate.findFirst({
        where: {
          brandId: base.brandId,
          modelId: base.modelId,
          subModelId: base.subModelId,
          periodKm: km,
        },
      })

      if (exists) {
        skipped++
        continue
      }

      await prisma.maintenanceTemplate.create({
        data: {
          brandId: base.brandId,
          modelId: base.modelId,
          subModelId: base.subModelId,
          periodKm: km,
          periodMonth: month,
          name: `${(km / 1000).toFixed(0)}.000 km / ${month} ay Periyodik Bakım`,
        },
      })
      created++
    }
  }

  console.log(`\n════════════════════════════════════════════`)
  console.log(`  SONUÇ`)
  console.log(`════════════════════════════════════════════`)
  console.log(`  Yeni periyot oluşturulan: ${created}`)
  console.log(`  Zaten mevcut (atlandı):   ${skipped}`)
  console.log(`════════════════════════════════════════════\n`)

  // Özet: her araç için kaç periyot var
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } })

  for (const brand of brands) {
    const templates = await prisma.maintenanceTemplate.findMany({
      where: { brandId: brand.id },
      include: {
        model: { select: { name: true } },
        subModel: { select: { name: true } },
      },
      orderBy: [
        { model: { name: "asc" } },
        { subModel: { name: "asc" } },
        { periodKm: "asc" },
      ],
    })

    if (templates.length === 0) continue

    // Group by model+submodel
    const grouped = new Map<string, typeof templates>()
    for (const t of templates) {
      const key = `${t.model?.name || "?"} ${t.subModel?.name || "Genel"}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(t)
    }

    console.log(`\n${brand.name}:`)
    console.log("─".repeat(70))
    for (const [vehicle, tpls] of Array.from(grouped.entries())) {
      const periods = tpls.map(t => `${(t.periodKm! / 1000).toFixed(0)}K`).join(", ")
      console.log(`  ${vehicle} → ${periods}`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
