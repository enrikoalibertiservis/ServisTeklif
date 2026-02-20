import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText } from "lucide-react"
import Link from "next/link"
import { QuotesList } from "@/components/quotes-list"

export default async function QuotesPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === "ADMIN"

  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { createdById: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-500" />
            {isAdmin ? "Tüm Teklifler" : "Tekliflerim"}
          </h1>
          <p className="text-muted-foreground">{quotes.length} teklif</p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Yeni Teklif
          </Button>
        </Link>
      </div>

      <QuotesList quotes={quotes} isAdmin={isAdmin} />
    </div>
  )
}
