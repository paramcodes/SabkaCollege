"use client";

import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function LearningError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center px-5 py-20 sm:px-8">
      <Card className="w-full" role="alert">
        <CardHeader>
          <CardTitle className="font-serif text-3xl">
            We could not load this course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-7 text-muted-foreground">
            Your learning data is unchanged. Try again or return to your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>Try again</Button>
            <Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
