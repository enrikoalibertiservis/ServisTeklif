import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { FileText } from "lucide-react"
import { QuotesList } from "@/components/quotes-list"

export default async function QuotesPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-500" />
          Tüm Teklifler
        </h1>
        <p className="text-muted-foreground">Teklifleri görüntüleyin, filtreleyin ve yönetin.</p>
      </div>
      <QuotesList isAdmin={isAdmin} />
    </div>
  )
}
