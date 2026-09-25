import { requireAdmin } from "@/src/lib/auth/guards";
import { getAdminStudents } from "@/src/db/queries/admin";
import { AdminPagination } from "@/src/components/admin/admin-pagination";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ADMIN_PAGE_SIZE, normalizeAdminPage } from "@/src/lib/admin/pagination";

export const instant = false;

export default async function AdminStudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const page = normalizeAdminPage(params.page);
  const rows = await getAdminStudents(page);
  const students = rows.slice(0, ADMIN_PAGE_SIZE);

  return (
    <div className="grid gap-8">
      <header>
        <p className="text-sm font-medium text-primary">People and access</p>
        <h1 className="mt-2 font-serif text-4xl">Students</h1>
        <p className="mt-2 text-muted-foreground">A bounded view of the student accounts mirrored from Clerk.</p>
      </header>
      <Card>
        <CardHeader><CardTitle>Student accounts</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          {students.length === 0 ? <p className="text-sm text-muted-foreground">No students found.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>{students.map((student) => <TableRow key={student.id}><TableCell className="font-medium">{student.name ?? "Unnamed student"}</TableCell><TableCell>{student.email}</TableCell><TableCell><Badge variant="outline">{student.role}</Badge></TableCell><TableCell>{student.createdAt.toLocaleDateString()}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
          <AdminPagination page={page} hasNext={rows.length > ADMIN_PAGE_SIZE} hasPrevious={page > 1} basePath="/admin/students" />
        </CardContent>
      </Card>
    </div>
  );
}
