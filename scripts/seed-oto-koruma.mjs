import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const products = [
  {
    name: "SERAMİK KAPLAMA (BOYA KORUMA)",
    description: "Araç boyasını UV, çizik ve kimyasal etkilere karşı korur. 3-5 yıl ömürlü nano seramik kaplama.",
    price: 18000,
    category: "Kaplama",
    sortOrder: 1,
  },
  {
    name: "CAM FİLMİ UYGULAMASI",
    description: "UV ve ısı yalıtımı sağlayan profesyonel cam filmi montajı. Araç içini serinletir, güneşten korur.",
    price: 7500,
    category: "Film",
    sortOrder: 2,
  },
  {
    name: "PPF BOYA KORUMA FİLMİ",
    description: "Paint Protection Film — taş çizmelerine ve küçük darbelere karşı şeffaf poliüretan film uygulaması.",
    price: 22000,
    category: "Film",
    sortOrder: 3,
  },
  {
    name: "BOYA KORUMA CİLA UYGULAMASI",
    description: "Araç boyasını uzun süre parlak ve korumalı tutan profesyonel cila. Yıkama dayanımı yüksek.",
    price: 4500,
    category: "Cila & Bakım",
    sortOrder: 4,
  },
  {
    name: "PASTA – CİLA (ÇOK AŞAMALI BOYA DÜZELTME)",
    description: "Çizik, girdap izi ve mat görünümü gideren çok aşamalı makine pastası ve cila uygulaması.",
    price: 9500,
    category: "Cila & Bakım",
    sortOrder: 5,
  },
  {
    name: "KİL TEMİZLİĞİ (CLAY BAR UYGULAMASI)",
    description: "Boya yüzeyine yapışan endüstriyel kirleticileri, tuz ve demir tozlarını gidermek için kil çubuğu uygulaması.",
    price: 2500,
    category: "Temizlik",
    sortOrder: 6,
  },
  {
    name: "MOTOR TEMİZLİĞİ (BUHARLИ / KURU SİSTEM)",
    description: "Motor bölgesinin buharlı ya da kuru yöntemle temizlenerek yağ ve kir birikintilerinden arındırılması.",
    price: 1800,
    category: "Temizlik",
    sortOrder: 7,
  },
  {
    name: "DETAYLI İÇ TEMİZLİK (KOLTUK, TAVAN, TABAN)",
    description: "Araç iç mekanının tavan, koltuk, kapı paneli ve taban dahil profesyonel derin temizliği.",
    price: 3500,
    category: "Temizlik",
    sortOrder: 8,
  },
  {
    name: "DERİ KOLTUK BAKIM VE KORUMA",
    description: "Deri yüzeylerin temizlenmesi, beslenip nemlendirilerek renk ve esnekliğinin korunması.",
    price: 2800,
    category: "Deri Bakım",
    sortOrder: 9,
  },
  {
    name: "KUMAŞ KOLTUK YIKAMA (EKSTRAKSİYONLU TEMİZLİK)",
    description: "Yüksek basınçlı su enjeksiyonu ve ekstraksiyonla kumaş koltukların derinlemesine yıkanması.",
    price: 3200,
    category: "Temizlik",
    sortOrder: 10,
  },
  {
    name: "OZON İLE DEZENFEKSİYON",
    description: "Araç iç mekanındaki bakteri, virüs, küf ve kötü kokuları ozon gazıyla %99 etkiyle giderir.",
    price: 1200,
    category: "Hijyen",
    sortOrder: 11,
  },
  {
    name: "CAM SU İTİCİ KAPLAMA (HYDROPHOBİC COATİNG)",
    description: "Yağmur suyunun camdan hızla akmasını sağlayan hidrofobik nano kaplama. Görüş güvenliğini artırır.",
    price: 1500,
    category: "Kaplama",
    sortOrder: 12,
  },
  {
    name: "JANT SERAMİK KAPLAMA",
    description: "Jantları fren tozu, tuz ve çiziklere karşı koruyan seramik kaplama. Temizliği kolaylaştırır.",
    price: 5500,
    category: "Kaplama",
    sortOrder: 13,
  },
  {
    name: "PLASTİK TRİM YENİLEME (İÇ/DIŞ PLASTİK KORUMA)",
    description: "Solmuş ve grileşmiş iç/dış plastik yüzeylerin yenilenmesi ve koruma kaplamasıyla ömrünün uzatılması.",
    price: 2200,
    category: "Cila & Bakım",
    sortOrder: 14,
  },
  {
    name: "FAR TEMİZLEME VE PARLATMA",
    description: "Sararmış, çizilmiş veya matlaşmış farların pasta ve cila ile temizlenip parlatılması.",
    price: 1400,
    category: "Cila & Bakım",
    sortOrder: 15,
  },
  {
    name: "BOYASIZ GÖÇÜK DÜZELTME (PDR)",
    description: "Paintless Dent Repair — boyaya dokunmadan dolu çukuru, küçük ezik ve göçüklerin düzeltilmesi.",
    price: 2500,
    category: "Karoser",
    sortOrder: 16,
  },
  {
    name: "KAPUT KORUMA FİLMİ",
    description: "Kaput yüzeyini taş ve böcek çarpmalarına, kum çizmelerine karşı koruyan şeffaf PPF filmi.",
    price: 8500,
    category: "Film",
    sortOrder: 17,
  },
  {
    name: "TAVAN (PANORAMİK CAM) KORUMA FİLMİ",
    description: "Panoramik veya standart tavan camını UV ışığı, ısı ve çiziklere karşı koruyan özel film.",
    price: 6500,
    category: "Film",
    sortOrder: 18,
  },
  {
    name: "ANTİBAKTERİYEL İÇ MEKAN UYGULAMASI",
    description: "Araç iç yüzeylerine uzun süreli antibakteriyel koruma sağlayan özel kaplama uygulaması.",
    price: 1800,
    category: "Hijyen",
    sortOrder: 19,
  },
  {
    name: "NANO BOYA KORUMA UYGULAMALARI",
    description: "Nano teknoloji bazlı boya koruma. Kir tutmayan, kolay temizlenen ve uzun ömürlü yüzey oluşturur.",
    price: 12000,
    category: "Kaplama",
    sortOrder: 20,
  },
]

async function main() {
  console.log("Oto Koruma ürünleri ekleniyor...")
  let added = 0
  let skipped = 0

  for (const p of products) {
    const existing = await prisma.otoKorumaProduct.findFirst({
      where: { name: p.name },
    })
    if (existing) {
      await prisma.otoKorumaProduct.update({
        where: { id: existing.id },
        data: p,
      })
      console.log(`  ✔ Güncellendi: ${p.name}`)
      skipped++
    } else {
      await prisma.otoKorumaProduct.create({ data: p })
      console.log(`  + Eklendi: ${p.name}`)
      added++
    }
  }

  console.log(`\nTamamlandı: ${added} eklendi, ${skipped} güncellendi.`)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
