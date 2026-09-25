"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteLesson,
  reorderLessons,
  saveLesson,
} from "@/src/actions/admin-courses";
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
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

export type LessonFormValue = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  videoProvider: "youtube" | "vimeo" | "mux" | "cloudflare_stream" | "external";
  videoReference: string | null;
  durationSeconds: number;
  isPreview: boolean;
};

type FormState = { error: string | null };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

function LessonRow({
  courseId,
  moduleId,
  lesson,
  index,
  total,
  onMove,
}: {
  courseId: string;
  moduleId: string;
  lesson: LessonFormValue;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const result = await saveLesson({
        id: lesson.id,
        moduleId,
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        description: text(formData, "description") || null,
        position: Number(text(formData, "position")),
        videoProvider: text(
          formData,
          "videoProvider",
        ) as LessonFormValue["videoProvider"],
        videoReference: text(formData, "videoReference") || null,
        durationSeconds: Number(text(formData, "durationSeconds")),
        isPreview: formData.get("isPreview") === "on",
      });
      return { error: result.ok ? null : result.error.message };
    },
    { error: null },
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDelete] = useTransition();

  return (
    <article className="grid gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-medium">Lesson {index + 1}</h4>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move lesson ${index + 1} up`}
          >
            Move up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={`Move lesson ${index + 1} down`}
          >
            Move down
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="destructive">
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this lesson?</DialogTitle>
                <DialogDescription>
                  This action removes the lesson and cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deletePending}
                  onClick={() =>
                    startDelete(async () => {
                      const result = await deleteLesson({
                        courseId,
                        moduleId,
                        lessonId: lesson.id,
                      });
                      if (result.ok) setDeleteOpen(false);
                    })
                  }
                >
                  {deletePending ? "Deleting…" : "Delete lesson"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="position" value={lesson.position} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`lesson-title-${lesson.id}`}>Title</Label>
            <Input
              id={`lesson-title-${lesson.id}`}
              name="title"
              required
              defaultValue={lesson.title}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`lesson-slug-${lesson.id}`}>Slug</Label>
            <Input
              id={`lesson-slug-${lesson.id}`}
              name="slug"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={lesson.slug}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`lesson-description-${lesson.id}`}>Description</Label>
          <Textarea
            id={`lesson-description-${lesson.id}`}
            name="description"
            rows={3}
            defaultValue={lesson.description ?? ""}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={`lesson-provider-${lesson.id}`}>Video provider</Label>
            <Select name="videoProvider" defaultValue={lesson.videoProvider}>
              <SelectTrigger id={`lesson-provider-${lesson.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="mux">Mux</SelectItem>
                <SelectItem value="cloudflare_stream">Cloudflare Stream</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`lesson-reference-${lesson.id}`}>Provider reference</Label>
            <Input
              id={`lesson-reference-${lesson.id}`}
              name="videoReference"
              defaultValue={lesson.videoReference ?? ""}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`lesson-duration-${lesson.id}`}>Duration (seconds)</Label>
            <Input
              id={`lesson-duration-${lesson.id}`}
              name="durationSeconds"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={lesson.durationSeconds}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isPreview"
            defaultChecked={lesson.isPreview}
          />
          Show as a public preview
        </label>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save lesson"}
        </Button>
      </form>
    </article>
  );
}

export function LessonEditor({
  courseId,
  moduleId,
  lessons,
}: {
  courseId: string;
  moduleId: string;
  lessons: LessonFormValue[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const result = await saveLesson({
        moduleId,
        slug: text(formData, "slug"),
        title: text(formData, "title"),
        description: text(formData, "description") || null,
        position: lessons.length,
        videoProvider: text(
          formData,
          "videoProvider",
        ) as LessonFormValue["videoProvider"],
        videoReference: text(formData, "videoReference") || null,
        durationSeconds: Number(text(formData, "durationSeconds")),
        isPreview: formData.get("isPreview") === "on",
      });
      return { error: result.ok ? null : result.error.message };
    },
    { error: null },
  );
  const [reorderPending, startReorder] = useTransition();
  const [reorderError, setReorderError] = useState<string | null>(null);

  const reorder = (from: number, to: number) => {
    const ids = lessons.map((lesson) => lesson.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    startReorder(async () => {
      setReorderError(null);
      const result = await reorderLessons({ courseId, moduleId, lessonIds: ids });
      if (!result.ok) setReorderError(result.error.message);
    });
  };

  return (
    <section aria-labelledby={`lessons-heading-${moduleId}`} className="grid gap-4">
      <div>
        <h3 id={`lessons-heading-${moduleId}`} className="font-medium">Lessons</h3>
        {reorderError ? <p role="alert" className="mt-2 text-sm text-destructive">{reorderError}</p> : null}
      </div>
      <div className="grid gap-3" aria-live="polite" aria-busy={reorderPending}>
        {lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.id}
            courseId={courseId}
            moduleId={moduleId}
            lesson={lesson}
            index={index}
            total={lessons.length}
            onMove={(direction) => reorder(index, index + direction)}
          />
        ))}
      </div>
      <form action={formAction} className="grid gap-3 rounded-lg border border-dashed p-4">
        <h4 className="font-medium">Add lesson</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`new-lesson-title-${moduleId}`}>Title</Label>
            <Input id={`new-lesson-title-${moduleId}`} name="title" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`new-lesson-slug-${moduleId}`}>Slug</Label>
            <Input id={`new-lesson-slug-${moduleId}`} name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`new-lesson-description-${moduleId}`}>Description</Label>
          <Textarea id={`new-lesson-description-${moduleId}`} name="description" rows={3} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={`new-lesson-provider-${moduleId}`}>Video provider</Label>
            <Select name="videoProvider" defaultValue="youtube">
              <SelectTrigger id={`new-lesson-provider-${moduleId}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="mux">Mux</SelectItem>
                <SelectItem value="cloudflare_stream">Cloudflare Stream</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`new-lesson-reference-${moduleId}`}>Provider reference</Label>
            <Input id={`new-lesson-reference-${moduleId}`} name="videoReference" autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`new-lesson-duration-${moduleId}`}>Duration (seconds)</Label>
            <Input id={`new-lesson-duration-${moduleId}`} name="durationSeconds" type="number" min={0} step={1} defaultValue={0} required />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPreview" />
          Show as a public preview
        </label>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add lesson"}
        </Button>
      </form>
    </section>
  );
}
