"use client";

import { useActionState, useState, useTransition } from "react";

import {
  deleteModule,
  reorderModules,
  saveModule,
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
import { Textarea } from "@/src/components/ui/textarea";

export type ModuleFormValue = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  position: number;
};

type FormState = { error: string | null };

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

function ModuleRow({
  module,
  index,
  total,
  onMove,
}: {
  module: ModuleFormValue;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const result = await saveModule({
        id: module.id,
        courseId: module.courseId,
        title: text(formData, "title"),
        description: text(formData, "description") || null,
        position: Number(text(formData, "position")),
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
        <h3 className="font-medium">Module {index + 1}</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label={`Move module ${index + 1} up`}
          >
            Move up
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label={`Move module ${index + 1} down`}
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
                <DialogTitle>Delete this module?</DialogTitle>
                <DialogDescription>
                  This also deletes its lessons. This action cannot be undone.
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
                      const result = await deleteModule({
                        courseId: module.courseId,
                        moduleId: module.id,
                      });
                      if (result.ok) setDeleteOpen(false);
                    })
                  }
                >
                  {deletePending ? "Deleting…" : "Delete module"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="position" value={module.position} />
        <div className="grid gap-2">
          <Label htmlFor={`module-title-${module.id}`}>Title</Label>
          <Input
            id={`module-title-${module.id}`}
            name="title"
            required
            defaultValue={module.title}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`module-description-${module.id}`}>Description</Label>
          <Textarea
            id={`module-description-${module.id}`}
            name="description"
            defaultValue={module.description ?? ""}
            rows={3}
          />
        </div>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save module"}
        </Button>
      </form>
    </article>
  );
}

export function ModuleEditor({
  courseId,
  modules,
}: {
  courseId: string;
  modules: ModuleFormValue[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_previous, formData) => {
      const result = await saveModule({
        courseId,
        title: text(formData, "title"),
        description: text(formData, "description") || null,
        position: modules.length,
      });
      return { error: result.ok ? null : result.error.message };
    },
    { error: null },
  );
  const [reorderPending, startReorder] = useTransition();
  const [reorderError, setReorderError] = useState<string | null>(null);

  const reorder = (from: number, to: number) => {
    const ids = modules.map((module) => module.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    startReorder(async () => {
      setReorderError(null);
      const result = await reorderModules({ courseId, moduleIds: ids });
      if (!result.ok) setReorderError(result.error.message);
    });
  };

  return (
    <section aria-labelledby="modules-heading" className="grid gap-5">
      <div>
        <h2 id="modules-heading" className="font-serif text-2xl">Modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Module order is explicit and normalized before it is saved.
        </p>
      </div>
      {reorderError ? <p role="alert" className="text-sm text-destructive">{reorderError}</p> : null}
      <div className="grid gap-4" aria-live="polite" aria-busy={reorderPending}>
        {modules.map((module, index) => (
          <div key={module.id} className="relative">
            <ModuleRow
              module={module}
              index={index}
              total={modules.length}
              onMove={(direction) => reorder(index, index + direction)}
            />
          </div>
        ))}
      </div>
      <form action={formAction} className="grid gap-3 rounded-lg border border-dashed p-4">
        <h3 className="font-medium">Add module</h3>
        <div className="grid gap-2">
          <Label htmlFor="new-module-title">Title</Label>
          <Input id="new-module-title" name="title" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-module-description">Description</Label>
          <Textarea id="new-module-description" name="description" rows={3} />
        </div>
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add module"}
        </Button>
      </form>
    </section>
  );
}
