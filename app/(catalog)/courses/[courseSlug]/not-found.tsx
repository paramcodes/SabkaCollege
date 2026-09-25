import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Button } from "@/src/components/ui/button";

export default function CourseNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:px-10">
      <BookOpen className="mx-auto size-9 text-primary" aria-hidden="true" />
      <h1 className="mt-6 font-serif text-5xl tracking-[-0.04em]">
        Course not found
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
        This course is not available. It may be unpublished, archived, or the
        address may be mistyped.
      </p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/courses">Browse public courses</Link>
      </Button>
    </div>
  );
}
