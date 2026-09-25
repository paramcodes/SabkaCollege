"use client";

import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function StudentDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-5 py-20 sm:px-8">
      <Card className="w-full">
        <CardHeader>
          <p className="text-sm font-medium text-primary">Student dashboard</p>
          <CardTitle className="mt-2 font-serif text-3xl">
            We could not load your learning dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-xl leading-7 text-muted-foreground">
            Something went wrong while loading your courses. Your learning data
            is unchanged. Try again, or return to the course catalogue.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
