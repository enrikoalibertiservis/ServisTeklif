import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10)
  const admin = await prisma.user.upsert({
    where: { email: "admin@servis.com" },
    update: {},
    create: {
      email: "admin@servis.com",
      passwordHash: adminHash,
      name: "Sistem Yöneticisi",
      role: "ADMIN",
    },
  })

  // Create advisor user
  const advisorHash = await bcrypt.hash("advisor123", 10)
  const advisor = await prisma.user.upsert({
    where: { email: "danisman@servis.com" },
    update: {},
    create: {
      email: "danisman@servis.com",
      passwordHash: advisorHash,
      name: "Ahmet Danışman",
      role: "ADVISOR",
    },
  })

  // Create brands
  const fiat = await prisma.brand.upsert({
    where: { name: "Fiat" },
    update: {},
    create: { name: "Fiat" },
  })
  const alfa = await prisma.brand.upsert({
    where: { name: "Alfa Romeo" },
    update: {},
    create: { name: "Alfa Romeo" },
  })
  const jeep = await prisma.brand.upsert({
    where: { name: "Jeep" },
    update: {},
    create: { name: "Jeep" },
  })

  // Create Fiat models
  const egea = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: fiat.id, name: "Egea" } },
    update: {},
    create: { brandId: fiat.id, name: "Egea" },
  })
  const fiat500 = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: fiat.id, name: "500" } },
    update: {},
    create: { brandId: fiat.id, name: "500" },
  })
  const doblo = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: fiat.id, name: "Doblo" } },
    update: {},
    create: { brandId: fiat.id, name: "Doblo" },
  })

  // Create Alfa Romeo models
  const tonale = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: alfa.id, name: "Tonale" } },
    update: {},
    create: { brandId: alfa.id, name: "Tonale" },
  })
  const giulia = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: alfa.id, name: "Giulia" } },
    update: {},
    create: { brandId: alfa.id, name: "Giulia" },
  })

  // Create Jeep models
  const renegade = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: jeep.id, name: "Renegade" } },
    update: {},
    create: { brandId: jeep.id, name: "Renegade" },
  })
  const compass = await prisma.vehicleModel.upsert({
    where: { brandId_name: { brandId: jeep.id, name: "Compass" } },
    update: {},
    create: { brandId: jeep.id, name: "Compass" },
  })

  // Create sub-models for Egea
  const egeaSedan = await prisma.subModel.upsert({
    where: { modelId_name: { modelId: egea.id, name: "Sedan" } },
    update: {},
    create: { modelId: egea.id, name: "Sedan" },
  })
  const egeaHB = await prisma.subModel.upsert({
    where: { modelId_name: { modelId: egea.id, name: "Hatchback" } },
    update: {},
    create: { modelId: egea.id, name: "Hatchback" },
  })
  const egeaCross = await prisma.subModel.upsert({
    where: { modelId_name: { modelId: egea.id, name: "Cross" } },
    update: {},
    create: { modelId: egea.id, name: "Cross" },
  })

  // Add specs for Egea Sedan
  const sedanSpecs = [
    { specKey: "engineCode", specValue: "1.4 T-Jet" },
    { specKey: "fuelType", specValue: "Benzin" },
    { specKey: "transmission", specValue: "Manuel" },
    { specKey: "driveType", specValue: "FWD" },
  ]
  for (const spec of sedanSpecs) {
    await prisma.vehicleSpec.upsert({
      where: {
        subModelId_specKey: { subModelId: egeaSedan.id, specKey: spec.specKey },
      },
      update: { specValue: spec.specValue },
      create: { subModelId: egeaSedan.id, ...spec },
    })
  }

  // Sample parts for Fiat
  const sampleParts = [
    { partNo: "55282942", name: "Motor Yağı Filtresi", unitPrice: 185.0 },
    { partNo: "55223416", name: "Hava Filtresi", unitPrice: 320.0 },
    { partNo: "77366607", name: "Polen Filtresi", unitPrice: 275.0 },
    { partNo: "55234012", name: "Yakıt Filtresi", unitPrice: 410.0 },
    { partNo: "71754237", name: "Ön Fren Balatası Seti", unitPrice: 1250.0 },
    { partNo: "71754238", name: "Arka Fren Balatası Seti", unitPrice: 980.0 },
    { partNo: "71777467", name: "Fren Diski Ön (Çift)", unitPrice: 2100.0 },
    { partNo: "46796846", name: "Buji Seti (4 adet)", unitPrice: 560.0 },
    { partNo: "9464026080", name: "Triger Seti", unitPrice: 3200.0 },
    { partNo: "71777821", name: "V-Kayışı", unitPrice: 380.0 },
    { partNo: "SELENIA01", name: "Selenia K Pure Energy 5W-40 4LT", unitPrice: 1450.0 },
    { partNo: "73502753", name: "Silecek Lastiği Ön (Çift)", unitPrice: 290.0 },
    { partNo: "51966278", name: "Antifriz 2LT", unitPrice: 220.0 },
    { partNo: "9464027680", name: "Debriyaj Seti", unitPrice: 4800.0 },
    { partNo: "46761279", name: "Direksiyon Yağı", unitPrice: 180.0 },
  ]
  for (const p of sampleParts) {
    await prisma.part.upsert({
      where: { brandId_partNo: { brandId: fiat.id, partNo: p.partNo } },
      update: { unitPrice: p.unitPrice },
      create: { brandId: fiat.id, ...p },
    })
  }

  // Sample labor operations for Fiat
  const sampleLabor = [
    { operationCode: "LBR-001", name: "Motor Yağı + Filtre Değişimi", durationHours: 0.5, hourlyRate: 800 },
    { operationCode: "LBR-002", name: "Hava Filtresi Değişimi", durationHours: 0.3, hourlyRate: 800 },
    { operationCode: "LBR-003", name: "Polen Filtresi Değişimi", durationHours: 0.25, hourlyRate: 800 },
    { operationCode: "LBR-004", name: "Yakıt Filtresi Değişimi", durationHours: 0.5, hourlyRate: 800 },
    { operationCode: "LBR-005", name: "Ön Fren Balata Değişimi", durationHours: 1.0, hourlyRate: 800 },
    { operationCode: "LBR-006", name: "Arka Fren Balata Değişimi", durationHours: 0.8, hourlyRate: 800 },
    { operationCode: "LBR-007", name: "Fren Diski Değişimi (Ön)", durationHours: 1.5, hourlyRate: 800 },
    { operationCode: "LBR-008", name: "Buji Değişimi", durationHours: 0.5, hourlyRate: 800 },
    { operationCode: "LBR-009", name: "Triger Seti Değişimi", durationHours: 3.0, hourlyRate: 800 },
    { operationCode: "LBR-010", name: "V-Kayışı Değişimi", durationHours: 0.5, hourlyRate: 800 },
    { operationCode: "LBR-011", name: "Genel Kontrol", durationHours: 0.5, hourlyRate: 800 },
    { operationCode: "LBR-012", name: "Debriyaj Seti Değişimi", durationHours: 4.0, hourlyRate: 800 },
  ]
  for (const l of sampleLabor) {
    await prisma.laborOperation.upsert({
      where: { brandId_operationCode: { brandId: fiat.id, operationCode: l.operationCode } },
      update: { durationHours: l.durationHours, hourlyRate: l.hourlyRate },
      create: { brandId: fiat.id, ...l },
    })
  }

  // 10.000 km maintenance template for Fiat (general)
  const template10k = await prisma.maintenanceTemplate.create({
    data: {
      brandId: fiat.id,
      periodKm: 10000,
      name: "10.000 km Periyodik Bakım",
      items: {
        create: [
          { itemType: "PART", referenceCode: "SELENIA01", quantity: 1, sortOrder: 1 },
          { itemType: "PART", referenceCode: "55282942", quantity: 1, sortOrder: 2 },
          { itemType: "PART", referenceCode: "55223416", quantity: 1, sortOrder: 3 },
          { itemType: "PART", referenceCode: "77366607", quantity: 1, sortOrder: 4 },
          { itemType: "LABOR", referenceCode: "LBR-001", quantity: 1, sortOrder: 5 },
          { itemType: "LABOR", referenceCode: "LBR-002", quantity: 1, sortOrder: 6 },
          { itemType: "LABOR", referenceCode: "LBR-003", quantity: 1, sortOrder: 7 },
          { itemType: "LABOR", referenceCode: "LBR-011", quantity: 1, sortOrder: 8 },
        ],
      },
    },
  })

  // 20.000 km template
  const template20k = await prisma.maintenanceTemplate.create({
    data: {
      brandId: fiat.id,
      periodKm: 20000,
      name: "20.000 km Periyodik Bakım",
      items: {
        create: [
          { itemType: "PART", referenceCode: "SELENIA01", quantity: 1, sortOrder: 1 },
          { itemType: "PART", referenceCode: "55282942", quantity: 1, sortOrder: 2 },
          { itemType: "PART", referenceCode: "55223416", quantity: 1, sortOrder: 3 },
          { itemType: "PART", referenceCode: "77366607", quantity: 1, sortOrder: 4 },
          { itemType: "PART", referenceCode: "55234012", quantity: 1, sortOrder: 5 },
          { itemType: "PART", referenceCode: "46796846", quantity: 1, sortOrder: 6 },
          { itemType: "LABOR", referenceCode: "LBR-001", quantity: 1, sortOrder: 7 },
          { itemType: "LABOR", referenceCode: "LBR-002", quantity: 1, sortOrder: 8 },
          { itemType: "LABOR", referenceCode: "LBR-003", quantity: 1, sortOrder: 9 },
          { itemType: "LABOR", referenceCode: "LBR-004", quantity: 1, sortOrder: 10 },
          { itemType: "LABOR", referenceCode: "LBR-008", quantity: 1, sortOrder: 11 },
          { itemType: "LABOR", referenceCode: "LBR-011", quantity: 1, sortOrder: 12 },
        ],
      },
    },
  })

  // 40.000 km template
  const template40k = await prisma.maintenanceTemplate.create({
    data: {
      brandId: fiat.id,
      periodKm: 40000,
      name: "40.000 km Periyodik Bakım",
      items: {
        create: [
          { itemType: "PART", referenceCode: "SELENIA01", quantity: 1, sortOrder: 1 },
          { itemType: "PART", referenceCode: "55282942", quantity: 1, sortOrder: 2 },
          { itemType: "PART", referenceCode: "55223416", quantity: 1, sortOrder: 3 },
          { itemType: "PART", referenceCode: "77366607", quantity: 1, sortOrder: 4 },
          { itemType: "PART", referenceCode: "55234012", quantity: 1, sortOrder: 5 },
          { itemType: "PART", referenceCode: "46796846", quantity: 1, sortOrder: 6 },
          { itemType: "PART", referenceCode: "71777821", quantity: 1, sortOrder: 7 },
          { itemType: "LABOR", referenceCode: "LBR-001", quantity: 1, sortOrder: 8 },
          { itemType: "LABOR", referenceCode: "LBR-002", quantity: 1, sortOrder: 9 },
          { itemType: "LABOR", referenceCode: "LBR-003", quantity: 1, sortOrder: 10 },
          { itemType: "LABOR", referenceCode: "LBR-004", quantity: 1, sortOrder: 11 },
          { itemType: "LABOR", referenceCode: "LBR-008", quantity: 1, sortOrder: 12 },
          { itemType: "LABOR", referenceCode: "LBR-010", quantity: 1, sortOrder: 13 },
          { itemType: "LABOR", referenceCode: "LBR-011", quantity: 1, sortOrder: 14 },
        ],
      },
    },
  })

  // Default app settings
  const settings = [
    { key: "companyName", value: "Yetkili Servis" },
    { key: "companyAddress", value: "Servis Adresi" },
    { key: "companyPhone", value: "+90 (xxx) xxx xx xx" },
    { key: "defaultTaxRate", value: "20" },
    { key: "defaultCurrency", value: "TRY" },
    { key: "quoteValidityDays", value: "15" },
  ]
  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }

  console.log("Seed completed successfully!")
  console.log(`Admin: admin@servis.com / admin123`)
  console.log(`Advisor: danisman@servis.com / advisor123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
