"use client"

import * as XLSX from "xlsx"

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " TL"
}

function fmtNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n)
}

let _pdfMake: any = null

async function loadPdfMake(): Promise<any> {
  if (_pdfMake) return _pdfMake

  const [pdfMakeModule, fontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ])

  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
  const fonts   = (fontsModule as any).default ?? fontsModule

  pdfMake.vfs = fonts?.pdfMake?.vfs ?? fonts?.vfs ?? {}

  _pdfMake = pdfMake
  return _pdfMake
}

export async function exportQuotePdf(quote: any, campaign?: { suggestedProducts: { name: string; price?: number }[]; message: string } | null) {
  const pdfMake = await loadPdfMake()

  const partItems = quote.items?.filter((i: any) => i.itemType === "PART") || []
  const laborItems = quote.items?.filter((i: any) => i.itemType === "LABOR") || []

  const periodStr = [
    quote.periodKm ? `${Number(quote.periodKm).toLocaleString("tr-TR")} km` : "",
    quote.periodMonth ? `${quote.periodMonth} ay` : "",
  ].filter(Boolean).join(" / ")

  const statusText = quote.status === "FINALIZED" ? "Kesinleştirilmiş" : "Taslak"

  // Header info table
  const headerTable = {
    table: {
      widths: ["auto", "*", 20, "auto", "*"],
      body: [
        [
          { text: "Teklif No:", style: "labelText" },
          { text: quote.quoteNo, style: "valueText", bold: true },
          "",
          { text: "Araç:", style: "labelText" },
          { text: `${quote.brandName} ${quote.modelName} ${quote.subModelName || ""}`.trim(), style: "valueText", bold: true },
        ],
        [
          { text: "Tarih:", style: "labelText" },
          { text: new Date(quote.createdAt).toLocaleDateString("tr-TR"), style: "valueText" },
          "",
          { text: "Plaka:", style: "labelText" },
          { text: quote.plateNo || "-", style: "valueText", bold: true },
        ],
        [
          { text: "Durum:", style: "labelText" },
          { text: statusText, style: "valueText" },
          "",
          { text: "Müşteri:", style: "labelText" },
          { text: quote.customerName || "-", style: "valueText" },
        ],
        [
          { text: "Bakım:", style: "labelText" },
          { text: periodStr || "-", style: "valueText" },
          "",
          { text: "Telefon:", style: "labelText" },
          { text: quote.customerPhone || "-", style: "valueText" },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 0, 0, 15] as [number, number, number, number],
  }

  // Parts table
  const partsTableBody: any[][] = [
    [
      { text: "#", style: "tableHeader", alignment: "center" },
      { text: "Parça No", style: "tableHeader" },
      { text: "Parça Adı", style: "tableHeader" },
      { text: "Birim Fiyat", style: "tableHeader", alignment: "right" },
      { text: "Adet", style: "tableHeader", alignment: "center" },
      { text: "Toplam", style: "tableHeader", alignment: "right" },
    ],
  ]
  partItems.forEach((item: any, idx: number) => {
    partsTableBody.push([
      { text: idx + 1, alignment: "center", fontSize: 8 },
      { text: item.referenceCode, fontSize: 8, font: "Roboto" },
      { text: item.name, fontSize: 8 },
      { text: fmtCurrency(item.unitPrice), alignment: "right", fontSize: 8 },
      { text: item.quantity, alignment: "center", fontSize: 8 },
      { text: fmtCurrency(item.totalPrice), alignment: "right", fontSize: 8, bold: true },
    ])
  })
  partsTableBody.push([
    { text: "", colSpan: 4, border: [false, false, false, false] }, {}, {}, {},
    { text: "Parça Toplamı", bold: true, fontSize: 8, alignment: "right", fillColor: "#f0f0f0" },
    { text: fmtCurrency(quote.partsSubtotal), bold: true, fontSize: 8, alignment: "right", fillColor: "#f0f0f0" },
  ])

  // Labor table
  const laborTableBody: any[][] = [
    [
      { text: "#", style: "tableHeader", alignment: "center" },
      { text: "Op. Kodu", style: "tableHeader" },
      { text: "Operasyon Adı", style: "tableHeader" },
      { text: "Süre (saat)", style: "tableHeader", alignment: "right" },
      { text: "Saat Ücreti", style: "tableHeader", alignment: "right" },
      { text: "Toplam", style: "tableHeader", alignment: "right" },
    ],
  ]
  laborItems.forEach((item: any, idx: number) => {
    laborTableBody.push([
      { text: idx + 1, alignment: "center", fontSize: 8 },
      { text: item.referenceCode, fontSize: 8, font: "Roboto" },
      { text: item.name, fontSize: 8 },
      { text: item.durationHours ? fmtNumber(item.durationHours) : "-", alignment: "right", fontSize: 8 },
      { text: fmtCurrency(item.hourlyRate || 0), alignment: "right", fontSize: 8 },
      { text: fmtCurrency(item.totalPrice), alignment: "right", fontSize: 8, bold: true },
    ])
  })
  laborTableBody.push([
    { text: "", colSpan: 4, border: [false, false, false, false] }, {}, {}, {},
    { text: "İşçilik Toplamı", bold: true, fontSize: 8, alignment: "right", fillColor: "#f0f0f0" },
    { text: fmtCurrency(quote.laborSubtotal), bold: true, fontSize: 8, alignment: "right", fillColor: "#f0f0f0" },
  ])

  // Summary rows
  const summaryBody: any[][] = [
    [
      { text: "Parça Toplamı", bold: true, fontSize: 9 },
      { text: fmtCurrency(quote.partsSubtotal), alignment: "right", fontSize: 9 },
    ],
    [
      { text: "İşçilik Toplamı", bold: true, fontSize: 9 },
      { text: fmtCurrency(quote.laborSubtotal), alignment: "right", fontSize: 9 },
    ],
    [
      { text: "Ara Toplam", bold: true, fontSize: 10 },
      { text: fmtCurrency(quote.subtotal), alignment: "right", fontSize: 10, bold: true },
    ],
  ]

  if (quote.discountAmount > 0) {
    const discLabel = quote.discountType === "PERCENT"
      ? `İskonto (%${quote.discountValue})`
      : "İskonto"
    summaryBody.push([
      { text: discLabel, bold: true, fontSize: 9, color: "#dc2626" },
      { text: `-${fmtCurrency(quote.discountAmount)}`, alignment: "right", fontSize: 9, color: "#dc2626" },
    ])
  }

  summaryBody.push([
    { text: `KDV (%${quote.taxRate})`, bold: true, fontSize: 9 },
    { text: fmtCurrency(quote.taxAmount), alignment: "right", fontSize: 9 },
  ])

  summaryBody.push([
    { text: "GENEL TOPLAM", bold: true, fontSize: 13, color: "#ffffff", fillColor: "#2152a8", margin: [4, 6, 4, 6] },
    { text: fmtCurrency(quote.grandTotal), bold: true, fontSize: 13, alignment: "right", color: "#ffffff", fillColor: "#2152a8", margin: [4, 6, 4, 6] },
  ])

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],

    content: [
      // Title bar
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 515, h: 40, r: 4, color: "#2152a8" },
        ],
      },
      {
        text: "BAKIM TEKLİFİ",
        fontSize: 22,
        bold: true,
        color: "#ffffff",
        margin: [10, -33, 0, 20] as [number, number, number, number],
      },

      // Header info
      headerTable,

      // Separator
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#e0e0e0" }], margin: [0, 0, 0, 15] as [number, number, number, number] },

      // Parts section
      ...(partItems.length > 0
        ? [
            { text: "PARÇALAR", fontSize: 11, bold: true, color: "#2152a8", margin: [0, 0, 0, 5] as [number, number, number, number] },
            {
              table: {
                headerRows: 1,
                widths: [20, 70, "*", 70, 35, 75],
                body: partsTableBody,
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => "#d0d0d0",
                vLineColor: () => "#d0d0d0",
                fillColor: (rowIndex: number) => rowIndex === 0 ? "#2152a8" : null,
              },
              margin: [0, 0, 0, 15] as [number, number, number, number],
            },
          ]
        : []),

      // Labor section
      ...(laborItems.length > 0
        ? [
            { text: "İŞÇİLİK", fontSize: 11, bold: true, color: "#2152a8", margin: [0, 0, 0, 5] as [number, number, number, number] },
            {
              table: {
                headerRows: 1,
                widths: [20, 60, "*", 60, 70, 75],
                body: laborTableBody,
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => "#d0d0d0",
                vLineColor: () => "#d0d0d0",
                fillColor: (rowIndex: number) => rowIndex === 0 ? "#2152a8" : null,
              },
              margin: [0, 0, 0, 15] as [number, number, number, number],
            },
          ]
        : []),

      // Summary section (right aligned)
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 250,
            table: {
              widths: ["*", 100],
              body: summaryBody,
            },
            layout: {
              hLineWidth: (i: number, _node: any) => (i === 0 ? 0 : 0.5),
              vLineWidth: () => 0,
              hLineColor: () => "#e0e0e0",
            },
          },
        ],
      },

      // AI Fırsat Sayfası (opsiyonel)
      ...(campaign ? [
        { text: "", pageBreak: "before" },
        {
          canvas: [
            { type: "rect", x: 0, y: 0, w: 515, h: 40, r: 4, color: "#7c3aed" },
          ],
        },
        {
          text: "ÖZEL KAMPANYA FIRSATI",
          fontSize: 18,
          bold: true,
          color: "#ffffff",
          margin: [10, -33, 0, 20] as [number, number, number, number],
        },
        {
          stack: [
            { text: "KİŞİSEL KAMPANYA METNİ", fontSize: 8, color: "#888888", bold: true, margin: [0, 0, 0, 6] as [number, number, number, number] },
            {
              text: campaign.message,
              fontSize: 11,
              color: "#1f2937",
              lineHeight: 1.6,
              italics: true,
            },
          ],
          margin: [0, 12, 0, 20] as [number, number, number, number],
        },
        ...(campaign.suggestedProducts.length > 0 ? [
          { text: "ÖNERİLEN OTO KORUMA ÜRÜNLERİ", fontSize: 10, bold: true, color: "#0f766e", margin: [0, 0, 0, 8] as [number, number, number, number] },
          {
            table: {
              widths: ["*", 100],
              body: [
                [
                  { text: "Ürün Adı", style: "tableHeader" },
                  { text: "Fiyat", style: "tableHeader", alignment: "right" },
                ],
                ...campaign.suggestedProducts.map(p => [
                  { text: p.name, fontSize: 9 },
                  { text: p.price ? fmtCurrency(p.price) : "—", fontSize: 9, alignment: "right" },
                ]),
              ],
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0,
              hLineColor: () => "#d0d0d0",
              fillColor: (rowIndex: number) => rowIndex === 0 ? "#0f766e" : null,
            },
          },
        ] : []),
      ] : []),
    ],

    // Footer
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "Bu teklif bilgilendirme amaçlıdır. Fiyatlar değişkenlik gösterebilir.",
          fontSize: 7,
          color: "#999999",
          margin: [40, 10, 0, 0],
        },
        {
          text: `Sayfa ${currentPage} / ${pageCount}`,
          fontSize: 7,
          color: "#999999",
          alignment: "right",
          margin: [0, 10, 40, 0],
        },
      ],
    }),

    styles: {
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: "#ffffff",
        fillColor: "#2152a8",
      },
      labelText: {
        fontSize: 8,
        color: "#888888",
      },
      valueText: {
        fontSize: 9,
      },
    },

    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
    },
  }

  const fileName = `${quote.quoteNo || "teklif"}.pdf`

  return new Promise<void>((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition)
      pdf.getBlob((blob: Blob) => {
        try {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }, 100)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

export function exportQuoteExcel(quote: any) {
  const partItems = quote.items?.filter((i: any) => i.itemType === "PART") || []
  const laborItems = quote.items?.filter((i: any) => i.itemType === "LABOR") || []

  const periodStr = quote.periodKm
    ? `${Number(quote.periodKm).toLocaleString("tr-TR")} km`
    : quote.periodMonth
      ? `${quote.periodMonth} ay`
      : "-"

  const headerRows: any[][] = [
    ["BAKIM TEKLİFİ"],
    [],
    ["Teklif No", quote.quoteNo, "", "Araç", `${quote.brandName} ${quote.modelName} ${quote.subModelName || ""}`.trim()],
    ["Tarih", new Date(quote.createdAt).toLocaleDateString("tr-TR"), "", "Plaka", quote.plateNo || "-"],
    ["Müşteri", quote.customerName || "-", "", "Telefon", quote.customerPhone || "-"],
    ["Bakım Periyodu", periodStr],
    [],
  ]

  const partColHeaders = ["#", "Parça No", "Parça Adı", "Birim Fiyat", "Adet", "Toplam"]
  const partRows = partItems.map((item: any, idx: number) => [
    idx + 1,
    item.referenceCode,
    item.name,
    item.unitPrice,
    item.quantity,
    item.totalPrice,
  ])
  const partFooter = ["", "", "", "", "Parça Toplamı", quote.partsSubtotal]

  const laborColHeaders = ["#", "Op. Kodu", "Operasyon Adı", "Süre (saat)", "Saat Ücreti", "Toplam"]
  const laborRows = laborItems.map((item: any, idx: number) => [
    idx + 1,
    item.referenceCode,
    item.name,
    item.durationHours || 0,
    item.hourlyRate || 0,
    item.totalPrice,
  ])
  const laborFooter = ["", "", "", "", "İşçilik Toplamı", quote.laborSubtotal]

  const summaryRows: any[][] = [
    [],
    ["", "", "", "", "Ara Toplam", quote.subtotal],
  ]
  if (quote.discountAmount > 0) {
    summaryRows.push(["", "", "", "", `İskonto${quote.discountType === "PERCENT" ? ` (%${quote.discountValue})` : ""}`, -quote.discountAmount])
  }
  summaryRows.push(
    ["", "", "", "", `KDV (%${quote.taxRate})`, quote.taxAmount],
    ["", "", "", "", "GENEL TOPLAM", quote.grandTotal],
  )

  const allRows = [
    ...headerRows,
    ["PARÇALAR"],
    partColHeaders,
    ...partRows,
    partFooter,
    [],
    ["İŞÇİLİK"],
    laborColHeaders,
    ...laborRows,
    laborFooter,
    ...summaryRows,
  ]

  const ws = XLSX.utils.aoa_to_sheet(allRows)
  ws["!cols"] = [
    { wch: 5 },
    { wch: 18 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Teklif")
  XLSX.writeFile(wb, `${quote.quoteNo}.xlsx`)
}
