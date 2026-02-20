import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  HIZLI SERVİS PERİYODU EKLEME (TÜM MODELLER)")
  console.log("═══════════════════════════════════════════════════════\n")

  // Tüm alt modelleri al (brand bilgisiyle birlikte)
  const subModels = await prisma.subModel.findMany({
    include: {
      model: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  })

  let created = 0
  let skipped = 0

  for (const sm of subModels) {
    const brandId = sm.model.brand.id
    const modelId = sm.model.id
    const subModelId = sm.id

    // "Hızlı Servis" şablonu zaten var mı?
    const existing = await prisma.maintenanceTemplate.findFirst({
      where: {
        brandId,
        modelId,
        subModelId,
        periodKm: 0,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.maintenanceTemplate.create({
      data: {
        brandId,
        modelId,
        subModelId,
        periodKm: 0,
        periodMonth: 0,
        name: "Hızlı Servis",
      },
    })
    created++
    console.log(`  + ${sm.model.brand.name} ${sm.model.name} ${sm.name} → Hızlı Servis`)
  }

  console.log("\n═══════════════════════════════════════════════════════")
  console.log(`  Eklenen: ${created}  |  Zaten mevcut: ${skipped}`)
  console.log("═══════════════════════════════════════════════════════\n")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
