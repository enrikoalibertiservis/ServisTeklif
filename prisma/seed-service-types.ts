import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const FIAT_LABOR_RATES = {
  AGIR:   { code: "ISCILIK-AGIR-1SAAT",   name: "Ağır Bakım İşçilik (1 saat)",   hourlyRate: 11750.00 },
  NORMAL: { code: "ISCILIK-NORMAL-1SAAT", name: "Normal Bakım İşçilik (1 saat)", hourlyRate: 5125.00 },
  HIZLI:  { code: "ISCILIK-HIZLI-1SAAT",  name: "Hızlı Servis İşçilik (1 saat)", hourlyRate: 1841.67 },
}

async function main() {
  console.log("═══════════════════════════════════════════════════════")
  console.log("  SERVİS TİPLERİ + İŞÇİLİK DÖNÜŞÜMÜ")
  console.log("═══════════════════════════════════════════════════════\n")

  const fiat = await prisma.brand.findUnique({ where: { name: "Fiat" } })
  if (!fiat) throw new Error("Fiat markası bulunamadı!")

  // ─── 1) Fiat işçiliklerini sil, 3 yeni ekle ───────────────────
  console.log("1) Fiat işçilikleri güncelleniyor...\n")

  const deletedLabor = await prisma.laborOperation.deleteMany({ where: { brandId: fiat.id } })
  console.log(`   ${deletedLabor.count} eski işçilik silindi.`)

  for (const [type, def] of Object.entries(FIAT_LABOR_RATES)) {
    await prisma.laborOperation.create({
      data: {
        brandId: fiat.id,
        operationCode: def.code,
        name: def.name,
        durationHours: 1,
        hourlyRate: def.hourlyRate,
        totalPrice: def.hourlyRate,
      },
    })
    console.log(`   + ${def.name} → ${def.hourlyRate.toLocaleString("tr-TR")} TL/saat`)
  }

  // ─── 2) Mevcut Fiat şablonlarını Ağır/Normal/Hızlı yapısına dönüştür ──
  console.log("\n2) Fiat şablonları servis tiplerine dönüştürülüyor...\n")

  const existingTemplates = await prisma.maintenanceTemplate.findMany({
    where: { brandId: fiat.id },
    include: { items: true },
  })

  let created = 0
  let updated = 0
  let deleted = 0

  for (const tpl of existingTemplates) {
    if (tpl.periodKm === 0) {
      // Hızlı Servis → serviceType = "HIZLI"
      await prisma.maintenanceTemplate.update({
        where: { id: tpl.id },
        data: { serviceType: "HIZLI", name: "Hızlı Servis" },
      })
      updated++
      continue
    }

    // Normal periyodik bakım → Ağır + Normal versiyonları oluştur
    // Mevcut şablonun item'larını koru (varsa AGIR'a kopyala)

    // Mevcut şablonu AGIR yap
    await prisma.maintenanceTemplate.update({
      where: { id: tpl.id },
      data: {
        serviceType: "AGIR",
        name: `${(tpl.periodKm! / 1000).toFixed(0)}.000 km Ağır Bakım`,
      },
    })
    updated++

    // NORMAL versiyonunu oluştur (item'sız, sonra editörden doldurulacak)
    await prisma.maintenanceTemplate.create({
      data: {
        brandId: tpl.brandId,
        modelId: tpl.modelId,
        subModelId: tpl.subModelId,
        periodKm: tpl.periodKm,
        periodMonth: tpl.periodMonth,
        serviceType: "NORMAL",
        name: `${(tpl.periodKm! / 1000).toFixed(0)}.000 km Normal Bakım`,
      },
    })
    created++
  }

  // ─── 3) Özet ──────────────────────────────────────────────────
  const totalTemplates = await prisma.maintenanceTemplate.count({ where: { brandId: fiat.id } })

  const agirCount = await prisma.maintenanceTemplate.count({ where: { brandId: fiat.id, serviceType: "AGIR" } })
  const normalCount = await prisma.maintenanceTemplate.count({ where: { brandId: fiat.id, serviceType: "NORMAL" } })
  const hizliCount = await prisma.maintenanceTemplate.count({ where: { brandId: fiat.id, serviceType: "HIZLI" } })

  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  SONUÇ")
  console.log("═══════════════════════════════════════════════════════")
  console.log(`  Güncellenen:  ${updated}`)
  console.log(`  Oluşturulan:  ${created}`)
  console.log(`  ─────────────────────────────`)
  console.log(`  Toplam şablon:   ${totalTemplates}`)
  console.log(`    Ağır Bakım:    ${agirCount}`)
  console.log(`    Normal Bakım:  ${normalCount}`)
  console.log(`    Hızlı Servis:  ${hizliCount}`)
  console.log("═══════════════════════════════════════════════════════\n")

  // Araç bazlı özet
  const summary = await prisma.maintenanceTemplate.findMany({
    where: { brandId: fiat.id },
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

  const grouped = new Map<string, typeof summary>()
  for (const t of summary) {
    const key = `${t.model?.name || "?"} ${t.subModel?.name || "Genel"}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  for (const [vehicle, tpls] of Array.from(grouped.entries())) {
    const agir = tpls.filter(t => t.serviceType === "AGIR").length
    const normal = tpls.filter(t => t.serviceType === "NORMAL").length
    const hizli = tpls.filter(t => t.serviceType === "HIZLI").length
    console.log(`  ${vehicle} → Ağır: ${agir}, Normal: ${normal}, Hızlı: ${hizli}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
