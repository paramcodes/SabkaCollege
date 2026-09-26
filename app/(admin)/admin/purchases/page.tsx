import { requireAdmin } from "@/src/lib/auth/guards";
import { getAdminPurchases } from "@/src/db/queries/admin";
import { AdminPagination } from "@/src/components/admin/admin-pagination";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ADMIN_PAGE_SIZE, normalizeAdminPage } from "@/src/lib/admin/pagination";

export const instant = false;

export default async function AdminPurchasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = normalizeAdminPage(params.page);
  const rows = await getAdminPurchases(page);
  const purchases = rows.slice(0, ADMIN_PAGE_SIZE);

  return (
    <div className="grid gap-8">
      <header>
        <p className="text-sm font-medium text-primary">Billing records</p>
        <h1 className="mt-2 font-serif text-4xl">Purchases</h1>
        <p className="mt-2 text-muted-foreground">Only course, student, amount, status, and timestamp fields are shown.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Purchase history</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {purchases.length === 0 ? <p className="text-sm text-muted-foreground">No purchases found.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Purchased</TableHead></TableRow></TableHeader>
              <TableBody>{purchases.map((purchase) => <TableRow key={purchase.id}><TableCell><span className="font-medium">{purchase.userName ?? "Unnamed student"}</span><span className="block text-xs text-muted-foreground">{purchase.userEmail}</span></TableCell><TableCell>{purchase.courseTitle}</TableCell><TableCell>{purchase.amount.toLocaleString()} {purchase.currency}</TableCell><TableCell><Badge variant="outline">{purchase.status}</Badge></TableCell><TableCell>{purchase.purchasedAt.toLocaleDateString()}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
          <AdminPagination page={page} hasNext={rows.length > ADMIN_PAGE_SIZE} hasPrevious={page > 1} basePath="/admin/purchases" />
        </CardContent>
      </Card>
    </div>
  );
}
