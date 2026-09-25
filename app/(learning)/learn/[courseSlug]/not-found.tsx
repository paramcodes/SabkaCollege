import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function LearningNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">Lesson not found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            This course or lesson is not available.
          </p>
          <Button asChild className="mt-6"><Link href="/courses">Browse courses</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
