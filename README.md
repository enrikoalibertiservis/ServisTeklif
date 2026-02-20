# Servis Teklif - Bakım Reçetesi Yönetim Sistemi

Fiat / Alfa Romeo / Jeep yetkili servislerinde bakım teklifi ve reçete oluşturma web uygulaması.

## Özellikler

- **Araç Kataloğu**: Marka > Model > Alt Model > Teknik Özellikler hiyerarşisi
- **Bakım Reçeteleri**: Periyodik bakım şablonları (10.000 km, 20.000 km, 40.000 km vb.)
- **Otomatik Reçete**: Araç + periyot seçimine göre parça ve işçilik otomatik oluşturma
- **Parça Arama**: Parça no veya adı ile autocomplete destekli arama
- **İskonto**: Yüzde veya tutar bazlı iskonto uygulama
- **PDF & Excel Export**: Kurumsal şablonlu teklif çıktısı
- **Excel Import**: Parça, işçilik ve bakım şablonlarını Excel'den içe aktarma
- **Rol Bazlı Yetkilendirme**: Admin ve Danışman rolleri

## Teknolojiler

- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite + Prisma ORM
- **UI**: Tailwind CSS + Radix UI
- **Auth**: NextAuth.js
- **Export**: jsPDF + xlsx

## Kurulum

```bash
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

## Demo Hesaplar

| Rol | E-posta | Şifre |
|-----|---------|-------|
| Admin | admin@servis.com | admin123 |
| Danışman | danisman@servis.com | advisor123 |

## Proje Yapısı

```
app/
├── api/              # REST API endpoints
├── actions/          # Server Actions
├── dashboard/        # Ana uygulama sayfaları
│   ├── admin/        # Admin paneli
│   │   ├── vehicles/ # Araç kataloğu yönetimi
│   │   ├── parts/    # Parça listesi
│   │   ├── labor/    # İşçilik listesi
│   │   ├── templates/# Bakım şablonları
│   │   ├── import/   # Excel import
│   │   ├── users/    # Kullanıcı yönetimi
│   │   └── settings/ # Uygulama ayarları
│   └── quotes/       # Teklif yönetimi
│       ├── new/      # Yeni teklif oluşturma
│       └── [id]/     # Teklif detay/düzenleme
├── login/            # Giriş sayfası
components/           # React bileşenleri
lib/                  # Utility fonksiyonlar
prisma/               # Veritabanı şeması ve seed
```
