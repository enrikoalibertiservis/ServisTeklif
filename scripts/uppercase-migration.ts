/**
 * Mevcut Part, LaborOperation, QuoteItem ve MaintenanceTemplateItem
 * kayıtlarını Türkçe büyük harfe çevirir.
 *
 * Kullanım: npx tsx scripts/uppercase-migration.ts
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

function toUpperTR(str: string | null | undefined): string {
  if (!str || typeof str !== "string") return str ?? ""
  return str.toLocaleUpperCase("tr-TR")
}

async function main() {
  let parts = 0,
    labor = 0,
    quotes = 0,
    templates = 0

  // Part: name, partNo
  const allParts = await prisma.part.findMany({ select: { id: true, name: true, partNo: true } })
  for (const p of allParts) {
    const newName = toUpperTR(p.name)
    const newPartNo = toUpperTR(p.partNo)
    if (newName !== p.name || newPartNo !== p.partNo) {
      await prisma.part.update({
        where: { id: p.id },
        data: { name: newName, partNo: newPartNo },
      })
      parts++
    }
  }

  // LaborOperation: name, operationCode
  const allLabor = await prisma.laborOperation.findMany({
    select: { id: true, name: true, operationCode: true },
  })
  for (const l of allLabor) {
    const newName = toUpperTR(l.name)
    const newCode = toUpperTR(l.operationCode)
    if (newName !== l.name || newCode !== l.operationCode) {
      await prisma.laborOperation.update({
        where: { id: l.id },
        data: { name: newName, operationCode: newCode },
      })
      labor++
    }
  }

  // QuoteItem: name
  const allQuoteItems = await prisma.quoteItem.findMany({ select: { id: true, name: true } })
  for (const q of allQuoteItems) {
    const newName = toUpperTR(q.name)
    if (newName !== q.name) {
      await prisma.quoteItem.update({
        where: { id: q.id },
        data: { name: newName },
      })
      quotes++
    }
  }

  // MaintenanceTemplateItem: referenceCode
  const allTemplateItems = await prisma.maintenanceTemplateItem.findMany({
    select: { id: true, referenceCode: true },
  })
  for (const t of allTemplateItems) {
    const newRef = toUpperTR(t.referenceCode)
    if (newRef !== t.referenceCode) {
      await prisma.maintenanceTemplateItem.update({
        where: { id: t.id },
        data: { referenceCode: newRef },
      })
      templates++
    }
  }

  console.log(
    `Tamamlandı: ${parts} parça, ${labor} işçilik, ${quotes} teklif kalemi, ${templates} şablon kalemi güncellendi.`
  )
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
