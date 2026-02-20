import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MOCK_PART_NOS = [
  "55282942", "55223416", "77366607", "55234012", "71754237",
  "71754238", "71777467", "46796846", "9464026080", "71777821",
  "SELENIA01", "73502753", "51966278", "9464027680", "46761279",
]

const MOCK_LABOR_CODES = [
  "LBR-001", "LBR-002", "LBR-003", "LBR-004", "LBR-005", "LBR-006",
  "LBR-007", "LBR-008", "LBR-009", "LBR-010", "LBR-011", "LBR-012",
]

async function main() {
  console.log("Mock verileri siliniyor...\n")

  const deletedParts = await prisma.part.deleteMany({
    where: { partNo: { in: MOCK_PART_NOS } },
  })
  console.log(`  ${deletedParts.count} mock parça silindi`)

  const deletedLabor = await prisma.laborOperation.deleteMany({
    where: { operationCode: { in: MOCK_LABOR_CODES } },
  })
  console.log(`  ${deletedLabor.count} mock işçilik silindi`)

  // Orphan maintenance templates from seed (subModelId=null, modelId=null)
  const orphanTemplates = await prisma.maintenanceTemplate.findMany({
    where: { subModelId: null, modelId: null },
  })
  for (const t of orphanTemplates) {
    await prisma.maintenanceTemplateItem.deleteMany({ where: { templateId: t.id } })
    await prisma.maintenanceTemplate.delete({ where: { id: t.id } })
  }
  console.log(`  ${orphanTemplates.length} yetim şablon silindi`)

  // Orphan quotes (if any from testing)
  const quotes = await prisma.quote.findMany({ include: { items: true } })
  if (quotes.length > 0) {
    for (const q of quotes) {
      await prisma.quoteItem.deleteMany({ where: { quoteId: q.id } })
      await prisma.quote.delete({ where: { id: q.id } })
    }
    console.log(`  ${quotes.length} test teklifi silindi`)
  }

  console.log("\nTamamlandı.")

  // Kalan kayıtlar
  const partCount = await prisma.part.count()
  const laborCount = await prisma.laborOperation.count()
  console.log(`\nKalan: ${partCount} parça, ${laborCount} işçilik`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
