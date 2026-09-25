"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteCourse, setCourseStatus } from "@/src/actions/admin-courses";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";

type CourseStatus = "draft" | "published" | "archived";

export function CourseStatusControl({ courseId, status }: { courseId: string; status: CourseStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-2">
      <label htmlFor={`course-status-${courseId}`} className="text-sm font-medium">Course status</label>
      <Select
        value={status}
        disabled={pending}
        onValueChange={(value) => {
          const nextStatus = value as CourseStatus;
          setError(null);
          startTransition(async () => {
            const result = await setCourseStatus({ courseId, status: nextStatus });
            if (!result.ok) setError(result.error.message);
            else router.refresh();
          });
        }}
      >
        <SelectTrigger id={`course-status-${courseId}`} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

export function DeleteCourseButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="destructive">Delete course</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this course?</DialogTitle>
            <DialogDescription>
              This permanently removes the course, its modules, lessons, and related progress.
            </DialogDescription>
          </DialogHeader>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(async () => {
                setError(null);
                const result = await deleteCourse({ courseId });
                if (!result.ok) setError(result.error.message);
                else router.push("/admin/courses");
              })}
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
